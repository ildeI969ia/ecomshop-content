import { generateImageWithImagen } from "@/lib/image-generator";
import { prepareImageBinary } from "@/server/services/image-binary";
import { GoogleCloudStorageProvider } from "@/server/services/storage-provider";
import { AssetRepository } from "@/server/repositories";
import { Asset } from "@/server/domain/types";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

export interface AutoHeroImageInput {
  workspaceId: string;
  userId: string;
  userRole?: string;
  sku: string;
  topicTitle: string;
  brand?: string;
  model?: string;
  category?: string;
  technicalQuestion?: string;
  centralArgument?: string;
  officialImageUrl?: string;
}

export interface AutoHeroImageResult {
  imageUrl: string;
  assetId: string;
  altText: string;
  caption: string;
  sourceType: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Genera automáticamente una imagen Hero de alta relevancia técnica para el post,
 * optimizada para la indexación visual en Google (SEO / AEO), con persistencia
 * verificada en Google Cloud Storage y registro en Firestore.
 */
export async function generateAutoHeroImage(
  input: AutoHeroImageInput
): Promise<AutoHeroImageResult | null> {
  const {
    workspaceId,
    userId,
    userRole = "EDITOR",
    sku,
    topicTitle,
    brand = "EcomSpain",
    model = sku,
    category = "Tecnología de Redes B2B",
    technicalQuestion,
    centralArgument,
    officialImageUrl
  } = input;

  try {
    // 1. Control FinOps preventivo
    const budget = await checkAiBudget(userId, userRole as any, 0.0038);
    if (!budget.allowed) {
      console.warn(`[AutoHeroImage] Presupuesto de IA alcanzado para ${userId}. Usando modo catálogo/curado.`);
    }

    // 2. Construcción de prompt altamente relevante para el producto y contexto B2B
    const cleanBrand = brand || "EcomSpain";
    const contextPrompt = technicalQuestion
      ? `Technical deployment and architectural setup of ${cleanBrand} ${model} (${sku}) resolving: "${technicalQuestion}".`
      : `High-end enterprise networking deployment of ${cleanBrand} ${model} (${sku}) in a clean datacenter or server rack.`;

    const fullPrompt = `Professional photorealistic B2B photograph of ${cleanBrand} ${model} (${sku}) in a telecommunications environment. ${contextPrompt} Realistic depth of field, sharp hardware details, RJ45 ports and LED activity lights, clean industrial aesthetics, 8k resolution.`;

    const altText = `${cleanBrand} ${model} (${sku}) - Despliegue e infraestructura en ${category}`;
    const caption = `Instalación y arquitectura técnica de ${cleanBrand} ${model} (${sku}) para redes profesionales.`;

    // 3. Generación con Imagen / Gemini Image
    const genResult = await generateImageWithImagen({
      prompt: fullPrompt,
      aspectRatio: "16:9",
      baseImage: officialImageUrl || undefined,
      mode: budget.allowed ? "ai" : "curated",
      preservePrompt: true
    });

    const parsed = parseDataUrl(genResult.imageUrl);
    const assetId = `asset-hero-${sku.toLowerCase()}-${Date.now()}`;
    const nowIso = new Date().toISOString();

    let publicUrl = genResult.imageUrl;

    if (parsed) {
      // Data URL: optimizar binario, subir a Cloud Storage y obtener URL pública permanente
      const prepared = await prepareImageBinary(parsed.buffer, parsed.mimeType);
      const destinationPath = `workspaces/${workspaceId}/assets/${assetId}_hero.${prepared.extension}`;

      const uploadRes = await new GoogleCloudStorageProvider().uploadFile({
        buffer: prepared.buffer,
        destinationPath,
        mimeType: prepared.mimeType,
      });

      if (uploadRes.publicUrl) {
        publicUrl = uploadRes.publicUrl;

        const assetItem: Asset = {
          id: assetId,
          workspaceId,
          filename: `hero-${sku}.jpg`,
          mimeType: prepared.mimeType,
          sizeBytes: prepared.buffer.length,
          storagePath: uploadRes.storagePath,
          publicUrl: uploadRes.publicUrl,
          type: "image",
          aiGenerated: true,
          productId: sku,
          ownerId: userId,
          storageStatus: "VERIFIED",
          sha256: prepared.sha256,
          originalSizeBytes: parsed.buffer.length,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: userId,
          updatedBy: userId
        };

        const assetRepo = new AssetRepository();
        await assetRepo.save(assetItem);
      }
    }

    if (budget.allowed && parsed) {
      await recordAiUsage(userId, "imagen_generation", 1, 1, 0.0038).catch((err) =>
        console.warn("[AutoHeroImage] FinOps record error:", err)
      );
    }

    return {
      imageUrl: publicUrl,
      assetId,
      altText,
      caption,
      sourceType: genResult.sourceType
    };
  } catch (err) {
    console.error(`[AutoHeroImage] Error generando imagen automática para ${sku}:`, err);
    return null;
  }
}
