import { ContentOutput, GenerateRequest } from "./schema";
import { buildGenerationContext, type GenerationContext } from "@/server/services/generation-context";
import { EditorialOrchestrator } from "./services/editorial-orchestrator";
import { GroundedWriterService } from "./services/grounded-writer";
import { validateEditorialQuality } from "./quality/editorial-quality-gate";
import type { CatalogProduct } from "./data/ecomshop-catalog";

export type CanonicalGenerateRequest = Partial<GenerateRequest> & {
  apiKey?: string;
  canonicalProduct?: CatalogProduct;
};

export async function generateB2BContent(
  req: CanonicalGenerateRequest,
  context?: GenerationContext
): Promise<ContentOutput> {
  const apiKey = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // 1. GenerationContext es la ÚNICA fuente de contexto y verdad del producto.
  // Se resuelve una sola vez y no se vuelve a buscar en pasos posteriores.
  const generationContext =
    context ||
    (await buildGenerationContext(req, {
      includeProductIntelligenceCard: true,
      apiKey,
      canonicalProduct: req.canonicalProduct
    }));

  const canonicalSku = generationContext.canonicalSku;
  const canonicalTitle = generationContext.effectiveTitle;
  const canonicalCategory = generationContext.effectiveCategory;
  const canonicalProductUrl = generationContext.productUrl;

  // 2. Cerebro Editorial: EditorialOrchestrator produce EditorialDecision
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
    intel: generationContext.intel,
    evidenceMap: generationContext.evidenceMap,
    productType: generationContext.productType,
    variationSeed: typeof (req as any).variationSeed === "number" ? (req as any).variationSeed : undefined
  });

  // 3. Redacción Multicanal basada en ChannelStrategyPlanner y Channel Writers
  const writer = new GroundedWriterService();
  const generated = await writer.generateGroundedContent(
    {
      sku: canonicalSku,
      topicTitle: req.topicTitle || canonicalTitle,
      category: canonicalCategory,
      productUrl: canonicalProductUrl,
      targetAudience: editorialDecision.selectedAngle.targetAudience,
      customNotes: req.customNotes,
      editorialControls: req.editorialControls,
      selectedSourceIds: generationContext.sourceIds,
      intel: generationContext.intel,
      editorialDecision,
      apiKey
    },
    generationContext
  );

  // 4. Quality Gate Editorial final
  const finalQuality = validateEditorialQuality(
    generated,
    editorialDecision.selectedAngle.targetAudience,
    canonicalSku
  );

  return {
    ...generated,
    factCheckScore: finalQuality.score,
    status: (finalQuality.passed && !generated.fallbackUsed) ? "DRAFT" : "NEEDS_REVIEW"
  };
}
