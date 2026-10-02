import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { generateB2BContent } from "@/lib/generator";

export const maxDuration = 60;

type Channel = "linkedin" | "whatsapp" | "product-sheet";

function isChannel(value: unknown): value is Channel {
  return value === "linkedin" || value === "whatsapp" || value === "product-sheet";
}

function extractEditorialAngle(currentContent: unknown): Record<string, unknown> | undefined {
  if (!currentContent || typeof currentContent !== "object") return undefined;
  const decision = (currentContent as Record<string, unknown>).editorialDecision;
  if (!decision || typeof decision !== "object") return undefined;
  const selectedAngle = (decision as Record<string, unknown>).selectedAngle;
  return selectedAngle && typeof selectedAngle === "object"
    ? selectedAngle as Record<string, unknown>
    : undefined;
}

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { sku, channel, topicTitle, category, targetAudience, currentContent } = body as {
      sku?: unknown;
      channel?: unknown;
      topicTitle?: unknown;
      category?: unknown;
      targetAudience?: unknown;
      currentContent?: unknown;
    };

    if (typeof sku !== "string" || !sku.trim()) {
      return NextResponse.json(
        { error: "MISSING_PARAMETERS", message: "El parámetro 'sku' es obligatorio." },
        { status: 400 }
      );
    }

    if (!isChannel(channel)) {
      return NextResponse.json(
        { error: "INVALID_CHANNEL", message: "El canal debe ser linkedin, whatsapp o product-sheet." },
        { status: 400 }
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.0045);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct
        },
        { status: 429 }
      );
    }

    const editorialAngle = extractEditorialAngle(currentContent);
    const content = await generateB2BContent({
      sku: sku.trim(),
      topicTitle: typeof topicTitle === "string" ? topicTitle : "",
      category: typeof category === "string" ? category : "general",
      targetAudience: typeof targetAudience === "string" ? targetAudience : "",
      customNotes: "",
      workspaceId: user.workspaceId,
      editorialAngle
    });

    let data: unknown;
    if (channel === "linkedin") {
      data = content.linkedin;
    } else if (channel === "whatsapp") {
      data = content.whatsapp;
    } else {
      data = {
        channel: "product-sheet",
        commercialBullets: content.ecomshop?.features || [],
        crossSellAccessories: [],
        technicalSummaryHtml: content.ecomshop?.cmsHtml || content.blog?.htmlContent || ""
      };
    }

    const tokensIn = content.usageMetadata?.promptTokenCount ?? 0;
    const tokensOut = content.usageMetadata?.candidatesTokenCount ?? 0;
    try {
      await recordAiUsage(user.uid, `channel_${channel}_generation`, tokensIn, tokensOut, 0);
    } catch (usageErr) {
      console.error("[API Channel] Warning: Falló el registro de uso de IA:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data,
      editorialDecision: content.editorialDecision,
      qualityStatus: content.status,
      factCheckScore: content.factCheckScore
    });
  } catch (err: unknown) {
    console.error("[API Channel Error]:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
});
