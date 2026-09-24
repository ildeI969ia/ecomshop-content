import { ECOMSHOP_FULL_CATALOG } from "@/lib/data/ecomshop-catalog";

/**
 * Motor de Enlazado Interno B2B para EcomShop.es
 * Mapea términos técnicos de telecomunicaciones y SKUs de hardware
 * a URLs canónicas oficiales de ecomshop.es sin saturar el texto ni romper etiquetas HTML.
 */

export interface EcomLinkEntry {
  keyword: string;
  url: string;
  sku?: string;
  title: string;
  category: "ap" | "switch" | "sfp" | "gateway" | "poe" | "support";
}

/**
 * Entradas dinámicas generadas desde el catálogo canónico oficial de 27 SKUs
 */
export const CANONICAL_27_SKU_LINKS: EcomLinkEntry[] = ECOMSHOP_FULL_CATALOG.map((prod) => {
  const catMap: Record<string, "ap" | "switch" | "sfp" | "gateway" | "poe" | "support"> = {
    ACCESS_POINT: "ap",
    SWITCH: "switch",
    GATEWAY: "gateway",
    ROUTER_CELLULAR: "gateway",
    FIBER_OPTIC: "sfp",
    TESTER: "support",
    ACCESSORY: "poe"
  };
  return {
    keyword: prod.sku,
    url: prod.url || `https://www.ecomshop.es/${prod.sku.toLowerCase()}`,
    sku: prod.sku,
    title: `${prod.brand} ${prod.model || prod.sku} - ${prod.name}`,
    category: catMap[prod.deviceType] || "support"
  };
});

export const ECOM_INTERNAL_CATALOG: EcomLinkEntry[] = [
  // Puntos de acceso Wi-Fi 7 y Cloud
  {
    keyword: "ECW536",
    url: "https://www.ecomshop.es/engenius-ecw536",
    sku: "ECW536",
    title: "EnGenius Cloud Wi-Fi 7 ECW536 Tri-Band 10GbE",
    category: "ap"
  },
  {
    keyword: "ECW526",
    url: "https://www.ecomshop.es/engenius-ecw526",
    sku: "ECW526",
    title: "EnGenius ECW526 Wi-Fi 7 Interior Compacto 2.5GbE",
    category: "ap"
  },
  {
    keyword: "ECW546",
    url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
    sku: "ECW546",
    title: "EnGenius ECW546 Wi-Fi 7 Exterior IP67",
    category: "ap"
  },
  {
    keyword: "EnGenius Cloud",
    url: "https://www.ecomshop.es/engenius-cloud",
    title: "Plataforma de Gestión EnGenius Cloud Enterprise Sin Licencias",
    category: "ap"
  },

  // Switches Multi-Gigabit y PoE
  {
    keyword: "ECS2512FP",
    url: "https://www.ecomshop.es/engenius-ecs2512fp",
    sku: "ECS2512FP",
    title: "Switch EnGenius ECS2512FP 8x 2.5GbE PoE++ y 4x 10G SFP+",
    category: "switch"
  },
  {
    keyword: "ECS1528FP",
    url: "https://www.ecomshop.es/engenius-ecs1528fp",
    sku: "ECS1528FP",
    title: "Switch EnGenius ECS1528FP 24x GbE PoE+ (410W) y 4x 10G SFP+",
    category: "switch"
  },
  {
    keyword: "ECS5512FP",
    url: "https://www.ecomshop.es/engenius-ecs5512fp",
    sku: "ECS5512FP",
    title: "Switch EnGenius ECS5512FP Agregación 8x 10G Base-T y 4x 10G SFP+",
    category: "switch"
  },
  {
    keyword: "Switches PoE Multi-Gigabit",
    url: "https://www.ecomshop.es/engenius-ecs2512fp",
    title: "Gama de Switches PoE Multi-Gigabit para Wi-Fi 7",
    category: "switch"
  },
  {
    keyword: "PoE++ 802.3bt",
    url: "https://www.ecomshop.es/guias-poe",
    title: "Switches e Inyectores con estándar PoE++ 802.3bt de alta potencia",
    category: "poe"
  },

  // Transceptores Ópticos, Fibra y Cableado
  {
    keyword: "transceptores 10G SFP+",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    title: "Módulos Transceptores 10G SFP+ Monomodo y Multimodo",
    category: "sfp"
  },
  {
    keyword: "módulos SFP+",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    title: "Módulos ópticos SFP+ 10G de alta compatibilidad",
    category: "sfp"
  },
  {
    keyword: "latiguillos OM3/OM4",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    title: "Latiguillos de fibra óptica preconectorizados OM3 y OM4",
    category: "sfp"
  },

  // Gateways y Soporte Mayorista
  {
    keyword: "ESG610",
    url: "https://www.ecomshop.es/engenius-esg610",
    sku: "ESG610",
    title: "Gateway SD-WAN EnGenius ESG610 Dual-WAN Multi-Gigabit",
    category: "gateway"
  },
  {
    keyword: "soporte preventa de ingeniería",
    url: "https://www.ecomshop.es/soporte-preventa",
    title: "Asesoría preventa gratuita y dimensionamiento de red en EcomShop",
    category: "support"
  },
  {
    keyword: "sustitución en 24h",
    url: "https://www.ecomshop.es/garantia-ecomspain",
    title: "Servicio de sustitución avanzada en 24h de EcomSpain",
    category: "support"
  }
];

