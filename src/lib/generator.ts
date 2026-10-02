import { ContentOutput, GenerateRequest } from "./schema";
import { buildGenerationContext, type GenerationContext } from "@/server/services/generation-context";

export async function generateB2BContent(
  req: Partial<GenerateRequest> & { apiKey?: string },
  context?: GenerationContext
): Promise<ContentOutput> {
  const generationContext =
    context ||
    (await buildGenerationContext(req, {
      includeProductIntelligenceCard: false,
      apiKey: req.apiKey
    }));

  const { EditorialOrchestrator } = await import("./services/editorial-orchestrator");
  const { GroundedWriterService } = await import("./services/grounded-writer");

  // The context is the single source of product identity, evidence and sources.
  // From this point onward no component is allowed to re-resolve the SKU.
  const orchestrator = new EditorialOrchestrator();
  const editorialDecision = await orchestrator.generate({
    sku: generationContext.canonicalSku,
    category: req.category || generationContext.effectiveCategory || "general",
    topicTitle:
      req.topicTitle ||
      generationContext.effectiveTitle ||
      generationContext.catalogDevice?.name ||
      generationContext.intel.model,
    userIntent: req.customNotes,
    requestedChannel: "multichannel",
    preferredAudience: req.targetAudience,
    requestedAngle: req.editorialAngle,
    workspaceId: req.workspaceId,
    intel: generationContext.intel,
    evidenceMap: generationContext.evidenceMap,
    productType: generationContext.productType
  });

  const writer = new GroundedWriterService();
  const generated = await writer.generateGroundedContent({
    sku: generationContext.canonicalSku,
    topicTitle:
      req.topicTitle ||
      generationContext.effectiveTitle ||
      generationContext.catalogDevice?.name ||
      generationContext.intel.model,
    category: req.category || generationContext.effectiveCategory || "general",
    productUrl:
      req.productUrl ||
      generationContext.productUrl ||
      generationContext.catalogDevice?.productUrl,
    targetAudience: editorialDecision.selectedAngle.targetAudience,
    customNotes: req.customNotes,
    editorialControls: req.editorialControls,
    selectedSourceIds:
      generationContext.sourceIds ||
      (generationContext.catalogDevice?.notebookSourceId
        ? [generationContext.catalogDevice.notebookSourceId]
        : undefined),
    intel: generationContext.intel,
    editorialDecision,
    apiKey: req.apiKey
  });

  const { validateEditorialQuality } = await import("./quality/editorial-quality-gate");
  const finalQuality = validateEditorialQuality(
    generated,
    editorialDecision.selectedAngle.targetAudience,
    generationContext.canonicalSku
  );

  return {
    ...generated,
    factCheckScore: finalQuality.score,
    status: finalQuality.passed ? "DRAFT" : "NEEDS_REVIEW"
  };
}
