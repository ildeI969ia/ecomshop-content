import { ContentOutput, GenerateRequest } from "./schema";
import { getCatalogDevice, CatalogDevice } from "./catalog";

export async function generateB2BContent(req: Partial<GenerateRequest> & { apiKey?: string }): Promise<ContentOutput> {
  const apiKey = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Detección y Grounding enriquecido con ECOMSHOP_CATALOG
  const targetSku = req.sku || req.customEquipmentName || (req.promotedProductIds && req.promotedProductIds[0]) || "";
  const catalogDevice: CatalogDevice | undefined =
    getCatalogDevice(targetSku) ||
    (req.topicTitle ? getCatalogDevice(req.topicTitle) : undefined) ||
    (req.productUrl ? getCatalogDevice(req.productUrl) : undefined);

  const productIdentifier = catalogDevice?.sku || targetSku || req.topicTitle || "Solución de Networking";

  // Editorial Orchestrator: una única decisión editorial antes de escribir.
  // No se permite que el endpoint ni el writer inventen la estrategia final.
  const effectiveSourceIds: string[] | undefined = (req.selectedSourceIds && req.selectedSourceIds.length > 0)
    ? req.selectedSourceIds
    : catalogDevice?.notebookSourceId
      ? [catalogDevice.notebookSourceId, "src-4", "src-18"]
      : undefined;

  const { NotebookIntelligenceService } = await import("./services/notebook-intelligence");
  const { detectProductType, buildProductEvidenceMap } = await import("./services/product-evidence-map");
  const { EditorialOrchestrator } = await import("./services/editorial-orchestrator");
  const { GroundedWriterService } = await import("./services/grounded-writer");

  const notebookService = new NotebookIntelligenceService();
  const intel = notebookService.synthesizeProductIntelligence(productIdentifier, effectiveSourceIds);
  const canonicalSku = catalogDevice?.sku || intel.sku;
  const productType = detectProductType(
    canonicalSku,
    req.category || catalogDevice?.category || "general",
    intel.card?.technicalSpecs?.deviceType
  );
  const evidenceMap = buildProductEvidenceMap(canonicalSku, intel);

  const orchestrator = new EditorialOrchestrator();
  const editorialDecision = await orchestrator.generate({
    sku: canonicalSku,
    category: req.category || catalogDevice?.category || "general",
    topicTitle: req.topicTitle || catalogDevice?.name || intel.model,
    userIntent: req.customNotes,
    requestedChannel: "multichannel",
    preferredAudience: req.targetAudience,
    requestedAngle: typeof (req as { editorialAngle?: unknown }).editorialAngle === "object" && (req as { editorialAngle?: unknown }).editorialAngle !== null
      ? (req as { editorialAngle: { id?: string; title?: string; editorialQuestion?: string; tension?: string; readerPromise?: string; targetAudience?: string } }).editorialAngle
      : undefined,
    workspaceId: typeof (req as { workspaceId?: unknown }).workspaceId === "string"
      ? (req as { workspaceId: string }).workspaceId
      : undefined,
    intel,
    evidenceMap,
    productType
  });

  const writer = new GroundedWriterService();
  const generated = await writer.generateGroundedContent({
    sku: canonicalSku,
    topicTitle: req.topicTitle || catalogDevice?.name || intel.model,
    category: req.category || "general",
    productUrl: req.productUrl || catalogDevice?.productUrl,
    targetAudience: editorialDecision.selectedAngle.targetAudience,
    customNotes: req.customNotes,
    editorialControls: req.editorialControls,
    selectedSourceIds: effectiveSourceIds,
    intel,
    editorialDecision,
    apiKey
  });

  const { validateEditorialQuality } = await import("./quality/editorial-quality-gate");
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