export interface InternalLinkingResult {
  enrichedHtml: string;
  linksCount: number;
  injectedKeywords: string[];
}

export interface LinkRecommendation {
  sourceSku: string;
  targetSku: string;
  targetUrl: string;
  anchor: string;
  relevanceScore: number;
  reason: string;
}

/**
 * Genera recomendaciones semánticas y canónicas de enlaces cruzados
 */
export function generateLinkRecommendations(sourceSku: string, textContext: string): LinkRecommendation[] {
  const recommendations: LinkRecommendation[] = [];
  const cleanSource = sourceSku.toUpperCase();
  const lowerText = textContext.toLowerCase();

  for (const entry of CANONICAL_27_SKU_LINKS) {
    if (!entry.sku || entry.sku.toUpperCase() === cleanSource) continue;

    // Verificar existencia de SKU en el texto y calcular relevancia
    if (lowerText.includes(entry.sku.toLowerCase()) || lowerText.includes(entry.keyword.toLowerCase())) {
      recommendations.push({
        sourceSku: cleanSource,
        targetSku: entry.sku,
        targetUrl: entry.url,
        anchor: entry.keyword,
        relevanceScore: 0.95,
        reason: `Mención explícita del hardware complementario ${entry.sku} en el contenido de ${cleanSource}`
      });
    }
  }

  return recommendations;
}

export const COMBINED_INTERNAL_CATALOG: EcomLinkEntry[] = [
  ...CANONICAL_27_SKU_LINKS,
  ...ECOM_INTERNAL_CATALOG.filter((e) => !CANONICAL_27_SKU_LINKS.some((c) => c.sku === e.sku))
];

export function injectInternalLinks(
  htmlContent: string,
  maxTotalLinks = 6,
  catalog: EcomLinkEntry[] = COMBINED_INTERNAL_CATALOG
): InternalLinkingResult {
  if (!htmlContent) {
    return { enrichedHtml: "", linksCount: 0, injectedKeywords: [] };
  }

  let enrichedHtml = htmlContent;
  const injectedKeywords: string[] = [];
  const usedUrls = new Set<string>();

  // Ordenar catálogo: primero las frases más largas o SKUs específicos para evitar colisiones
  const sortedCatalog = [...catalog].sort((a, b) => b.keyword.length - a.keyword.length);

  for (const entry of sortedCatalog) {
    if (injectedKeywords.length >= maxTotalLinks) break;
    if (usedUrls.has(entry.url)) continue;

    // Expresión regular que busca la palabra solo si no está precedida de <a o dentro de comillas de atributos
    // Usamos segmentación por tokens de texto fuera de etiquetas HTML
    const escapedKeyword = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keywordRegex = new RegExp(`(?<![\\w/.-])(${escapedKeyword})(?![\\w/.-])`, "i");

    // Dividimos por tags para procesar únicamente los nodos de texto entre etiquetas de párrafo o lista
    const parts = enrichedHtml.split(/(<\/?[^>]+>)/g);
    let insideLink = false;
    let insideHeading = false;
    let insideCode = false;
    let keywordApplied = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith("<")) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith("<a ") || lowerPart === "<a>") {
          insideLink = true;
        } else if (lowerPart === "</a>") {
          insideLink = false;
        } else if (/^<h[1-6]/i.test(lowerPart)) {
          insideHeading = true;
        } else if (/^<\/h[1-6]>/i.test(lowerPart)) {
          insideHeading = false;
        } else if (lowerPart.startsWith("<code") || lowerPart.startsWith("<pre")) {
          insideCode = true;
        } else if (lowerPart === "</code>" || lowerPart === "</pre>") {
          insideCode = false;
        }
        continue;
      }

      // Estamos en un nodo de texto plano
      if (!insideLink && !insideHeading && !insideCode && !keywordApplied) {
        if (keywordRegex.test(part)) {
          // Reemplazar únicamente la primera aparición
          parts[i] = part.replace(
            keywordRegex,
            `<a href="${entry.url}" target="_blank" rel="noopener noreferrer" class="ecom-internal-link text-blue-600 hover:text-blue-800 font-medium underline decoration-blue-300 hover:decoration-blue-600" title="${entry.title}">$1</a>`
          );
          keywordApplied = true;
          injectedKeywords.push(entry.keyword);
          usedUrls.add(entry.url);
          break; // Pasamos a la siguiente entrada del catálogo
        }
      }
    }

    if (keywordApplied) {
      enrichedHtml = parts.join("");
    }
  }

  return {
    enrichedHtml,
    linksCount: injectedKeywords.length,
    injectedKeywords
  };
}

/**
 * Resuelve una URL de EcomShop para un SKU o término sugerido
 */
export function resolveEcomProductUrl(skuOrKeyword: string): string | undefined {
  const clean = skuOrKeyword.trim().toUpperCase();
  const entry = COMBINED_INTERNAL_CATALOG.find(
    (e) => (e.sku && e.sku.toUpperCase() === clean) || e.keyword.toUpperCase().includes(clean)
  );
  return entry?.url;
}
