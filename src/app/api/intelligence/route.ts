import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ProductIntelligenceService } from "@/server/services/product-intelligence-service";
import { AuditRepository } from "@/server/repositories";
import { z } from "zod";

const QuerySchema = z.object({
  skuOrModel: z.string().min(2),
}).strict();

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const json = await req.json();
    const parsed = QuerySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const intelService = new ProductIntelligenceService();
    const card = await intelService.getOrGenerateCard(
      parsed.data.skuOrModel
    );

    try {
      const auditRepo = new AuditRepository();
      await auditRepo.record({
        id: `audit-intel-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "PRODUCT_INTELLIGENCE",
        entityId: card.product.sku,
        diff: { model: card.product.model, brand: card.product.brand },
        source: "UI"
      });
    } catch (e) {
      console.warn("Could not persist audit record (non-fatal):", e);
    }

    return NextResponse.json(card);
  } catch (error: any) {
    console.error("Error in /api/intelligence:", error);
    return NextResponse.json(
      { error: "Error procesando ficha de inteligencia de producto", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
