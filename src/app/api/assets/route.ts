import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { AssetRepository, AuditRepository } from "@/server/repositories";
import { GoogleCloudStorageProvider } from "@/server/services/storage-provider";
import { Asset } from "@/server/domain/types";

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
    const list = await repo.listByWorkspace(user.workspaceId);
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
