import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const repository = new MarketingRunRepository();

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const sku = url.searchParams.get("sku");

    if (!user.workspaceId) {
      return NextResponse.json(
        { error: "INVALID_WORKSPACE", message: "workspaceId es obligatorio" },
        { status: 400 }
      );
    }

    if (sku) {
      const packages = await repository.listPackagesBySku(sku, user.workspaceId);
      packages.sort((a, b) => (b.contentVersion || 0) - (a.contentVersion || 0));
      return NextResponse.json({
        sku,
        workspaceId: user.workspaceId,
        total: packages.length,
        packages
      });
    }

    const packages = await repository.listPackagesByWorkspace(user.workspaceId, 200);
    packages.sort((a, b) => (b.contentVersion || 0) - (a.contentVersion || 0));
    return NextResponse.json({
      workspaceId: user.workspaceId,
      total: packages.length,
      packages
    });
  } catch (error: any) {
    console.error("[API marketing/packages] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error?.message || "Error al listar paquetes" },
      { status: 500 }
    );
  }
});
