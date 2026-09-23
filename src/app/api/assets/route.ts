import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { AssetRepository, AuditRepository } from "@/server/repositories";
import { GoogleCloudStorageProvider, StorageProviderError } from "@/server/services/storage-provider";
import { Asset } from "@/server/domain/types";
import { prepareImageBinary, sha256Of } from "@/server/services/image-binary";
import { summarizeAssetHealth } from "@/server/services/persistence-diagnostics";

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

    // F4: sin auto-recuperacion lateral - la galeria refleja lo que hay en la coleccion assets.
    const health = summarizeAssetHealth(list);
    return NextResponse.json({
      assets: list,
      total: list.length,
      health: { withUrl: health.withUrl, withoutUrl: health.withoutUrl, classified: health.classified }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/assets GET] Error al leer assets:", err);
    return NextResponse.json({ assets: [], total: 0, error: message }, { status: 500 });
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

    // 4. Subida a Cloud Storage (F3: si GCS falla => HTTP 502 y NO se escribe metadata)
    const storage = new GoogleCloudStorageProvider();
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const destinationPath = `workspaces/${user.workspaceId}/assets/${assetId}_${sanitizedFilename}`;

    // Optimización del binario raster antes de subir (F3) + SHA-256 del binario real
    const isRasterImage = mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp";
    const prepared = isRasterImage ? await prepareImageBinary(buffer, mimeType) : null;
    const uploadBuffer = prepared ? prepared.buffer : buffer;
    const uploadMime = prepared ? prepared.mimeType : mimeType;
    const sha256 = sha256Of(uploadBuffer);
    const originalSizeBytes = prepared && prepared.optimized ? buffer.length : undefined;
    const dotIdx = destinationPath.lastIndexOf(".");
    const uploadPath = prepared && prepared.optimized && dotIdx > 0 ? `${destinationPath.slice(0, dotIdx)}.${prepared.extension}` : destinationPath;

    let uploadRes;
    try {
      uploadRes = await storage.uploadFile({
        buffer: uploadBuffer,
        destinationPath: uploadPath,
        mimeType: uploadMime
      });
    } catch (storageErr) {
      const message = storageErr instanceof Error ? storageErr.message : String(storageErr);
      console.error("[api/assets POST] Subida a GCS fallida; no se persiste metadata:", message);
      return NextResponse.json(
        { error: `No se pudo guardar el archivo en Cloud Storage: ${message}`, persisted: false },
        { status: 502 }
      );
    }
    if (!uploadRes.publicUrl) {
      return NextResponse.json(
        { error: "GCS no devolvió una URL verificada. No se ha escrito ningún activo.", persisted: false },
        { status: 502 }
      );
    }

    // 5. Persistencia de metadatos en Firestore (sólo con el binario VERIFICADO en GCS)
    const asset: Asset = {
      id: assetId,
      workspaceId: user.workspaceId,
      filename: sanitizedFilename,
      mimeType: uploadMime,
      sizeBytes: uploadBuffer.length,
      originalSizeBytes,
      storagePath: uploadRes.storagePath,
      publicUrl: uploadRes.publicUrl,
      storageStatus: "VERIFIED",
      sha256,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error al procesar subida de asset:", message);
    return NextResponse.json({ error: message || "Error al subir asset", persisted: false }, { status: 500 });
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
    const storage = new GoogleCloudStorageProvider();
    const auditRepo = new AuditRepository();

    let idsToDelete: string[] = [];

    if (clearAll) {
      const allAssets = await repo.listRecent(200, user.workspaceId);
      idsToDelete = allAssets
        .filter((a) => a.aiGenerated || a.id.startsWith("asset-"))
        .map((a) => a.id);

      if (idsToDelete.length === 0) {
        return NextResponse.json({ success: true, deletedIds: [] });
      }
    } else if (assetId) {
      idsToDelete = [assetId];
    } else {
      try {
        const body = await req.json();
        if (body?.ids && Array.isArray(body.ids)) {
          idsToDelete = body.ids.filter((id: unknown) => typeof id === "string" && id.trim().length > 0);
        } else if (body?.id && typeof body.id === "string") {
          idsToDelete = [body.id.trim()];
        }
      } catch {
        // Body may be empty if using query params
      }
    }

    idsToDelete = Array.from(new Set(idsToDelete.filter(Boolean)));

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "Falta el ID o IDs del activo a eliminar" }, { status: 400 });
    }

    const deletedIds: string[] = [];
    const nowIso = new Date().toISOString();

    for (const id of idsToDelete) {
      try {
        // 1. Obtener el asset para extraer storagePath
        const asset = await repo.findById(id);

        // 2. Si storagePath existe, eliminar binario físico de GCS
        if (asset?.storagePath) {
          try {
            await storage.deleteFile(asset.storagePath);
          } catch (storageErr) {
            console.warn(`[api/assets DELETE] Error al eliminar binario en storage para ${id}:`, storageErr);
          }
        }

        // 3. Eliminar documento de Firestore
        await repo.delete(id);

        // 4. Registrar auditoría inmutable
        await auditRepo.record({
          id: `audit-del-asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: user.workspaceId,
          timestamp: nowIso,
          userId: user.uid,
          userEmail: user.email,
          action: "DELETE",
          entity: "ASSET",
          entityId: id,
          diff: {
            id,
            filename: asset?.filename,
            storagePath: asset?.storagePath
          },
          source: "UI"
        }).catch((auditErr) => {
          console.warn(`[api/assets DELETE] Error al registrar auditoría para asset ${id}:`, auditErr);
        });

        deletedIds.push(id);
      } catch (assetErr) {
        console.error(`[api/assets DELETE] Error procesando eliminación de asset ${id}:`, assetErr);
      }
    }

    return NextResponse.json({ success: true, deletedIds });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error al eliminar activo";
    console.error("[api/assets DELETE] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

