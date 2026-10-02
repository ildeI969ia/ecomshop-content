import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getAdminFirestore } from "@/server/config/firebase";
import { GESIO_CSV_FEED_URL, parseGesioCsvCatalog } from "@/lib/services/gesio-csv-parser";
import { crawlEcomshopProductUrls, fetchRawProductHtml, parseProductWithGemini } from "@/lib/services/ecomshop-live-crawler";
import { CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { sanitizeUndefined } from "@/server/repositories";

export const maxDuration = 300; // 5 minutos de tiempo máximo en Cloud Run para sincronización masiva

export const POST = withAuthAndPermission("content:create", async (req: NextRequest, user) => {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const mode = typeof body.mode === "string" ? body.mode : "feed"; // "feed" | "crawl" | "url"
    const maxItems = typeof body.maxItems === "number" ? Math.min(body.maxItems, 500) : 200;
    const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : null;

    const db = getAdminFirestore();
    const productsCollection = db.collection("products");

    // MODALIDAD 1: Sincronización ultrarrápida masiva mediante Feed CSV público oficial de Gesio
    if (mode === "feed" || !targetUrl) {
      console.log(`[CatalogSync] Descargando catálogo público completo desde Gesio CSV feed...`);
      const response = await fetch(GESIO_CSV_FEED_URL, {
        headers: {
          "User-Agent": "EcomSpain-CatalogEngine/3.0 (+https://marketing.ecomspain.com)"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Error HTTP al descargar feed Gesio: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      const allProducts = parseGesioCsvCatalog(csvText);
      const productsToSync = allProducts.slice(0, maxItems);

      console.log(`[CatalogSync] Gesio Feed parseado exitosamente: ${allProducts.length} productos detectados. Guardando ${productsToSync.length} en Firestore...`);

      // Guardar en lotes (batch writes de Firestore, max 500 ops por batch)
      const batchSize = 400;
      let syncedCount = 0;

      for (let i = 0; i < productsToSync.length; i += batchSize) {
        const chunk = productsToSync.slice(i, i + batchSize);
        const batch = db.batch();

        for (const prod of chunk) {
          const docRef = productsCollection.doc(prod.id);
          batch.set(docRef, {
            ...sanitizeUndefined(prod),
            updatedAt: new Date().toISOString(),
            syncedBy: user.email,
            source: "gesio_csv_feed"
          });
          syncedCount++;
        }

        await batch.commit();
      }

      // Registrar metadatos de sincronización
      await db.collection("catalog_metadata").doc("latest_sync").set({
        timestamp: new Date().toISOString(),
        syncedCount,
        totalFeedCount: allProducts.length,
        syncedBy: user.email,
        source: "gesio_csv_feed",
        durationMs: Date.now() - startTime
      });

      return NextResponse.json({
        success: true,
        message: `Sincronización masiva completada: ${syncedCount} de ${allProducts.length} productos procesados desde el feed CSV público de Gesio`,
        count: syncedCount,
        totalFeedCount: allProducts.length,
        durationMs: Date.now() - startTime
      });
    }

    // MODALIDAD 2: Sincronizar una única URL de producto con parseo profundo Gemini Flash
    if (targetUrl) {
      const html = await fetchRawProductHtml(targetUrl);
      const product = await parseProductWithGemini(html, targetUrl);

      await productsCollection.doc(product.id).set({
        ...sanitizeUndefined(product),
        updatedAt: new Date().toISOString(),
        syncedBy: user.email,
        source: "gemini_crawler"
      });

      return NextResponse.json({
        success: true,
        message: `Producto ${product.sku} sincronizado correctamente con enriquecimiento Gemini Flash`,
        product,
        durationMs: Date.now() - startTime
      });
    }

    // MODALIDAD 3: Crawling directo HTML fallback
    const links = await crawlEcomshopProductUrls(maxItems);
    const syncedProducts: CatalogProduct[] = [];

    for (const link of links) {
      try {
        const html = await fetchRawProductHtml(link.url);
        const product = await parseProductWithGemini(html, link.url);

        await productsCollection.doc(product.id).set({
          ...sanitizeUndefined(product),
          updatedAt: new Date().toISOString(),
          syncedBy: user.email,
          source: "html_crawler"
        });
        syncedProducts.push(product);
      } catch (err) {
        console.warn(`[CatalogSync] Error al crawling ${link.url}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Crawling completado: ${syncedProducts.length} productos actualizados desde ecomshop.es`,
      count: syncedProducts.length,
      durationMs: Date.now() - startTime
    });
  } catch (error: any) {
    console.error("[CatalogSync] Error en proceso de sincronización:", error);
    return NextResponse.json(
      { error: "Error durante la sincronización del catálogo", details: error.message },
      { status: 500 }
    );
  }
});
