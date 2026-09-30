import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getAdminFirestore } from "@/server/config/firebase";
import { crawlEcomshopProductUrls, fetchRawProductHtml, parseProductWithGemini } from "@/lib/services/ecomshop-live-crawler";
import { CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { sanitizeUndefined } from "@/server/repositories";

export const maxDuration = 300; // 5 minutos de tiempo máximo en Cloud Run para rastrear ecomshop.es

export const POST = withAuthAndPermission("content:create", async (req: NextRequest, user) => {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const maxItems = typeof body.maxItems === "number" ? Math.min(body.maxItems, 50) : 30;
    const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : null;

    const db = getAdminFirestore();
    const productsCollection = db.collection("products");

    // CASO A: Sincronizar una única URL específica de ecomshop.es
    if (targetUrl) {
      const html = await fetchRawProductHtml(targetUrl);
      const product = await parseProductWithGemini(html, targetUrl);

      await productsCollection.doc(product.id).set({
        ...sanitizeUndefined(product),
        updatedAt: new Date().toISOString(),
        syncedBy: user.email,
        source: "ecomshop.es"
      });

      return NextResponse.json({
        success: true,
        message: `Producto ${product.sku} sincronizado correctamente desde ecomshop.es`,
        product,
        durationMs: Date.now() - startTime
      });
    }

    // CASO B: Rastrear y sincronizar catálogo completo desde ecomshop.es
    const links = await crawlEcomshopProductUrls(maxItems);
    if (links.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron descubrir enlaces de productos en ecomshop.es" },
        { status: 502 }
      );
    }

    const syncedProducts: CatalogProduct[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    // Procesar secuencialmente o en pequeños lotes de 3 para respetar rate limits de Vertex AI / Gemini
    for (const link of links) {
      try {
        const html = await fetchRawProductHtml(link.url);
        const product = await parseProductWithGemini(html, link.url);

        await productsCollection.doc(product.id).set({
          ...sanitizeUndefined(product),
          updatedAt: new Date().toISOString(),
          syncedBy: user.email,
          source: "ecomshop.es"
        });

        syncedProducts.push(product);
      } catch (err: any) {
        console.warn(`[CatalogSync] Error al procesar ${link.url}:`, err);
        errors.push({ url: link.url, error: err.message || String(err) });
      }
    }

    // Registrar metadatos de la última sincronización global
    await db.collection("catalog_metadata").doc("latest_sync").set({
      timestamp: new Date().toISOString(),
      syncedCount: syncedProducts.length,
      errorsCount: errors.length,
      syncedBy: user.email,
      durationMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${syncedProducts.length} productos actualizados desde ecomshop.es`,
      count: syncedProducts.length,
      products: syncedProducts,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: Date.now() - startTime
    });
  } catch (error: any) {
    console.error("[CatalogSync] Error general de sincronización:", error);
    return NextResponse.json(
      { error: "Error durante la sincronización con ecomshop.es", details: error.message },
      { status: 500 }
    );
  }
});
