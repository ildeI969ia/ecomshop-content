import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { generateB2BContent } from "@/lib/generator";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const sku = typeof body.sku === "string" ? body.sku.trim() : "";

    if (!sku) {
      return NextResponse.json(
        { error: "SKU_REQUIRED", message: "El parámetro SKU es obligatorio." },
        { status: 400 }
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.0045);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct
        },
        { status: 429 }
      );
    }

    const content = await generateB2BContent({
      sku,
      workspaceId: user.workspaceId,
      customNotes: typeof body.customPrompt === "string" ? body.customPrompt : ""
    });

    const jsonLdScriptTag = content.geo?.jsonLd
      ? `<script type="application/ld+json">\n${content.geo.jsonLd}\n</script>`
      : `<script type="application/ld+json">\n${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: content.blog?.title || content.topicTitle,
          description: content.blog?.metaDescription || "",
          url: `https://ecomshop.es/productos/${sku.toLowerCase()}`
        }, null, 2)}\n</script>`;

    let jsonLdObject: unknown;
    try {
      jsonLdObject = JSON.parse(content.geo?.jsonLd || jsonLdScriptTag
        .replace(/^<script[^>]*>\s*/i, "")
        .replace(/\s*<\/script>$/i, ""));
    } catch {
      jsonLdObject = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: content.blog?.title || content.topicTitle,
        description: content.blog?.metaDescription || ""
      };
    }

    try {
      await recordAiUsage(
        user.uid,
        "schema_jsonld_generation",
        content.usageMetadata?.promptTokenCount ?? 0,
        content.usageMetadata?.candidatesTokenCount ?? 0,
        0
      );
    } catch (usageErr) {
      console.error("[API Schema JSON-LD] Warning: Falló el registro de uso de IA:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        sku,
        jsonLdScriptTag,
        jsonLdObject,
        schemaTypesIncluded: Array.isArray((jsonLdObject as { "@graph"?: unknown[] })?.["@graph"])
          ? (jsonLdObject as { "@graph": Array<{ "@type"?: string | string[] }> })["@graph"]
              .flatMap((item) => Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]])
              .filter((type): type is string => typeof type === "string")
          : [typeof (jsonLdObject as { "@type"?: unknown })?.["@type"] === "string" ? (jsonLdObject as { "@type": string })["@type"] : "TechArticle"],
        faqCount: Array.isArray((jsonLdObject as { "@graph"?: Array<{ "@type"?: unknown; mainEntity?: unknown[] }> })?.["@graph"])
          ? ((jsonLdObject as { "@graph": Array<{ "@type"?: unknown; mainEntity?: unknown[] }> })["@graph"].find((item) => item["@type"] === "FAQPage")?.mainEntity?.length || 0)
          : 0
      },
      editorialDecision: content.editorialDecision,
      qualityStatus: content.status,
      factCheckScore: content.factCheckScore
    });
  } catch (err: unknown) {
    console.error("[API Schema JSON-LD Error]:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});
