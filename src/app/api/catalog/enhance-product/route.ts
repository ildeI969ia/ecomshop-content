import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { enhanceProductSheet, exportEnhancedSheetToHtml, exportEnhancedSheetToCsv } from "@/lib/services/product-sheet-enhancer";

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    // Timeout máximo de 20s como requiere el mandato
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout de 20s excedido en la generación de ficha")), 20000);
    });

    const processPromise = (async () => {
      const json = await req.json();
      const { sku, format } = json;

      if (!sku || typeof sku !== "string") {
        return NextResponse.json({ error: "SKU es obligatorio y debe ser un texto" }, { status: 400 });
      }

      // Guard FinOps
      const budgetCheck = await checkAiBudget(user.uid, user.role, 0.003);
      if (!budgetCheck.allowed) {
        return NextResponse.json(
          { error: "Presupuesto FinOps superado para mejora de fichas" },
          { status: 429 }
        );
      }

      const enhanced = await enhanceProductSheet(sku);

      // Registrar consumo FinOps
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
    })();

    return await Promise.race([processPromise, timeoutPromise]);
  } catch (error: any) {
    console.error("[API enhance-product] Error:", error);
    const isTimeout = error?.message?.includes("Timeout");
    return NextResponse.json(
      {
        error: isTimeout ? "La solicitud tardó más de 20s en procesarse" : "La IA no ha respondido, vuelve a intentarlo",
        details: error?.message || String(error)
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
});
