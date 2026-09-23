/**
 * Servicio de descubrimiento de productos via NotebookLM.
 * Interroga las fuentes de NotebookLM para extraer todos los productos
 * mencionados y compara contra el catálogo canónico para detectar discrepancias.
 */

import { ECOMSHOP_FULL_CATALOG, type CatalogProduct } from "@/lib/data/ecomshop-catalog";

export interface DiscoveredProduct {
  sku: string;
  name: string;
  brand: string;
  source: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface DiscoveryReport {
  timestamp: string;
  catalogCount: number;
  discoveredCount: number;
  newProducts: DiscoveredProduct[];
  missingFromNotebook: string[];
  matchedProducts: string[];
}

/**
 * Compara una lista de SKUs descubiertos por NotebookLM contra el catálogo canónico.
 */
export function compareWithCatalog(discovered: DiscoveredProduct[]): DiscoveryReport {
  const catalogSkus = new Set(ECOMSHOP_FULL_CATALOG.map((p) => p.sku.toUpperCase()));
  const discoveredSkuSet = new Set(discovered.map((d) => d.sku.toUpperCase()));

  const newProducts = discovered.filter((d) => !catalogSkus.has(d.sku.toUpperCase()));
  const matchedProducts = discovered
    .filter((d) => catalogSkus.has(d.sku.toUpperCase()))
    .map((d) => d.sku);
  const missingFromNotebook = ECOMSHOP_FULL_CATALOG
    .filter((p) => !discoveredSkuSet.has(p.sku.toUpperCase()))
    .map((p) => p.sku);

  return {
    timestamp: new Date().toISOString(),
    catalogCount: ECOMSHOP_FULL_CATALOG.length,
    discoveredCount: discovered.length,
    newProducts,
    missingFromNotebook,
    matchedProducts,
  };
}

/**
 * Construye el prompt de interrogación para NotebookLM.
 * Diseñado para extraer una lista exhaustiva de productos vendidos por EcomShop.
 */
export function buildDiscoveryPrompt(): string {
  return `Necesito una lista EXHAUSTIVA de todos los productos, equipos y dispositivos de networking 
que se venden en EcomShop.es / EcomSpain. Para cada producto encontrado, proporciona:

1. SKU o modelo exacto (e.g. ECW536, ECS2512FP)
2. Nombre completo del producto
3. Marca / fabricante
4. Tipo de dispositivo (Access Point, Switch, Gateway, Router, Accesorio, etc.)
5. Nivel de confianza en la información (ALTO / MEDIO / BAJO)

Formatea la respuesta como una lista JSON con los campos: sku, name, brand, type, confidence.
Incluye TODOS los productos que encuentres en las fuentes disponibles, incluyendo accesorios, 
transceptores SFP, inyectores PoE, y cualquier otro hardware.`;
}

/**
 * Parsea la respuesta de NotebookLM para extraer productos descubiertos.
 * Intenta extraer JSON del texto de respuesta.
 */
export function parseDiscoveryResponse(responseText: string): DiscoveredProduct[] {
  try {
    // Intenta encontrar un array JSON en la respuesta
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: Record<string, unknown>) => item.sku && item.name)
      .map((item: Record<string, unknown>) => ({
        sku: String(item.sku || "").trim().toUpperCase(),
        name: String(item.name || "").trim(),
        brand: String(item.brand || "Desconocido").trim(),
        source: "NotebookLM Discovery",
        confidence: (["HIGH", "MEDIUM", "LOW"].includes(String(item.confidence || "").toUpperCase())
          ? String(item.confidence).toUpperCase()
          : "LOW") as DiscoveredProduct["confidence"],
      }));
  } catch {
    return [];
  }
}
