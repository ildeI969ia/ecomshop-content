import type { GenerateRequest } from "@/lib/schema";
import { getCatalogDevice, type CatalogDevice } from "@/lib/catalog";
import { extractEcomshopProduct } from "@/lib/services/ecomshop-extractor";
import { buildProductIntelligenceCard } from "@/lib/services/product-intelligence";
import type { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { NotebookIntelligenceService, type StructuredProductIntelligence } from "@/lib/services/notebook-intelligence";
import { detectProductType, buildProductEvidenceMap } from "@/lib/services/product-evidence-map";
import type { ProductEvidenceMap, ProductType } from "@/lib/types/editorial-intelligence";
import { getDynamicCatalogDevice } from "@/lib/catalog-server";
import { ProductIntelligenceService } from "@/server/services/product-intelligence-service";

export interface GenerationContext {
  readonly requestedSku: string;
  readonly canonicalSku: string;
  readonly productIdentifier: string;
  readonly catalogDevice?: CatalogDevice;
  readonly intelligenceCard?: ProductIntelligenceCard;
  readonly intel: StructuredProductIntelligence;
  readonly evidenceMap: ProductEvidenceMap;
  readonly productType: ProductType;
  readonly sourceIds?: string[];
  readonly effectiveTitle: string;
  readonly effectiveCategory: string;
  readonly productUrl?: string;
}

export interface BuildGenerationContextOptions {
  readonly includeProductIntelligenceCard?: boolean;
  readonly apiKey?: string;
}

/**
 * Builds the canonical, immutable context used by every editorial generation path.
 *
 * The application layer owns product resolution and enrichment. Generators consume
 * this context instead of re-discovering the SKU, catalog item, sources and
 * intelligence independently.
 */
export async function buildGenerationContext(
  req: Partial<GenerateRequest>,
  options: BuildGenerationContextOptions = {}
): Promise<GenerationContext> {
  const targetSku =
    req.sku ||
    req.customEquipmentName ||
    req.promotedProductIds?.[0] ||
    "";

  const dynamicCatalogDevice =
    await getDynamicCatalogDevice(targetSku) ||
    (req.topicTitle ? await getDynamicCatalogDevice(req.topicTitle) : undefined) ||
    (req.productUrl ? await getDynamicCatalogDevice(req.productUrl) : undefined);

  const catalogDevice =
    dynamicCatalogDevice ||
    getCatalogDevice(targetSku) ||
    (req.topicTitle ? getCatalogDevice(req.topicTitle) : undefined) ||
    (req.productUrl ? getCatalogDevice(req.productUrl) : undefined);

  const requestedSourceIds =
    req.selectedSourceIds && req.selectedSourceIds.length > 0
      ? req.selectedSourceIds
      : catalogDevice?.notebookSourceId
        ? Array.from(
            new Set([
              catalogDevice.notebookSourceId,
              ...(catalogDevice.additionalSourceIds || [])
            ])
          )
        : undefined;

  let intelligenceCard: ProductIntelligenceCard | undefined;
  let effectiveTitle =
    req.topicTitle ||
    req.topic ||
    req.editorialThesis ||
    "";
  let effectiveCategory = req.category || "general";
  let productUrl = req.productUrl;

  if (catalogDevice) {
    effectiveTitle =
      effectiveTitle ||
      `${catalogDevice.brand} ${catalogDevice.sku}: ${catalogDevice.name}`;

    if (effectiveCategory === "general") {
      if (catalogDevice.category.startsWith("WIFI")) effectiveCategory = "wifi";
      else if (catalogDevice.category.startsWith("SWITCH")) effectiveCategory = "switches";
      else if (catalogDevice.category === "GATEWAY_SDWAN") effectiveCategory = "engenius";
      else effectiveCategory = "engenius";
    }

    productUrl = productUrl || catalogDevice.productUrl;

    if (options.includeProductIntelligenceCard) {
      const intelService = new ProductIntelligenceService();
      intelligenceCard = await intelService.getOrGenerateCard(
        catalogDevice.sku,
        options.apiKey
      );
    }
  } else if (productUrl) {
    try {
      const rawProduct = await extractEcomshopProduct(productUrl);
      intelligenceCard = options.includeProductIntelligenceCard
        ? await buildProductIntelligenceCard(rawProduct)
        : undefined;

      if (!effectiveTitle) {
        effectiveTitle =
          `${rawProduct.brand} ${rawProduct.sku}: Despliegue y Ventajas Técnicas B2B`;
      }

      if (effectiveCategory === "general") {
        const lowerCategory = (rawProduct.category || "").toLowerCase();
        if (lowerCategory.includes("wifi") || rawProduct.sku.includes("ECW")) {
          effectiveCategory = "wifi";
        } else if (
          lowerCategory.includes("switch") ||
          rawProduct.sku.includes("ECS")
        ) {
          effectiveCategory = "switches";
        } else if (
          lowerCategory.includes("fibra") ||
          lowerCategory.includes("sfp")
        ) {
          effectiveCategory = "fibra";
        } else {
          effectiveCategory = "engenius";
        }
      }
    } catch (error) {
      console.warn(
        "[GenerationContext] Fallo en extracción/intelligence previa; se continúa con contexto de catálogo:",
        error
      );
    }
  }

  const productIdentifier =
    catalogDevice?.sku ||
    targetSku ||
    req.topicTitle ||
    "Solución de Networking";

  const notebookService = new NotebookIntelligenceService();
  const intel = notebookService.synthesizeProductIntelligence(
    productIdentifier,
    requestedSourceIds
  );

  const canonicalSku = catalogDevice?.sku || intel.sku || targetSku;
  if (!canonicalSku) {
    throw new Error("PRODUCT_NOT_FOUND: No se pudo resolver un SKU canónico");
  }

  const productType = detectProductType(
    canonicalSku,
    req.category || catalogDevice?.category || "general",
    intel.card?.technicalSpecs?.deviceType
  );
  const evidenceMap = buildProductEvidenceMap(canonicalSku, intel);

  return {
    requestedSku: targetSku,
    canonicalSku,
    productIdentifier,
    catalogDevice,
    intelligenceCard,
    intel,
    evidenceMap,
    productType,
    sourceIds: requestedSourceIds,
    effectiveTitle:
      effectiveTitle ||
      catalogDevice?.name ||
      intel.model ||
      `Producto ${canonicalSku}`,
    effectiveCategory,
    productUrl: productUrl || catalogDevice?.productUrl
  };
}
