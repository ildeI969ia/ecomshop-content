import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { ProductIntelligenceService } from "@/server/services/product-intelligence-service";
import { NotebookIntelligenceService } from "@/lib/services/notebook-intelligence";
import { detectProductType, buildProductEvidenceMap } from "@/lib/services/product-evidence-map";
import { EditorialOrchestrator } from "@/lib/services/editorial-orchestrator";

export const maxDuration = 60;

export interface EditorialAngle {
  id: string;
  title: string;
  intent: string;
  hook: string;
  targetAudience: string;
  editorialQuestion: string;
  tension: string;
  readerPromise: string;
  rationale: string;
  relevanceScore: number;
}

function intentFor(type: string): string {
  if (type === "ACCESS_POINT") return "ARQUITECTURA_WIFI";
  if (type === "SWITCH") return "CAPACIDAD_Y_TOPOLOGIA";
  if (type === "DAC" || type === "OPTICAL_TRANSCEIVER" || type === "FIBER_CABLE") return "MEDIO_FISICO";
  if (type === "ROUTER" || type === "FIREWALL") return "CONTINUIDAD_WAN";
  if (type === "CAMERA") return "VIDEOVIGILANCIA_IP";
  return "DECISION_DE_INGENIERIA";
}

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const cleanSku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : "";
    if (!cleanSku) return NextResponse.json({ error: "SKU requerido" }, { status: 400 });

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: "Presupuesto de IA superado para inteligencia editorial." }, { status: 429 });
    }

    const catalog = new ProductIntelligenceService();
    const card = await catalog.getOrGenerateCard(cleanSku);
    if (card.product.sku.toUpperCase() !== cleanSku) {
      return NextResponse.json({ error: "PRODUCT_TRUTH_MISMATCH", requestedSku: cleanSku, resolvedSku: card.product.sku }, { status: 409 });
    }

    const notebook = new NotebookIntelligenceService();
    const sourceIds = Array.isArray(body.sourceIds) && body.sourceIds.length > 0
      ? body.sourceIds.filter((id: unknown): id is string => typeof id === "string")
      : undefined;
    const intel = notebook.synthesizeProductIntelligence(cleanSku, sourceIds);
    const productType = detectProductType(cleanSku, card.product.category, card.technicalSpecs.deviceType);
    const evidenceMap = buildProductEvidenceMap(cleanSku, intel);

    const orchestrator = new EditorialOrchestrator();
    const decision = await orchestrator.generate({
      sku: cleanSku,
      category: card.product.category,
      topicTitle: card.product.model,
      userIntent: typeof body.userIntent === "string" ? body.userIntent : undefined,
      requestedChannel: typeof body.requestedChannel === "string" ? body.requestedChannel : undefined,
      preferredAudience: typeof body.preferredAudience === "string" ? body.preferredAudience : undefined,
      workspaceId: user.workspaceId,
      intel,
      evidenceMap,
      productType,
      variationSeed: typeof body.variationSeed === "number" ? body.variationSeed : 0
    });

    try {
      await recordAiUsage(user.uid, "editorial_orchestration", 0, 0, 0);
    } catch (usageErr) {
      console.warn("[SuggestAngles] usage record failed:", usageErr);
    }

    const angles: EditorialAngle[] = decision.angles.map((angle) => ({
      ...angle,
      intent: intentFor(decision.productType),
      hook: angle.readerPromise
    }));

    return NextResponse.json({
      success: true,
      sku: cleanSku,
      product: card.product,
      productType: decision.productType,
      recommendedAudiences: decision.recommendedAudiences,
      editorialQuestions: decision.editorialQuestions,
      angles,
      selectedAngle: decision.selectedAngle,
      diversityReport: decision.diversityReport,
      thesis: decision.thesis,
      outline: decision.outline,
      readerLearnings: decision.readerLearnings
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API SuggestAngles] Error:", err);
    return NextResponse.json({ error: message || "Error al construir la estrategia editorial." }, { status: 500 });
  }
});
