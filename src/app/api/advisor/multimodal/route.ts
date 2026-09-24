import { NextRequest, NextResponse } from "next/server";
import { analyzeMultimodalInput } from "@/lib/multimodal-advisor";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";

import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

export const maxDuration = 60; // 60 segundos para Cloud Run

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { textPrompt, mediaBase64, mimeType, scenarioId, category } = body;

    if (!textPrompt && !mediaBase64) {
      return NextResponse.json(
        { error: "Debes proporcionar al menos una nota explicativa o un archivo multimodal (imagen, audio o PDF)." },
        { status: 400 }
      );
    }

    // Comprobar presupuesto FinOps (estimado ~0.001€ para consulta multimodal)
    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct,
          resetsAt: "Inicio del próximo mes (Hora de Madrid)"
        },
        { status: 429 }
      );
    }

    const advisorResult = await analyzeMultimodalInput({
      textPrompt,
      mediaBase64,
      mimeType,
      scenarioId,
      category
    });

    const tokensIn = advisorResult.tokensInput || 1200;
    const tokensOut = advisorResult.tokensOutput || 800;
    await recordAiUsage(user.uid, "gemini_multimodal_advisor", tokensIn, tokensOut, 0);

    const latestBudget = await checkAiBudget(user.uid, user.role, 0);

    return NextResponse.json({
      success: true,
      data: advisorResult,
      budget: {
        spentEur: latestBudget.currentSpentEur,
        limitEur: latestBudget.limitEur,
        pct: latestBudget.pct
      }
    });
  } catch (error: any) {
    console.error("Error en endpoint multimodal advisor:", error);
    return NextResponse.json(
      {
        error: error.message || "Error al procesar el análisis multimodal con Gemini.",
        details: error.toString()
      },
      { status: 500 }
    );
  }
});
