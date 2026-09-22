import { NextResponse } from "next/server";
import { generateImageWithImagen } from "@/lib/image-generator";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { AssetRepository, AuditRepository } from "@/server/repositories";
import { GoogleCloudStorageProvider } from "@/server/services/storage-provider";
import { Asset } from "@/server/domain/types";

/**
 * Extrae MIME type y buffer binario de un Data URL base64.
 * Retorna null si la URL no es un Data URL válido.
 */
function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const { prompt, aspectRatio, apiKey, baseImage, mode } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Falta el prompt para generar la imagen" }, { status: 400 });
    }

    const result = await generateImageWithImagen({
      prompt,
      aspectRatio: aspectRatio || "16:9",
      apiKey,
      baseImage,
      mode: mode || "ai"
    });

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let finalPublicUrl = result.imageUrl;
    let storagePath = "";
    let mimeType = "image/jpeg";
    let sizeBytes = 0;

    // ── Subir binario a GCS si la imagen es un Data URL base64 ──────────
    // Esto garantiza que la imagen sea accesible desde cualquier dispositivo
    // via su URL pública de GCS, en vez de depender de IndexedDB local.
    const parsed = parseDataUrl(result.imageUrl);
    if (parsed) {
      mimeType = parsed.mimeType;
      sizeBytes = parsed.buffer.length;
      const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const destinationPath = `workspaces/${user.workspaceId}/assets/${assetId}_generated.${ext}`;

      try {
        const storage = new GoogleCloudStorageProvider();
        const uploadRes = await storage.uploadFile({
          buffer: parsed.buffer,
          destinationPath,
          mimeType,
        });
        finalPublicUrl = uploadRes.publicUrl || finalPublicUrl;
        storagePath = uploadRes.storagePath;
        console.log(`[api/images/generate] Imagen subida a GCS: ${storagePath} (${sizeBytes} bytes)`);
      } catch (storageErr) {
        // Fallback graceful: si GCS falla, mantener el data URL original
        console.warn("[api/images/generate] Error subiendo a GCS, usando data URL como fallback:", storageErr);
        finalPublicUrl = result.imageUrl;
        storagePath = `generated/${assetId}`;
      }
    } else {
      // URLs HTTP externas (Unsplash curated stock) — no necesitan subida a GCS
      finalPublicUrl = result.imageUrl;
      storagePath = result.imageUrl;
      sizeBytes = result.imageUrl.length;
    }

    // ── Persistir metadatos del activo en Firestore ─────────────────────
    try {
      const assetRepo = new AssetRepository();
      const asset: Asset = {
        id: assetId,
        workspaceId: user.workspaceId,
        filename: `AI: ${prompt.substring(0, 60)}`,
        mimeType,
        sizeBytes,
        storagePath,
        publicUrl: finalPublicUrl,
        type: "image",
        aiGenerated: true,
        aiProvenance: {
          provider: "google-vertex-genai",
          model: result.sourceType || "imagen3",
          requestId: assetId,
          generatedAt: new Date().toISOString(),
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          latencyMs: 0,
          estimatedCostEur: 0.03,
          sourceIdsUsed: []
        },
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        updatedBy: user.uid
      };
      await assetRepo.save(asset);

      const auditRepo = new AuditRepository();
      await auditRepo.record({
        id: `audit-img-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "ASSET",
        entityId: assetId,
        diff: { prompt: prompt.substring(0, 60), model: result.sourceType },
        source: "UI"
      });
    } catch (dbErr) {
      console.warn("[api/images/generate] No se pudo persistir asset en Firestore:", dbErr);
    }

    return NextResponse.json({
      imageUrl: finalPublicUrl,
      sourceType: result.sourceType,
      warning: result.warning,
      refinedPrompt: result.refinedPrompt,
      assetId
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al generar imagen";
    console.error("Error generating image:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
});
