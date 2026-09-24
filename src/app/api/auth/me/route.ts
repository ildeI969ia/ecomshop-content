import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ROLE_PERMISSIONS } from "@/server/security/rbac";

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
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
});
