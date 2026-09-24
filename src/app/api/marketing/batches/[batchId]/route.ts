import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const repository = new MarketingRunRepository();

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const batchId = url.pathname.split("/").pop();

    if (!batchId) {
      return NextResponse.json({ error: "batchId requerido" }, { status: 400 });
    }

    const batch = await repository.findBatchById(batchId);

    if (!batch) {
      return NextResponse.json({ error: "Batch no encontrado" }, { status: 404 });
    }

    if (batch.workspaceId && batch.workspaceId !== (user.workspaceId || "default-ecomspain")) {
      return NextResponse.json({ error: "Acceso denegado a este workspace" }, { status: 403 });
    }

    return NextResponse.json({ batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
