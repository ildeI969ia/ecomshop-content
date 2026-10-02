import { ContentOutput, GenerateRequest } from "./schema";
import { findCatalogProductExact, type CatalogProduct } from "./data/ecomshop-catalog";
import { getDynamicCatalogProduct } from "./catalog-server";
import { buildFeedProductIntelligence } from "./services/feed-product-intelligence";
import { detectProductType, buildProductEvidenceMap } from "./services/product-evidence-map";
import { EditorialOrchestrator } from "./services/editorial-orchestrator";
import { GroundedWriterService } from "./services/grounded-writer";
import { validateEditorialQuality } from "./quality/editorial-quality-gate";

type CanonicalGenerateRequest = Partial<GenerateRequest> & {
  apiKey?: string;
  canonicalProduct?: CatalogProduct;
};

export async function generateB2BContent(req: CanonicalGenerateRequest): Promise<ContentOutput> {
  const apiKey = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const requestedSku =
    req.sku ||
    req.customEquipmentName ||
    req.promotedProductIds?.[0] ||
    "";

  // FUENTE DE VERDAD ÚNICA:
  // 1) producto sincronizado desde el feed de EcomShop;
  // 2) catálogo estático únicamente como fallback si el feed no está disponible.
  const feedProduct =
    req.canonicalProduct ||
    (requestedSku ? await getDynamicCatalogProduct(requestedSku) : undefined) ||
    (requestedSku ? findCatalogProductExact(requestedSku) : undefined);

  if (!feedProduct) {
    throw new Error(
      `PRODUCT_NOT_FOUND: El SKU ${requestedSku || "(vacío)"} no existe en el feed/catálogo de EcomShop.`
    );
  }

  const canonicalSku = feedProduct.sku;
  const canonicalTitle = feedProduct.name;
  const canonicalCategory = feedProduct.category;
  const canonicalProductUrl = feedProduct.url;

  // Toda la inteligencia se deriva exclusivamente del producto seleccionado.
  // NotebookLM no participa en el flujo editorial canónico.
  const intel = buildFeedProductIntelligence(feedProduct);
  const productType = detectProductType(
    canonicalSku,
    canonicalCategory,
    feedProduct.deviceType
  );
  const evidenceMap = buildProductEvidenceMap(canonicalSku, intel);

  const orchestrator = new EditorialOrchestrator();
  const editorialDecision = await orchestrator.generate({
    sku: canonicalSku,
    category: canonicalCategory,
    topicTitle: req.topicTitle || canonicalTitle,
    userIntent: req.customNotes,
    requestedChannel: "multichannel",
    preferredAudience: req.targetAudience,
    requestedAngle: req.editorialAngle,
    workspaceId: req.workspaceId,
    intel,
    evidenceMap,
    productType
  });

  const writer = new GroundedWriterService();
  const generated = await writer.generateGroundedContent({
    sku: canonicalSku,
    topicTitle: req.topicTitle || canonicalTitle,
    category: canonicalCategory,
    productUrl: canonicalProductUrl,
    targetAudience: editorialDecision.selectedAngle.targetAudience,
    customNotes: req.customNotes,
    editorialControls: req.editorialControls,
    selectedSourceIds: [],
    intel,
    editorialDecision,
    apiKey
  });

  const finalQuality = validateEditorialQuality(
    generated,
    editorialDecision.selectedAngle.targetAudience,
    canonicalSku
  );

  return {
    ...generated,
    factCheckScore: finalQuality.score,
    status: finalQuality.passed ? "DRAFT" : "NEEDS_REVIEW"
  };
}
