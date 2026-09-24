import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { NotebookIntelligenceService } from "@/lib/services/notebook-intelligence";

export const maxDuration = 60;

export const GET = withAuthAndPermission("content:view", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const skuOrTopic = searchParams.get("query") || searchParams.get("sku") || "ECW510";
    const sourceIdsParam = searchParams.get("sourceIds");
    const sourceIds = sourceIdsParam ? sourceIdsParam.split(",") : undefined;

    const intelService = new NotebookIntelligenceService();
    const sources = intelService.getProductSources(skuOrTopic);
    const intelligence = intelService.synthesizeProductIntelligence(skuOrTopic, sourceIds);

    return NextResponse.json({
      success: true,
      sources,
      intelligence
    });
  } catch (error: any) {
    console.error("Error en API notebooklm intelligence:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar inteligencia de NotebookLM" },
      { status: 500 }
    );
  }
});

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const skuOrTopic = body.skuOrTopic || body.sku || "ECW510";
    const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds : undefined;

    const intelService = new NotebookIntelligenceService();
    const sources = intelService.getProductSources(skuOrTopic);
    const intelligence = intelService.synthesizeProductIntelligence(skuOrTopic, sourceIds);

    return NextResponse.json({
      success: true,
      sources,
      intelligence
    });
  } catch (error: any) {
    console.error("Error en API notebooklm intelligence:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar inteligencia de NotebookLM" },
      { status: 500 }
    );
  }
});
