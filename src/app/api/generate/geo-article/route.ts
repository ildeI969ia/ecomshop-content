import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { generateB2BContent } from "@/lib/generator";
import { findCatalogProduct } from "@/lib/data/ecomshop-catalog";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { sku, topicTitle, angleSelected, targetAudience = "Instalador B2B" } = body;

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.002);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Presupuesto de IA superado para generación de artículo GEO." },
        { status: 429 }
      );
    }

    const effectiveSku = sku || (angleSelected && typeof angleSelected === "object" ? angleSelected.sku : "");
    const product = effectiveSku ? findCatalogProduct(effectiveSku) : undefined;
    const resolvedTitle = topicTitle || angleSelected?.title || (product ? `${product.brand} ${product.model}: Solución de Conectividad B2B` : "Análisis Técnico B2B");

    // Ejecutar el motor unificado de generación B2B Mandato 2
    const content = await generateB2BContent({
      sku: effectiveSku,
      productName: product ? `${product.brand} ${product.model}` : effectiveSku,
      bundleSku: product?.recommendedBundle?.sku || "",
      topic: resolvedTitle,
      editorialThesis: resolvedTitle,
      topicTitle: resolvedTitle,
      category: product?.category || "general",
      targetAudience: typeof angleSelected === "object" && angleSelected?.targetAudience ? angleSelected.targetAudience : targetAudience,
      customNotes: typeof angleSelected === "object" && angleSelected?.hook ? `Ángulo: ${angleSelected.title}. Gancho: ${angleSelected.hook}` : ""
    });

    const qualityReport = validateEditorialQuality(content, targetAudience);

    const geoData = {
      title: content.blog?.title || content.geo?.title || resolvedTitle,
      metaDescription: content.blog?.metaDescription || content.geo?.metaDescription || "",
      htmlContent: content.blog?.htmlContent || content.geo?.htmlContent || "",
      jsonLd: content.geo?.jsonLd || JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product ? `${product.brand} ${product.model}` : resolvedTitle,
        "sku": effectiveSku,
        "brand": { "@type": "Brand", "name": product?.brand || "EcomShop" }
      }, null, 2),
      markdownContent: content.geo?.markdownContent || `# ${resolvedTitle}\n\n${content.blog?.htmlContent || ""}`
    };

    await recordAiUsage(user.uid, "generate_geo_article", 1200, 2500, 0);

    return NextResponse.json({
      success: true,
      data: geoData,
      editorialThesis: content.editorialThesis,
      outline: content.outline,
      qualityReport,
      tokensUsed: 3700
    });
  } catch (err: any) {
    console.error("[API GenerateGeoArticle Error]:", err);
    return NextResponse.json(
      { error: "Error al generar artículo GEO", details: err?.message || String(err) },
      { status: 500 }
    );
  }
});
