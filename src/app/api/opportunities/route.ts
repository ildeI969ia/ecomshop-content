import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { OpportunityRadarService } from "@/lib/services/opportunity-radar";

export const GET = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "3", 10);

    const radar = new OpportunityRadarService();
    const opportunities = await radar.getDailyOpportunities(limit);

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
