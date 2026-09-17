import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { ProductIntelligenceService } from "@/server/services/product-intelligence-service";
import { AuditRepository } from "@/server/repositories";
import { z } from "zod";

const QuerySchema = z.object({
  skuOrModel: z.string().min(2),
  apiKey: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Requiere sesión corporativa @ecomspain.com" },
        { status: 401 }
      );
    }

    if (!authorizePermission(user, "ai:execute")) {
      return NextResponse.json(
        { error: "Su rol no tiene autorización para ejecutar el motor de inteligencia" },
        { status: 403 }
      );
    }

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
      parsed.data.skuOrModel,
      process.env.GEMINI_API_KEY || parsed.data.apiKey
    );

    // Auditoría
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
}
