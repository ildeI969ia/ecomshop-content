import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getDynamicCatalogProduct } from "@/lib/catalog-server";
import { findCatalogProductExact } from "@/lib/data/ecomshop-catalog";
import { buildFeedProductIntelligence } from "@/lib/services/feed-product-intelligence";
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

    const product =
      (await getDynamicCatalogProduct(parsed.data.skuOrModel)) ||
      findCatalogProductExact(parsed.data.skuOrModel);

    if (!product) {
      return NextResponse.json(
        { error: "PRODUCT_NOT_FOUND", requestedSku: parsed.data.skuOrModel },
        { status: 404 }
      );
    }

    const card = buildFeedProductIntelligence(product).card;

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
