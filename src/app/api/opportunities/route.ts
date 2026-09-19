import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { OpportunityRadarService } from "@/lib/services/opportunity-radar";

export const GET = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "3", 10);
    const excludedStr = searchParams.get("excluded") || "";
    const excludedSkus = excludedStr ? excludedStr.split(",").map(s => s.trim()) : [];
    const customDirective = searchParams.get("directive") || "";
    const shuffleSeed = parseInt(searchParams.get("shuffle") || "0", 10);
    const businessGoal = (searchParams.get("goal") || undefined) as any;

    const radar = new OpportunityRadarService();
    const opportunities = await radar.getDailyOpportunities({
      limitCount: limit,
      businessGoal,
      excludedSkus,
      customDirective,
      shuffleSeed
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: opportunities.length,
      opportunities
    });
  } catch (error: any) {
    console.error("[API_OPPORTUNITIES_ERROR]", error);
    return NextResponse.json(
      { error: "Error al calcular oportunidades de catálogo", details: error?.message },
      { status: 500 }
    );
  }
});

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      limit = 3,
      businessGoal,
      editorialControls,
      excludedSkus = [],
      replaceSku,
      currentSkus = [],
      customDirective,
      shuffleSeed = 0
    } = body;

    const radar = new OpportunityRadarService();

    // Si se solicita reemplazar una oportunidad específica
    if (replaceSku) {
      const replacement = await radar.getReplacementOpportunity(
        replaceSku,
        currentSkus,
        editorialControls,
        customDirective
      );

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        replacedSku: replaceSku,
        replacement
      });
    }

    const opportunities = await radar.getDailyOpportunities({
      limitCount: limit,
      businessGoal: businessGoal || editorialControls?.businessGoal,
      editorialControls,
      excludedSkus,
      customDirective,
      shuffleSeed
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: opportunities.length,
      opportunities
    });
  } catch (error: any) {
    console.error("[API_OPPORTUNITIES_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Error al recalcular oportunidades de catálogo", details: error?.message },
      { status: 500 }
    );
  }
});
