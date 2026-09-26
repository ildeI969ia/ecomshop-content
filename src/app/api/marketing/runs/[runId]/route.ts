import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const repository = new MarketingRunRepository();

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const runId = url.pathname.split("/").pop();

    if (!runId) {
      return NextResponse.json({ error: "runId requerido" }, { status: 400 });
    }

    const userWorkspace = user.role === "ADMIN" ? undefined : user.workspaceId;
    const run = await repository.findRunById(runId, userWorkspace);
    if (!run) {
      return NextResponse.json({ error: `Run '${runId}' no encontrado` }, { status: 404 });
    }

    const pkg = await repository.findPackageByRunId(runId, userWorkspace);

    return NextResponse.json({
      run,
      package: pkg
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
