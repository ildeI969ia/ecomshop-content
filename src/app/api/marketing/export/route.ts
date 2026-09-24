import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const repository = new MarketingRunRepository();

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export const GET = withAuthAndPermission("content:view", async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    const packages = await repository.listPackagesByWorkspace(200);

    if (format === "csv") {
      const headers = [
        "SKU",
        "Brand",
        "Product",
        "Category",
        "Slug",
        "Meta Title",
        "Meta Description",
        "Primary Keyword",
        "Positioning",
        "Short Description",
        "CTA",
        "Quality Status",
        "Content Version",
        "Generated At"
      ];

      const rows = packages.map((pkg) => [
        escapeCsv(pkg.product.sku),
        escapeCsv(pkg.product.brand),
        escapeCsv(pkg.product.name),
        escapeCsv(pkg.product.deviceType),
        escapeCsv(pkg.seo.slug),
        escapeCsv(pkg.seo.title),
        escapeCsv(pkg.seo.metaDescription),
        escapeCsv(pkg.seo.primaryKeyword),
        escapeCsv(pkg.positioning),
        escapeCsv(pkg.shortDescription),
        escapeCsv(pkg.cta.primary),
        escapeCsv(pkg.quality.overallStatus),
        escapeCsv(pkg.contentVersion),
        escapeCsv(pkg.createdAt)
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="marketing-packages-${Date.now()}.csv"`
        }
      });
    }

    // Default JSON export
    return NextResponse.json({
      total: packages.length,
      packages
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
