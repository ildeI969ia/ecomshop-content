import { getAdminFirestore } from "@/server/config/firebase";
import { CatalogProduct } from "./data/ecomshop-catalog";
import { CatalogDevice, catalogProductToCatalogDevice, getCatalogDevice } from "./catalog";
import { findCatalogProductExact } from "./data/ecomshop-catalog";
import { getCatalogMasterRecord, mergeMasterIntoCatalogProduct } from "./catalog-master";

/**
 * Consulta un dispositivo de catálogo resolviendo de forma asíncrona contra Firestore
 * con fallback instantáneo al catálogo canónico si no está disponible.
 * SOLO debe ser invocado desde código de servidor (Server Components o API Routes).
 */
export async function getDynamicCatalogDevice(sku: string): Promise<CatalogDevice | undefined> {
  if (!sku) return undefined;
  try {
    const db = getAdminFirestore();
    const docSnap = await db.collection("products").doc(sku.toLowerCase()).get();
    if (docSnap.exists) {
      const prod = docSnap.data() as CatalogProduct;
      return catalogProductToCatalogDevice(prod);
    }
    const querySnap = await db.collection("products").where("sku", "==", sku.toUpperCase()).limit(1).get();
    if (!querySnap.empty) {
      const prod = querySnap.docs[0].data() as CatalogProduct;
      return catalogProductToCatalogDevice(prod);
    }
  } catch (err) {
    // Fallback al catálogo estático si Firestore no responde
  }
  return getCatalogDevice(sku);
}

/**
 * Devuelve el producto completo sincronizado desde el feed de EcomShop.
 * Es la fuente primaria para generación: no cae a NotebookLM.
 */
function normalizeSku(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function isCatalogProductIdentityAligned(product: unknown, requestedSku: string): product is CatalogProduct {
  if (!product || typeof product !== "object") return false;
  const candidate = product as Partial<CatalogProduct>;
  const requested = normalizeSku(requestedSku);
  return requested.length > 0 && normalizeSku(candidate.sku) === requested;
}

/**
 * Resolución estricta del producto sincronizado.
 *
 * El ID del documento Firestore NO es suficiente para establecer Product Truth:
 * también se valida el campo sku almacenado. Si docId=ecs1552 pero payload.sku=ECS1552FP,
 * el registro está corrupto/mezclado y se rechaza en vez de propagar la identidad incorrecta.
 */
export async function getDynamicCatalogProduct(sku: string): Promise<CatalogProduct | undefined> {
  const cleanSku = normalizeSku(sku);
  if (!cleanSku) return undefined;

  try {
    const db = getAdminFirestore();
    const docSnap = await db.collection("products").doc(cleanSku.toLowerCase()).get();

    if (docSnap.exists) {
      const candidate = docSnap.data();
      if (isCatalogProductIdentityAligned(candidate, cleanSku)) {
        return candidate;
      }
      console.error("[CatalogServer] PRODUCT_IDENTITY_MISMATCH", {
        requestedSku: cleanSku,
        documentId: docSnap.id,
        storedSku: normalizeSku(candidate?.sku)
      });
    }

    const querySnap = await db.collection("products").where("sku", "==", cleanSku).limit(5).get();
    for (const doc of querySnap.docs) {
      const candidate = doc.data();
      if (isCatalogProductIdentityAligned(candidate, cleanSku)) {
        return candidate;
      }
    }

    if (!querySnap.empty) {
      console.error("[CatalogServer] PRODUCT_QUERY_IDENTITY_MISMATCH", {
        requestedSku: cleanSku,
        candidateDocumentIds: querySnap.docs.map((doc) => doc.id),
        candidateSkus: querySnap.docs.map((doc) => normalizeSku(doc.data()?.sku))
      });
    }
  } catch (error) {
    console.warn("[CatalogServer] No se pudo leer el producto del feed sincronizado:", error);
  }

  try {
    const master = await getCatalogMasterRecord(cleanSku);
    if (master) {
      const base = findCatalogProductExact(cleanSku);
      if (base) return mergeMasterIntoCatalogProduct(base, master);
    }
  } catch (masterError) {
    console.warn("[CatalogServer] Catálogo maestro GCS no disponible; se mantiene fallback canónico:", masterError);
  }

  return undefined;
}
