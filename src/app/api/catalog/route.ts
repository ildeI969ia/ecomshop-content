import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getCatalogMasterRecords } from "@/lib/catalog-master";

export const dynamic = "force-dynamic";

export const GET = withAuthAndPermission("content:view", async (_req: NextRequest) => {
  try {
    const records = await getCatalogMasterRecords();
    return NextResponse.json({
      success: true,
      total: records.length,
      source: {
        bucket: process.env.CATALOG_MASTER_BUCKET || "fotosecomspain",
        object: process.env.CATALOG_MASTER_OBJECT || "catalogo/catalogo_maestro.json"
      },
      data: records
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API_CATALOG_MASTER_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo cargar el catálogo maestro desde Google Cloud Storage.",
        code: "CATALOG_MASTER_LOAD_FAILED",
        details: message
      },
      { status: 503 }
    );
  }
});
