import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { AssetRepository, AuditRepository, ContentRepository } from "@/server/repositories";
import { GoogleCloudStorageProvider } from "@/server/services/storage-provider";
import { Asset } from "@/server/domain/types";
import { STAR_PRODUCTS } from "@/lib/knowledge";

// Tipos MIME y extensiones estrictamente permitidas
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "audio/webm",
  "audio/mp3",
  "audio/wav"
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const repo = new AssetRepository();
  try {
    let list = await repo.listRecent(100, user.workspaceId);
    if (list.length === 0) {
      list = await repo.listRecent(100);
    }

    // Auto-recuperación: Si no hay imágenes en la colección assets de Firestore,
    // escanear la colección contents (los artículos existentes) para extraer cualquier imagen
    if (list.length === 0) {
      try {
        const contentRepo = new ContentRepository();
        const contents = await contentRepo.listRecent(100);
        const extractedAssets: Asset[] = [];
        const seenUrls = new Set<string>();

        for (const c of contents) {
          const body = c.versions?.[0]?.body || (c as any).content || {};
          const html = body.blog?.htmlContent || "";
          
          // Extraer imágenes con regex de <img>
          const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']?([^"'>]*)["']?/gi);
          for (const match of imgMatches) {
            const src = match[1];
            const alt = match[2] || c.title || "Imagen de artículo";
            if (src && !seenUrls.has(src)) {
              seenUrls.add(src);
              const assetId = `asset-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const asset: Asset = {
                id: assetId,
                workspaceId: user.workspaceId,
                filename: `Artículo: ${alt.substring(0, 50)}`,
                mimeType: src.startsWith("data:image/png") ? "image/png" : "image/jpeg",
                sizeBytes: src.length,
                storagePath: src,
                publicUrl: src,
                type: "image",
                aiGenerated: true,
                ownerId: user.uid,
                createdAt: c.createdAt || new Date().toISOString(),
                updatedAt: c.updatedAt || new Date().toISOString(),
                createdBy: user.uid,
                updatedBy: user.uid
              };
              extractedAssets.push(asset);
              repo.save(asset).catch(() => {});
            }
          }

          // Extraer photoPlacements si existen
          const placements = body.blog?.editorialLayout?.photoPlacements;
          if (Array.isArray(placements)) {
            for (const p of placements) {
              if (p.photoUrl && !seenUrls.has(p.photoUrl)) {
                seenUrls.add(p.photoUrl);
                const assetId = `asset-placement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const asset: Asset = {
                  id: assetId,
                  workspaceId: user.workspaceId,
                  filename: `Placement: ${p.description || p.photoType || "Foto editorial"}`,
                  mimeType: "image/jpeg",
                  sizeBytes: 0,
                  storagePath: p.photoUrl,
                  publicUrl: p.photoUrl,
                  type: "image",
                  aiGenerated: true,
                  ownerId: user.uid,
                  createdAt: c.createdAt || new Date().toISOString(),
                  updatedAt: c.updatedAt || new Date().toISOString(),
                  createdBy: user.uid,
                  updatedBy: user.uid
                };
                extractedAssets.push(asset);
                repo.save(asset).catch(() => {});
              }
            }
          }
        }

        if (extractedAssets.length > 0) {
          list = extractedAssets;
        }
      } catch (extractErr) {
        console.warn("[api/assets GET] Error extrayendo imágenes de contenidos:", extractErr);
      }
    }

    // Si aún así no hay ninguna imagen generada todavía, incorporar las fotos de producto oficiales de catálogo
    if (list.length === 0) {
      const defaultCatalogAssets: Asset[] = STAR_PRODUCTS.map((p) => ({
        id: `official-${p.id}`,
        workspaceId: user.workspaceId,
        filename: `Fotografía Oficial: ${p.name} (${p.model})`,
        mimeType: "image/jpeg",
        sizeBytes: 0,
        storagePath: p.imageUrl,
        publicUrl: p.imageUrl,
        type: "image",
        aiGenerated: false,
        aiProvenance: {
          provider: "google-vertex-genai",
          model: "official_product",
          requestId: `official-${p.id}`,
          generatedAt: new Date().toISOString(),
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          latencyMs: 0,
          estimatedCostEur: 0,
          sourceIdsUsed: []
        },
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        updatedBy: user.uid
      }));
      list = defaultCatalogAssets;
    }

    return NextResponse.json({ assets: list });
  } catch (err: any) {
    return NextResponse.json({ assets: [], error: err?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Verificar rol que tenga permisos de creación de contenidos / assets
  if (!authorizePermission(user, "content:create") && !authorizePermission(user, "ai:execute")) {
    return NextResponse.json({ error: "Permisos insuficientes para subir assets" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { filename, mimeType, base64Data, campaignId, productId, contentId } = body;

    if (!filename || !mimeType || !base64Data) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios del asset" }, { status: 400 });
    }

    // 1. Sanitización de nombres de archivo y neutralización de Path Traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.\./g, "");

    // 2. Validación estricta de tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json({ error: `Tipo MIME no permitido: ${mimeType}` }, { status: 400 });
    }

    // 3. Decodificación y control de tamaño
    const buffer = Buffer.from(base64Data.replace(/^data:.*,/, ""), "base64");
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 25MB" }, { status: 400 });
    }

    // 4. Subida a Cloud Storage
    const storage = new GoogleCloudStorageProvider();
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const destinationPath = `workspaces/${user.workspaceId}/assets/${assetId}_${sanitizedFilename}`;

    const uploadRes = await storage.uploadFile({
      buffer,
      destinationPath,
      mimeType
    });

    // 5. Persistencia de metadatos en Firestore
    const asset: Asset = {
      id: assetId,
      workspaceId: user.workspaceId,
      filename: sanitizedFilename,
      mimeType,
      sizeBytes: buffer.length,
      storagePath: uploadRes.storagePath,
      publicUrl: uploadRes.publicUrl,
      type: mimeType.startsWith("image/") ? "image" : mimeType === "application/pdf" ? "pdf" : "audio",
      campaignId,
      productId,
      contentId,
      aiGenerated: false,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.uid,
      updatedBy: user.uid
    };

    const repo = new AssetRepository();
    await repo.save(asset);

    // 6. Registro inmutable en Audit Log
    const auditRepo = new AuditRepository();
    await auditRepo.record({
      id: `audit-${Date.now()}`,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      userId: user.uid,
      userEmail: user.email,
      action: "CREATE",
      entity: "ASSET",
      entityId: assetId,
      diff: { filename: sanitizedFilename, mimeType, sizeBytes: buffer.length },
      source: "UI"
    });

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    console.error("Error al procesar subida de asset:", err);
    return NextResponse.json({ error: err.message || "Error al subir asset" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    const repo = new AssetRepository();

    if (clearAll) {
      const allAssets = await repo.listRecent(200, user.workspaceId);
      for (const a of allAssets) {
        if (a.aiGenerated || a.id.startsWith("asset-")) {
          await repo.delete(a.id).catch(() => {});
        }
      }
      return NextResponse.json({ success: true, message: "Todos los activos AI eliminados" });
    }

    if (!assetId) {
      return NextResponse.json({ error: "Falta el ID del activo a eliminar" }, { status: 400 });
    }

    await repo.delete(assetId);

    // Auditoría
    const auditRepo = new AuditRepository();
    await auditRepo.record({
      id: `audit-del-${Date.now()}`,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      userId: user.uid,
      userEmail: user.email,
      action: "DELETE",
      entity: "ASSET",
      entityId: assetId,
      diff: { assetId },
      source: "UI"
    }).catch(() => {});

    return NextResponse.json({ success: true, deletedId: assetId });
  } catch (err: any) {
    console.error("[api/assets DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Error al eliminar activo" }, { status: 500 });
  }
}

