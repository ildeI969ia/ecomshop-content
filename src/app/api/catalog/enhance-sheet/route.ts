import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { enhanceProductSheet, exportEnhancedSheetToHtml, exportEnhancedSheetToCsv } from "@/lib/services/product-sheet-enhancer";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const json = await req.json();
    const { sku, format } = json;

    if (!sku) {
      return NextResponse.json({ error: "SKU es obligatorio" }, { status: 400 });
    }

    // Comprobar presupuesto FinOps (estimación ~0.003€)
    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.003);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Presupuesto FinOps superado para mejora de fichas" },
        { status: 429 }
      );
    }

    const enhanced = await enhanceProductSheet(sku);

    // Registrar consumo en FinOps
    await recordAiUsage(user.uid, "enhance_product_sheet", 600, 1200, 0);

    let exportedContent: string | null = null;
    if (format === "html") {
      exportedContent = exportEnhancedSheetToHtml(enhanced);
    } else if (format === "csv") {
      exportedContent = exportEnhancedSheetToCsv(enhanced);
    }

    return NextResponse.json({
      success: true,
      enhanced,
      exportedContent
    });
  } catch (error: any) {
    console.error("[API EnhanceSheet] Error:", error);
    return NextResponse.json(
      { error: "La IA no ha respondido, vuelve a intentarlo", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
