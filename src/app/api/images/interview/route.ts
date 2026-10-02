import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import {
  analyzeImageIntent,
  compileCreativePrompt,
  fallbackAnalysis,
} from "@/lib/services/image-creative-engine";
import { ImageIntentInputSchema, ImageIntentAnalysisSchema } from "@/lib/types/image-intelligence";

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ code: "INVALID_REQUEST", error: "Solicitud inválida." }, { status: 400 });
    }

    const record = body as Record<string, unknown>;
    const requestedMode =
      record.mode === "interrogate" || record.mode === "analyze" || record.mode === "synthesize"
        ? record.mode
        : record.action === "start"
          ? "analyze"
          : record.action === "synthesize"
            ? "synthesize"
            : undefined;

    if (!requestedMode) {
      return NextResponse.json(
        { code: "INVALID_MODE", error: "Modo de Director de Arte no válido." },
        { status: 400 },
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, requestedMode === "synthesize" ? 0.001 : 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct,
          resetsAt: "Inicio del próximo mes (Hora de Madrid)",
        },
        { status: 429 },
      );
    }

    if (requestedMode === "analyze" || requestedMode === "interrogate") {
      const input = ImageIntentInputSchema.parse({
        userIdea: typeof record.userIdea === "string" ? record.userIdea : "",
        baseImage: typeof record.baseImage === "string" ? record.baseImage : undefined,
        selectedSku: typeof record.selectedSku === "string" ? record.selectedSku : undefined,
        productContext: typeof record.productContext === "string" ? record.productContext : undefined,
        channel: typeof record.channel === "string" ? record.channel : undefined,
        audience: typeof record.audience === "string" ? record.audience : undefined,
        requestedAspectRatio:
          record.requestedAspectRatio === "1:1" || record.requestedAspectRatio === "4:3"
            ? record.requestedAspectRatio
            : "16:9",
      });

      let analysis;
      try {
        analysis = await analyzeImageIntent(input);
      } catch (error) {
        console.warn("[images/interview] Creative analysis fallback:", error);
        analysis = fallbackAnalysis(input);
      }

      try {
        await recordAiUsage(user.uid, "image_interview", 400, 300, 0);
      } catch (usageErr) {
        console.warn("[images/interview] Usage record failed:", usageErr);
      }

      return NextResponse.json({
        success: true,
        analysis,
        recommendation: analysis.recommendation,
        questions: analysis.qualification.questions,
        readyForGeneration: analysis.qualification.readyForGeneration,
      });
    }

    const input = ImageIntentInputSchema.parse({
      userIdea: typeof record.userIdea === "string" ? record.userIdea : "",
      baseImage: typeof record.baseImage === "string" ? record.baseImage : undefined,
      selectedSku: typeof record.selectedSku === "string" ? record.selectedSku : undefined,
      productContext: typeof record.productContext === "string" ? record.productContext : undefined,
      channel: typeof record.channel === "string" ? record.channel : undefined,
      audience: typeof record.audience === "string" ? record.audience : undefined,
      requestedAspectRatio:
        record.requestedAspectRatio === "1:1" || record.requestedAspectRatio === "4:3"
          ? record.requestedAspectRatio
          : "16:9",
    });

    const analysis = ImageIntentAnalysisSchema.parse(record.analysis);
    const answers =
      record.answers && typeof record.answers === "object"
        ? (record.answers as Record<string, string>)
        : {};

    let result;
    try {
      result = await compileCreativePrompt({ ...input, analysis, answers });
    } catch (error) {
      console.warn("[images/interview] Prompt compiler fallback:", error);
      result = {
        suggestedPrompt: `Professional photorealistic B2B commercial photograph of ${analysis.detectedProduct || "enterprise networking hardware"} in ${analysis.recommendation.scene}. ${analysis.recommendation.action}. ${analysis.recommendation.composition}. ${analysis.recommendation.lighting}. ${analysis.recommendation.camera}. Preserve the exact physical product, proportions, ports, antennas, LEDs, buttons and branding. No invented hardware, no distorted geometry, no duplicate products.`,
        recommendedAspectRatio: analysis.recommendation.aspectRatio,
        technicalNotes: "Prompt compilado con dirección creativa y restricciones de fidelidad de producto.",
      };
    }

    try {
      await recordAiUsage(user.uid, "image_interview", 500, 300, 0);
    } catch (usageErr) {
      console.warn("[images/interview] Usage record failed:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data: result,
      result,
      analysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en el Director de Arte IA";
    console.error("[images/interview] Error:", error);
    return NextResponse.json(
      { code: "IMAGE_CREATIVE_PIPELINE_ERROR", error: message },
      { status: 500 },
    );
  }
});
