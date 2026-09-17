import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import { ROLE_PERMISSIONS } from "@/server/security/rbac";

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      uid: user.uid,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      permissions: ROLE_PERMISSIONS[user.role] || []
    }
  });
}
