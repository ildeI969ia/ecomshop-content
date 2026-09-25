import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getAdminFirestore } from "@/server/config/firebase";
import { GlobalFinOpsSummary } from "@/types/finops";

export const maxDuration = 20;

function getMadridYearMonth(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export const GET = withAuthAndPermission("finops:manage", async (req: NextRequest, user) => {
  const startTime = Date.now();
  
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Acceso denegado. Se requieren privilegios de Administrador para acceder al resumen FinOps global.",
        code: "FORBIDDEN"
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetMonth = searchParams.get("month") || getMadridYearMonth();

  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    return NextResponse.json(
      { error: "Formato de mes inválido. Debe ser YYYY-MM." },
      { status: 400 }
    );
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("ai_usage_summary").doc(targetMonth);
    const docSnap = await docRef.get();

    let budgetLimitEur = 100.0;
    try {
      const configSnap = await db.collection("ai_budget_config").doc("default").get();
      if (configSnap.exists && typeof configSnap.data()?.defaultMonthlyLimitEur === "number") {
        budgetLimitEur = configSnap.data()?.defaultMonthlyLimitEur;
      }
    } catch {
      // Fallback
    }

    if (!docSnap.exists) {
      const emptySummary: GlobalFinOpsSummary = {
        month: targetMonth,
        totalCostEur: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalImageGenerations: 0,
        byUser: {},
        byModel: {},
        budgetLimitEur,
        monthEndProjectionEur: 0,
        avgCostPerCampaignEur: 0,
        lastUpdated: new Date().toISOString()
      };
      return NextResponse.json(emptySummary);
    }

    const data = docSnap.data() || {};
    const totalCostEur = Number(data.totalCostEur || 0);

    const now = new Date();
    const currentYearMonth = getMadridYearMonth(now);
    let monthEndProjectionEur = totalCostEur;

    if (targetMonth === currentYearMonth) {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      monthEndProjectionEur = dayOfMonth > 0 ? (totalCostEur / dayOfMonth) * daysInMonth : totalCostEur;
    }

    let totalOps = 0;
    const byUserObj = data.byUser || {};
    Object.values(byUserObj).forEach((u: any) => {
      totalOps += Number(u.operationsCount || 0);
    });

    const avgCostPerCampaignEur = totalOps > 0 ? totalCostEur / Math.max(1, Math.round(totalOps / 5)) : 0;

    const summary: GlobalFinOpsSummary = {
      month: targetMonth,
      totalCostEur,
      totalInputTokens: Number(data.totalInputTokens || 0),
      totalOutputTokens: Number(data.totalOutputTokens || 0),
      totalImageGenerations: Number(data.totalImageGenerations || 0),
      byUser: data.byUser || {},
      byModel: data.byModel || {},
      budgetLimitEur,
      monthEndProjectionEur: Math.round(monthEndProjectionEur * 100) / 100,
      avgCostPerCampaignEur: Math.round(avgCostPerCampaignEur * 1000) / 1000,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    };

    const elapsed = Date.now() - startTime;
    if (elapsed > 15000) {
      console.warn(`[FinOps Summary] Warning: endpoint execution took ${elapsed}ms`);
    }

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[FinOps Summary Error]:", err);
    return NextResponse.json(
      { error: "Error al obtener el resumen FinOps global", details: err?.message },
      { status: 500 }
    );
  }
});
