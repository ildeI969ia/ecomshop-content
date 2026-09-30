import * as cheerio from "cheerio";
import { aiClient } from "@/lib/genai-client";
import { AI_TEXT_MODEL } from "@/lib/ai-config";
import { CatalogProduct, DeviceType } from "@/lib/data/ecomshop-catalog";

const BASE_URL = "https://www.ecomshop.es";

export interface CrawledProductLink {
  url: string;
  skuHint?: string;
  titleHint?: string;
}

/**
 * 1. Rastreador de enlaces de productos en ecomshop.es
 * Explora la página de inicio, las marcas principales (EnGenius, Teltonika, Ecom)
 * y las familias clave de conectividad para recolectar las URLs de fichas de producto.
 */
export async function crawlEcomshopProductUrls(maxProducts = 60): Promise<CrawledProductLink[]> {
  const seedUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/engenius/`,
    `${BASE_URL}/teltonika/`,
    `${BASE_URL}/ecom/`,
    `${BASE_URL}/switches--poe-gigabit10giga-lp-1-50-familia-46`,
    `${BASE_URL}/wifi-interior-cms-1-50-80/`,
    `${BASE_URL}/wifi-exterior-cms-1-50-79/`,
    `${BASE_URL}/switches-core-lp-1-50-familia-63/`,
    `${BASE_URL}/superventas-cms-1-50-125`
  ];

  const productUrlMap = new Map<string, CrawledProductLink>();

  for (const seed of seedUrls) {
    if (productUrlMap.size >= maxProducts) break;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(seed, {
        headers: {
          "User-Agent": "EcomSpain-CatalogEngine/3.0 (+https://marketing.ecomspain.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      $("a[href]").each((_, el) => {
        let href = $(el).attr("href") || "";
        if (!href) return;

        // Normalizar enlace
        if (href.startsWith("/")) {
          href = `${BASE_URL}${href}`;
        }

        // Patrón Gesio B2B para fichas de producto: ...-p-1-50-XXX/
        if (href.includes("-p-1-50-") && href.startsWith(BASE_URL)) {
          const cleanUrl = href.split("?")[0].replace(/\/+$/, "") + "/";
          if (!productUrlMap.has(cleanUrl)) {
            const linkText = $(el).text().trim();
            productUrlMap.set(cleanUrl, {
              url: cleanUrl,
              titleHint: linkText || undefined
            });
          }
        }
      });
    } catch (err) {
      console.warn(`[CatalogCrawler] Error rastreando ${seed}:`, err);
    }
  }

  return Array.from(productUrlMap.values()).slice(0, maxProducts);
}

/**
 * 2. Descarga y limpieza del HTML de la ficha del producto
 */
export async function fetchRawProductHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "EcomSpain-CatalogEngine/3.0 (+https://marketing.ecomspain.com)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
    },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${url}`);
  }

  return await res.text();
}

/**
 * 3. Parser Inteligente impulsado por Gemini Flash:
 * Convierte el HTML/texto crudo de ecomshop.es en un objeto CatalogProduct estrictamente tipado.
 */
