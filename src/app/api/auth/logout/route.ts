import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";

export const POST = withAuthAndPermission("content:view", async () => {
  const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" });
  response.cookies.delete("__session");
  return response;
});
