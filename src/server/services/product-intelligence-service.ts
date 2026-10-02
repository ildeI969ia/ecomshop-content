import type { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { getDynamicCatalogProduct } from "@/lib/catalog-server";
import { findCatalogProduct } from "@/lib/data/ecomshop-catalog";
import { buildFeedProductIntelligence } from "@/lib/services/feed-product-intelligence";

/**
 * Product Intelligence canónica.
 *
 * Mantiene el contrato histórico para consumidores existentes, pero la fuente
 * de verdad es siempre el producto del feed de EcomShop. No consulta NotebookLM
 * ni genera una ficha alternativa a partir de un SKU ambiguo.
 */
export class ProductIntelligenceService {
  async getOrGenerateCard(skuOrModel: string): Promise<ProductIntelligenceCard> {
    const requestedSku = skuOrModel.trim().toUpperCase();
    const product =
      (await getDynamicCatalogProduct(requestedSku)) ||
      findCatalogProduct(requestedSku);

    if (!product) {
      throw new Error(
        `PRODUCT_NOT_FOUND: Producto no encontrado en el feed/catálogo EcomShop para '${requestedSku}'.`
      );
    }

    return buildFeedProductIntelligence(product).card;
  }
}