export async function parseProductWithGemini(
  html: string,
  productUrl: string
): Promise<CatalogProduct> {
  const $ = cheerio.load(html);

  // Extraer secciones informativas reduciendo tamaño
  const pageTitle = $("title").text().trim();
  const metaDesc = $('meta[name="description"], meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  
  // Limpiar scripts y estilos
  $("script, style, noscript, iframe").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().substring(0, 10000);

  const prompt = `Actúa como Senior Network Engineer y Arquitecto de Catálogo B2B para EcomShop / EcomSpain.
Analiza el siguiente contenido extraído de la ficha de producto de ecomshop.es:
URL: ${productUrl}
Título de página: ${pageTitle}
Meta Descripción: ${metaDesc}
Texto de la ficha:
"""
${bodyText}
"""

Genera un JSON estrictamente tipado con este esquema exacto para la entidad CatalogProduct:
{
  "id": "sku en minúsculas (ej: ecw536)",
  "sku": "SKU oficial en mayúsculas (ej: ECW536, ECS2512FP, ESG510)",
  "model": "Modelo exacto (ej: ECW536)",
  "name": "Nombre comercial completo en español",
  "brand": "EnGenius" | "Teltonika" | "EcomSpain" | "Stonet" | "Wi-Tek" | "Otra",
  "deviceType": "ACCESS_POINT" | "SWITCH" | "GATEWAY" | "ROUTER_CELLULAR" | "FIBER_OPTIC" | "TESTER" | "ACCESSORY" | "CCTV_CAMERA" | "CPE_PTP",
  "category": "wifi" | "switches" | "gateways" | "fibra" | "accesorios" | "engenius" | "cellular" | "testers",
  "description": "Descripción técnica clara en español para integradores IT (80-150 palabras)",
  "url": "${productUrl}",
  "imageUrl": "${ogImage || `https://store.engeniustech.com/cdn/shop/files/placeholder.jpg`}",
  "priceEur": número o 0 si no se muestra explícito,
  "stockStatus": "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN",
  "specs": ["3 a 6 especificaciones técnicas clave (ej: 'Tri-Band Wi-Fi 7', 'Puerto 10GbE PoE++')"],
  "interfaces": ["Lista de puertos (ej: ['1x 10GbE RJ45', '1x 2.5GbE RJ45'])"],
  "powerRequirements": "Requisito de alimentación (ej: 'PoE++ 802.3bt' o 'PoE+ 802.3at' o '12V DC')",
  "poeType": "802.3af" | "802.3at" | "802.3bt" | "DC_PASSIVE" | "NONE",
  "powerConsumptionWatts": número estimado de consumo en vatios (ej: 25),
  "managementMode": "Cloud" | "On-Premise" | "Hybrid" | "Standalone" | "RMS" | "Local" | "Unmanaged",
  "standards": ["Estándares relevantes (ej: ['802.11be', '802.3bt', 'WPA3-Enterprise'])"],
  "keyAdvantages": ["3 ventajas comerciales clave para instaladores B2B"]
}

IMPORTANTE: Devuelve ÚNICAMENTE el bloque JSON válido, sin delimitadores de markdown (\`\`\`json) ni texto adicional.`;

  const response = await aiClient.models.generateContent({
    model: AI_TEXT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });

  const rawJson = (response.text || "{}").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const sku = (parsed.sku || parsed.model || "GENERIC").toUpperCase().trim();
  const id = sku.toLowerCase();

  const completeProduct: CatalogProduct = {
    id,
    sku,
    model: parsed.model || sku,
    name: parsed.name || `${parsed.brand || "EcomShop"} ${sku}`,
    brand: parsed.brand || "EnGenius",
    deviceType: (parsed.deviceType as DeviceType) || "ACCESS_POINT",
    category: parsed.category || "wifi",
    description: parsed.description || metaDesc || "Equipo profesional de telecomunicaciones de ecomshop.es",
    url: productUrl,
    imageUrl: parsed.imageUrl || ogImage || `https://store.engeniustech.com/cdn/shop/files/${sku}-front.jpg`,
    priceEur: typeof parsed.priceEur === "number" ? parsed.priceEur : 0,
    stockStatus: parsed.stockStatus || "IN_STOCK",
    specs: Array.isArray(parsed.specs) && parsed.specs.length > 0 ? parsed.specs : ["Gestión EnGenius Cloud sin licencias"],
    interfaces: Array.isArray(parsed.interfaces) && parsed.interfaces.length > 0 ? parsed.interfaces : ["RJ45 Gigabit"],
    powerRequirements: parsed.powerRequirements || "PoE+ 802.3at",
    poeType: parsed.poeType || "802.3at",
    powerConsumptionWatts: typeof parsed.powerConsumptionWatts === "number" ? parsed.powerConsumptionWatts : 15,
    managementMode: parsed.managementMode || "Cloud",
    standards: Array.isArray(parsed.standards) ? parsed.standards : ["802.3at"],
    keyAdvantages: Array.isArray(parsed.keyAdvantages) && parsed.keyAdvantages.length > 0 ? parsed.keyAdvantages : [
      "Gestión Cloud sin licencias",
      "Soporte directo oficial en España",
      "Disponibilidad con envío 24/48h"
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch EnGenius Cloud PoE++ Multi-Gigabit",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Alimentación PoE óptima y troncal de alta velocidad sin cuellos de botella"
    },
    notebookSource: {
      sourceId: `ecomshop-live-${id}`,
      title: `Ficha Técnica Oficial ecomshop.es - ${sku}`,
      type: "url",
      url: productUrl,
      rationale: "Ficha oficial rastreada directamente de la tienda en vivo ecomshop.es"
    },
    actionTitle: `Campaña ${sku} — Disponibilidad en ecomshop.es`,
    targetSegment: "Integradores de Telecomunicaciones y Departamentos IT",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Reducción de costes operativos y despliegues rentables sin costes ocultos.",
      engineeringPerformance: "Rendimiento profesional de grado empresarial con alta concurrencia y latencia ultra baja.",
      operationsDeployment: "Configuración ágil y gestión centralizada simplificada."
    },
    sectorAffinity: {
      "Hospitality & Hoteles": 0.85,
      "Logística & Almacenes": 0.9,
      "Educación & Colegios": 0.8,
      "Oficinas Corporativas": 0.95
    },
    businessGoalAffinity: {
      "ALL_OPPORTUNITIES": 1.0,
      "LIQUIDATE_STOCK": 0.7,
      "PROMOTE_NEW_ARRIVALS": 0.9,
      "DEFEND_MARGIN": 0.8,
      "PENETRATE_VERTICAL": 0.85
    }
  };

  return completeProduct;
}
