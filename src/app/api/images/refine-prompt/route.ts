import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import {
  analyzeImageIntent,
  compileCreativePrompt,
  fallbackAnalysis,
} from "@/lib/services/image-creative-engine";
import { ImageIntentInputSchema } from "@/lib/types/image-intelligence";

export interface PromptRefinementResponse {
  originalIdea: string;
  improvedPrompt: string;
  cameraDetails: string;
  improvements: string[];
  suggestedAspectRatio: "16:9" | "1:1" | "4:3";
}

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ code: "INVALID_REQUEST", error: "Solicitud inválida." }, { status: 400 });
    }

    const record = body as Record<string, unknown>;
    const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { code: "MISSING_PROMPT", error: "Se requiere una idea para cualificar." },
        { status: 400 },
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
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

    const input = ImageIntentInputSchema.parse({
      userIdea: prompt,
      baseImage: typeof record.baseImage === "string" ? record.baseImage : undefined,
      selectedSku: typeof record.selectedSku === "string" ? record.selectedSku : undefined,
      productContext: typeof record.productContext === "string" ? record.productContext : undefined,
      channel: "B2B marketing",
      audience: "Profesionales B2B de tecnología",
      requestedAspectRatio:
        record.aspectRatio === "1:1" || record.aspectRatio === "4:3" ? record.aspectRatio : "16:9",
    });

    let analysis;
    try {
      analysis = await analyzeImageIntent(input);
    } catch (error) {
      console.warn("[refine-prompt] Creative qualification fallback:", error);
      analysis = fallbackAnalysis(input);
    }

    let compiled;
    try {
      compiled = await compileCreativePrompt({ ...input, analysis });
    } catch (error) {
      console.warn("[refine-prompt] Prompt compiler fallback:", error);
      compiled = {
        suggestedPrompt: `Professional photorealistic B2B commercial photograph of ${analysis.detectedProduct} in ${analysis.recommendation.scene}. ${analysis.recommendation.action}. ${analysis.recommendation.composition}. ${analysis.recommendation.lighting}. ${analysis.recommendation.camera}. Preserve exact hardware geometry, ports, antennas, LEDs and branding. No invented or distorted hardware.`,
        recommendedAspectRatio: analysis.recommendation.aspectRatio,
        technicalNotes: analysis.recommendation.rationale,
      };
    }

    try {
      await recordAiUsage(user.uid, "image_refine_prompt", 800, 500, 0);
    } catch (usageErr) {
      console.warn("[refine-prompt] Usage record failed:", usageErr);
    }

    const refinement: PromptRefinementResponse = {
      originalIdea: prompt,
      improvedPrompt: compiled.suggestedPrompt,
      cameraDetails: analysis.recommendation.camera,
      improvements: [
        `Objetivo comercial: ${analysis.recommendation.objective}`,
        `Escena cualificada: ${analysis.recommendation.scene}`,
        `Composición: ${analysis.recommendation.composition}`,
        `Fidelidad de producto: ${analysis.recommendation.productTreatment}`,
      ],
      suggestedAspectRatio: compiled.recommendedAspectRatio,
    };

    return NextResponse.json({
      success: true,
      refinement,
      analysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando la cualificación del prompt";
    console.error("[refine-prompt] Error fatal:", error);
    return NextResponse.json(
      { code: "IMAGE_QUALIFICATION_ERROR", error: message },
      { status: 500 },
    );
  }
});
