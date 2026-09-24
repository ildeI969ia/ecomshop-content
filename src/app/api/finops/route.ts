import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { FinOpsRepository } from "@/server/repositories";

export const GET = withAuthAndPermission("finops:view", async (req: NextRequest) => {
  const repo = new FinOpsRepository();
  try {
    const records = await repo.listRecent(100);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const monthlyTotal = await repo.getMonthlyTotalCost(monthStart);

    return NextResponse.json({
      records,
      monthlyTotalEur: monthlyTotal,
      budgetCapEur: 50.00,
      daysRemaining: 16
    });
  } catch (err: any) {
    return NextResponse.json({
      records: [],
      monthlyTotalEur: 0,
      budgetCapEur: 50.00,
      error: err?.message
    }, { status: 200 });
  }
});
