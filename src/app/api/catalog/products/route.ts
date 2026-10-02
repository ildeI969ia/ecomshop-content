import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getAdminFirestore } from "@/server/config/firebase";
import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { sanitizeUndefined } from "@/server/repositories";

export const dynamic = "force-dynamic";

export const GET = withAuthAndPermission("content:view", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const family = (searchParams.get("family") || "ALL").toUpperCase().trim();
    const limitCount = parseInt(searchParams.get("limit") || "100", 10);

    const db = getAdminFirestore();
    const snapshot = await db.collection("products").limit(limitCount).get();

    let products: CatalogProduct[] = [];

    // Si Firestore contiene productos sincronizados dinámicamente, usarlos como fuente primaria
    if (!snapshot.empty) {
      const seenSkus = new Set<string>();
      products = snapshot.docs
        .map((doc) => ({ docId: doc.id, product: doc.data() as CatalogProduct }))
        .filter(({ docId, product }) => {
          const docSku = docId.trim().toUpperCase();
          const productSku = typeof product.sku === "string" ? product.sku.trim().toUpperCase() : "";
          const aligned = Boolean(productSku) && productSku === docSku;
          if (!aligned) {
            console.error("[CatalogProducts] PRODUCT_IDENTITY_MISMATCH", {
              documentId: doc.id,
              storedSku: productSku
            });
            return false;
          }
          if (seenSkus.has(productSku)) return false;
          seenSkus.add(productSku);
          return true;
        })
        .map(({ product }) => product);
    } else {
      // Fallback inicial con inicialización perezosa: guardar el catálogo canónico inicial en Firestore
      products = ECOMSHOP_FULL_CATALOG;

      // Sembrar asíncronamente en background si está vacío para tener siempre persistencia en Firestore
      (async () => {
        try {
          const batch = db.batch();
          for (const p of ECOMSHOP_FULL_CATALOG.slice(0, 45)) {
            const docRef = db.collection("products").doc(p.id);
            batch.set(docRef, {
              ...sanitizeUndefined(p),
              updatedAt: new Date().toISOString(),
              source: "seed"
            });
          }
          await batch.commit();
        } catch (e) {
          console.warn("[CatalogProducts] Error sembrando productos iniciales:", e);
        }
      })();
    }

    // Filtrar por texto de búsqueda si se proporcionó
    if (query) {
      products = products.filter(
        (p) =>
          p.sku.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Filtrar por familia
    if (family !== "ALL") {
      products = products.filter((p) => {
        switch (family) {
          case "WIFI":
            return p.deviceType === "ACCESS_POINT" || p.deviceType === "CPE_PTP";
          case "SWITCHES":
            return p.deviceType === "SWITCH";
          case "GATEWAYS":
            return p.deviceType === "GATEWAY" || p.deviceType === "ROUTER_CELLULAR";
          case "FIBER":
            return p.deviceType === "FIBER_OPTIC" || p.deviceType === "TESTER" || p.deviceType === "ACCESSORY" || p.deviceType === "CCTV_CAMERA";
          default:
            return true;
        }
      });
    }

    // Leer metadatos de sincronización
    let lastSync = null;
    try {
      const metaDoc = await db.collection("catalog_metadata").doc("latest_sync").get();
      if (metaDoc.exists) {
        lastSync = metaDoc.data();
      }
    } catch {
      // Omitir si no existe
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      lastSync
    });
  } catch (error: any) {
    console.error("[API_CATALOG_PRODUCTS_ERROR]", error);
    return NextResponse.json(
      { error: "Error al consultar catálogo de productos", details: error.message },
      { status: 500 }
    );
  }
});
