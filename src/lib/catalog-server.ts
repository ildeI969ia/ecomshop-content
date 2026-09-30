import { getAdminFirestore } from "@/server/config/firebase";
import { CatalogProduct } from "./data/ecomshop-catalog";
import { CatalogDevice, catalogProductToCatalogDevice, getCatalogDevice } from "./catalog";

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
