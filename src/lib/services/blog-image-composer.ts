import { generateImageWithImagen } from "@/lib/image-generator";
import { PhotoPlacement, ProductVisualContext } from "./visual-planner";
import { sanitizeHtml } from "@/server/security/sanitizer";

export interface BlogImageCompositionResult {
  finalHtml: string;
  updatedPlacements: PhotoPlacement[];
  generatedCount: number;
}

/**
 * Blog Image Composer (Junia Engine - P0 Visual Pipeline)
 * Recibe un HTML con marcadores {{IMAGE:photo-id}} y los PhotoPlacements pendientes,
 * genera las imágenes correspondientes a través del Image Engine (respetando la imagen oficial de referencia si existe)
 * y sustituye los marcadores por las URLs finales de los assets.
 */
export async function composeBlogImages(
  htmlWithSlots: string,
  photoPlacements: PhotoPlacement[],
  productContext?: ProductVisualContext,
  apiKeyOverride?: string
): Promise<BlogImageCompositionResult> {
  let composedHtml = htmlWithSlots;
  let generatedCount = 0;

  const updatedPlacements: PhotoPlacement[] = await Promise.all(
    photoPlacements.map(async (placement) => {
      // Si ya tiene una URL válida generada, solo sustituir en HTML
      if (placement.imageUrl && placement.status === "GENERATED") {
        composedHtml = composedHtml.replace(
          new RegExp(`\\{\\{IMAGE:${placement.id}\\}\\}`, "g"),
          placement.imageUrl
        );
        return placement;
      }

      try {
        const rawBaseImage = productContext?.officialImageUrl || undefined;

        const genResult = await generateImageWithImagen({
          prompt: placement.imagen3Prompt || placement.description,
          aspectRatio: (placement.aspectRatio as "16:9" | "1:1" | "4:3") || "16:9",
          baseImage: rawBaseImage
        });

        const assetId = `asset-${placement.id}-${Date.now()}`;
        const updated: PhotoPlacement = {
          ...placement,
          assetId,
          imageUrl: genResult.imageUrl,
          status: "GENERATED"
        };

        composedHtml = composedHtml.replace(
          new RegExp(`\\{\\{IMAGE:${placement.id}\\}\\}`, "g"),
          genResult.imageUrl
        );

        generatedCount++;
        return updated;
      } catch (err) {
        console.error(`[BlogImageComposer] Error generando imagen para slot ${placement.id}:`, err);
        // Fallback a imagen stock si la generación falla
        const fallbackStockUrl = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80";
        composedHtml = composedHtml.replace(
          new RegExp(`\\{\\{IMAGE:${placement.id}\\}\\}`, "g"),
          fallbackStockUrl
        );

        return {
          ...placement,
          imageUrl: fallbackStockUrl,
          status: "FAILED"
        };
      }
    })
  );

  // Sanitizar el HTML final manteniendo los tags figure/figcaption y data attributes
  const sanitizedFinalHtml = sanitizeHtml(composedHtml);

  return {
    finalHtml: sanitizedFinalHtml,
    updatedPlacements,
    generatedCount
  };
}
