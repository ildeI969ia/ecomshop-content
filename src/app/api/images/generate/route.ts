import { NextResponse } from "next/server";
import { generateImageWithImagen } from "@/lib/image-generator";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { AssetRepository, AuditRepository } from "@/server/repositories";
import { GoogleCloudStorageProvider, StorageProviderError } from "@/server/services/storage-provider";
import { prepareImageBinary } from "@/server/services/image-binary";
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

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

/**
 * F3 — Generación con persistencia verificada.
 * Un 200 significa binario verificado en GCS Y metadatos escritos en Firestore.
 * Cualquier fallo devuelve 502 con la causa real: nunca data URL ni ruta ficticia.
 */
export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const { prompt, aspectRatio, baseImage, mode } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Falta el prompt para generar la imagen" }, { status: 400 });
    }

    const result = await generateImageWithImagen({
      prompt,
      aspectRatio: aspectRatio || "16:9",
      baseImage,
      mode: mode || "ai"
    });

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    let finalPublicUrl = "";
    let storagePath = "";
    let mimeType = "image/jpeg";
    let sizeBytes = 0;
    let sha256: string | undefined;
    let originalSizeBytes: number | undefined;
    let storageStatus: Asset["storageStatus"];

    const parsed = parseDataUrl(result.imageUrl);
    if (parsed) {
      // Data URL → optimizar (≤1600 px, q0.85), subir a GCS y verificar.
      originalSizeBytes = parsed.buffer.length;
      const prepared = await prepareImageBinary(parsed.buffer, parsed.mimeType);
      mimeType = prepared.mimeType;
      sizeBytes = prepared.buffer.length;
      sha256 = prepared.sha256;

      const destinationPath = `workspaces/${user.workspaceId}/assets/${assetId}_generated.${prepared.extension}`;
      let uploadRes;
      try {
        uploadRes = await new GoogleCloudStorageProvider().uploadFile({
          buffer: prepared.buffer,
          destinationPath,
          mimeType,
        });
      } catch (storageErr) {
        // Sin fallback: si no está el binario verificado, no se escribe nada.
        console.error("[api/images/generate] Subida a GCS fallida; no se persiste metadata:", storageErr);
        return NextResponse.json(
          {
            error: "No se pudo guardar la imagen en Cloud Storage. No se ha escrito ningún activo.",
            detail: storageErr instanceof Error ? storageErr.message : String(storageErr),
            cause: storageErr instanceof StorageProviderError ? storageErr.cause : "upload",
            persisted: false,
          },
          { status: 502 }
        );
      }

      if (!uploadRes.publicUrl) {
        console.error("[api/images/generate] GCS sin URL verificada; no se persiste metadata.");
        return NextResponse.json(
          { error: "GCS no devolvió una URL verificada. No se ha escrito ningún activo.", persisted: false },
          { status: 502 }
        );
      }

      finalPublicUrl = uploadRes.publicUrl;
      storagePath = uploadRes.storagePath;
      storageStatus = "VERIFIED";
      console.log(
        `[api/images/generate] Binario verificado en GCS: ${storagePath} ` +
          `(${sizeBytes} bytes, original ${originalSizeBytes}, sha256 ${sha256.slice(0, 12)}…)`
      );
    } else if (isHttpUrl(result.imageUrl)) {
      // URLs HTTP externas (stock curado): no hay binario propio que subir.
      finalPublicUrl = result.imageUrl;
      storagePath = result.imageUrl;
      sizeBytes = 0;
      storageStatus = "EXTERNAL_URL";
    } else {
      console.error("[api/images/generate] La generación no devolvió ni data URL ni URL HTTP.");
      return NextResponse.json(
        { error: "La imagen generada no tiene un formato persistible. No se ha escrito ningún activo.", persisted: false },
        { status: 502 }
      );
    }

    // ── Persistir metadatos con la URL VERIFICADA (no se tragan errores) ──
    const asset: Asset = {
      id: assetId,
      workspaceId: user.workspaceId,
      filename: `AI: ${prompt.substring(0, 60)}`,
      mimeType,
      sizeBytes,
      storagePath,
      publicUrl: finalPublicUrl,
      storageStatus,
      sha256,
      originalSizeBytes,
      type: "image",
      aiGenerated: true,
      aiProvenance: {
        provider: "google-vertex-genai",
        model: result.sourceType || "imagen3",
        requestId: assetId,
        generatedAt: nowIso,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        latencyMs: 0,
        estimatedCostEur: 0.03,
        sourceIdsUsed: []
      },
      ownerId: user.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.uid,
      updatedBy: user.uid
    };

    try {
      await new AssetRepository().save(asset);
    } catch (dbErr) {
      // El binario quedó huérfano en GCS, pero NO se devuelve un 200 mentiroso.
      console.error("[api/images/generate] Firestore rechazó el asset:", dbErr);
      return NextResponse.json(
        {
          error: "La imagen está en Cloud Storage pero no se pudo registrar en la base de datos.",
          detail: dbErr instanceof Error ? dbErr.message : String(dbErr),
          persisted: false,
          storagePath,
        },
        { status: 502 }
      );
    }

    try {
      await new AuditRepository().record({
        id: `audit-img-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: nowIso,
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "ASSET",
        entityId: assetId,
        diff: { prompt: prompt.substring(0, 60), model: result.sourceType, storageStatus, sha256 },
        source: "UI"
      });
    } catch (auditErr) {
      // No condiciona la persistencia del activo, pero tampoco se silencia.
      console.warn("[api/images/generate] Activo persistido; falló el registro de auditoría:", auditErr);
    }

    return NextResponse.json({
      imageUrl: finalPublicUrl,
      sourceType: result.sourceType,
      warning: result.warning,
      refinedPrompt: result.refinedPrompt,
      assetId,
      persisted: true,
      storageStatus
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al generar imagen";
    console.error("Error generating image:", error);
    return NextResponse.json({ error: errorMsg, persisted: false }, { status: 500 });
  }
});
