import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { FinOpsRepository } from "@/server/repositories";

export const GET = withAuthAndPermission("finops:view", async (req: NextRequest) => {
  const repo = new FinOpsRepository();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod";

  try {
    const records = await repo.listRecent(100);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const estimatedCostEur = await repo.getMonthlyTotalCost(monthStart);

    let billedCostEur: number | null = null;
    let reconciliationStatus: "RECONCILED" | "PARTIAL" | "UNAVAILABLE" = "UNAVAILABLE";
    let billedConfidence: "VERIFIED" | "ESTIMATED" | "UNAVAILABLE" = "ESTIMATED";
    let lastBillingSync: string | null = null;

    try {
      const { fetchCloudBillingSnapshot } = await import("@/server/services/cloud-billing");
      const billingSnapshot = await fetchCloudBillingSnapshot(projectId);
      billedCostEur = billingSnapshot.totalEur;
      lastBillingSync = billingSnapshot.fetchedAt;
      billedConfidence = "VERIFIED";
      reconciliationStatus = "RECONCILED";
    } catch {
      // Si Billing API falla, billedCostEur se mantiene null y reconciliationStatus = "UNAVAILABLE"
      billedConfidence = "UNAVAILABLE";
      reconciliationStatus = "UNAVAILABLE";
    }

    const differenceEur = billedCostEur !== null ? Math.round((billedCostEur - estimatedCostEur) * 1000000) / 1000000 : null;
    const coveragePercentage = billedCostEur !== null && billedCostEur > 0
      ? Math.round((estimatedCostEur / billedCostEur) * 10000) / 100
      : (estimatedCostEur > 0 ? 100 : 0);

    return NextResponse.json({
      records,
      monthlyTotalEur: estimatedCostEur,
      estimatedCostEur,
      billedCostEur,
      differenceEur,
      coveragePercentage,
      lastBillingSync,
      reconciliationStatus,
      confidence: {
        estimated: "ESTIMATED",
        billed: billedConfidence
      },
      budgetCapEur: 50.00,
      daysRemaining: 16
    });
  } catch (err: any) {
    console.error("[api/finops GET] Error en consulta de FinOps:", err);
    return NextResponse.json(
      {
        status: "DATA_UNAVAILABLE",
        code: "BILLING_DATA_UNAVAILABLE",
        error: `Datos de facturación y consumo no disponibles: ${err?.message || err}`,
        projectId,
      },
      { status: 503 }
    );
  }
});
