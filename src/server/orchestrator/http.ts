import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import type { Permission } from "@/server/security/rbac";

export async function requireOrchestratorPermission(req: NextRequest, permission: Permission): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof authenticateServerRequest>>> } | NextResponse
> {
  const user = await authenticateServerRequest(req);
  if (!user || !authorizePermission(user, permission)) {
    return NextResponse.json({ error: "FORBIDDEN", code: "ORCHESTRATOR_FORBIDDEN" }, { status: 403 });
  }
  return { user };
}
