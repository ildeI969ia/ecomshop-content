import * as cheerio from "cheerio";
import { CatalogProduct, DeviceType } from "@/lib/data/ecomshop-catalog";

export const GESIO_XML_FEED_URL =
  "https://ecomspain.gesio.be/catalogo-site.php?idsite=1&idioma=50&mode=httppublica&format=xmlmercamania&tarifa=14&code=eb312cc72352d19fc58d7c5ce93a93b3";

export const GESIO_CSV_FEED_URL =
  "https://ecomspain.gesio.be/catalogo-site.php?idsite=1&idioma=50&mode=httppublica&format=csvmercamania&tarifa=14&code=65a86cbd4e960467c7779065c4d309e3";

/**
 * Deducción precisa de DeviceType a partir de la jerarquía completa de categorías de Gesio
 */
export function determineDeviceTypeFromGesioCategory(name: string, category: string, brand: string): DeviceType {
  const text = `${name} ${category} ${brand}`.toLowerCase();
  
  if (text.includes("cámaras ip") || text.includes("camara") || text.includes("cctv") || text.includes("videosupervisión") || text.includes("nvrs") || text.includes("domo") || text.includes("bullet")) {
    return "CCTV_CAMERA";
  }
  if (text.includes("switch") || text.includes("conmutador") || text.includes("poe")) {
    return "SWITCH";
  }
  if (text.includes("router") || text.includes("celular") || text.includes("5g") || text.includes("4g") || text.includes("lte")) {
    return "ROUTER_CELLULAR";
  }
  if (text.includes("gateway") || text.includes("pasarela") || text.includes("sd-wan")) {
    return "GATEWAY";
  }
  if (text.includes("fibra") || text.includes("transceiver") || text.includes("sfp") || text.includes("óptica")) {
    return "FIBER_OPTIC";
  }
  if (text.includes("tester") || text.includes("probador")) {
    return "TESTER";
  }
  if (text.includes("cpe") || text.includes("ptp") || text.includes("antena") || text.includes("enlace")) {
    return "CPE_PTP";
  }
  if (text.includes("accesor") || text.includes("soporte") || text.includes("inyector") || text.includes("cable")) {
    return "ACCESSORY";
  }
  return "ACCESS_POINT";
}

/**
 * Mapeo de categorías canónicas para el esquema EcomShop
 */
export function normalizeCategoryFromGesio(category: string, name: string): CatalogProduct["category"] {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();

  if (cat.includes("videosupervisión") || cat.includes("cámaras") || cat.includes("nvrs") || n.includes("cámara") || n.includes("nvr")) return "cctv";
  if (cat.includes("switch") || n.includes("switch")) return "switches";
  if (n.includes("5g") || n.includes("4g") || cat.includes("celular")) return "cellular";
  if (cat.includes("wifi") || cat.includes("inalámbrica") || n.includes("wi-fi") || n.includes("access point")) return "wifi";
  if (cat.includes("fibra") || n.includes("sfp") || n.includes("fibra")) return "fibra";
  if (cat.includes("accesorio") || n.includes("inyector") || n.includes("soporte")) return "accesorios";
  if (n.includes("engenius")) return "engenius";
  return "wifi";
}

/**
 * Parsea el feed XML oficial de Gesio conteniendo todo el árbol de productos con categorías estructuradas
 */
export function parseGesioXmlCatalog(xmlText: string): CatalogProduct[] {
  const $ = cheerio.load(xmlText, { xmlMode: true });
  const products: CatalogProduct[] = [];

  $("producto").each((_, el) => {
    const $prod = $(el);
    
    const categoryRaw = $prod.find("categoria").text().trim();
    const offerId = $prod.find("referencia_interna").text().trim() || $prod.attr("numero") || "";
    const name = $prod.find("titulo").text().trim();
    const rawBrand = $prod.find("marca").text().trim() || "ENGENIUS";
    const brand = rawBrand.toUpperCase();
    const modelNumber = $prod.find("referencia_modelo").text().trim();
    const priceStr = $prod.find("precio").text().trim().replace(",", ".");
    const priceEur = parseFloat(priceStr) || 0;
    const productUrl = $prod.find("url_producto").text().trim();
    const imageUrl = $prod.find("url_imagen").text().trim();
    const description = $prod.find("descripcion").text().trim();
    const disponibilidad = $prod.find("disponibilidad").text().trim();
    const stockStatus = disponibilidad === "1" ? "IN_STOCK" : "OUT_OF_STOCK";

    const sku = (modelNumber || offerId || name.split(" ")[1] || "GENERIC").toUpperCase().trim();
    if (!sku || !name) return;

    const id = sku.toLowerCase();
    const deviceType = determineDeviceTypeFromGesioCategory(name, categoryRaw, brand);
    const category = normalizeCategoryFromGesio(categoryRaw, name);

    // Extraer viñetas de especificaciones si existen en la descripción
    const specs = description
      .split(/\.|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (specs.length === 0) {
      specs.push(`Producto oficial ${brand} (${categoryRaw})`);
    }

    const descriptionStandards = Array.from(
      description.matchAll(/(?:IEEE\\s*)?802\\.\\d+[A-Za-z0-9./-]*/gi)
    ).map((m) => m[0].trim());

    const interfaces = Array.from(
      description.matchAll(/\\b\\d+\\s*(?:x|puertos?)?\\s*(?:RJ45|Ethernet|GbE|Gigabit|SFP\\+?|QSFP28)\\b/gi)
    ).map((m) => m[0].trim());

    const feedUrl = productUrl || `https://www.ecomshop.es/productos/${id}`;

    const product: CatalogProduct = {
      id,
      sku,
      model: modelNumber || sku,
      name,
      brand,
      deviceType,
      category,
      description: description || `Ficha de producto ${name} publicada en ecomshop.es.`,
      url: feedUrl,
      imageUrl,
      priceEur,
      wholesalePriceEur: priceEur,
      stockStatus,
      specs,
      interfaces: interfaces.length > 0 ? interfaces : ["No especificado en el feed"],
      powerRequirements: /poe/i.test(description) ? "PoE (detalle en descripción del feed)" : "No especificado en el feed",
      poeType: /802\\.3bt/i.test(description) ? "802.3bt" : /802\\.3at/i.test(description) ? "802.3at" : /802\\.3af/i.test(description) ? "802.3af" : "NONE",
      powerConsumptionWatts: 0,
      managementMode: /cloud/i.test(description) ? "Cloud" : "Standalone",
      standards: descriptionStandards.length > 0 ? Array.from(new Set(descriptionStandards)) : ["No especificado en el feed"],
      keyAdvantages: specs.slice(0, 5),
      recommendedBundle: {
        sku: "",
        name: "",
        relationshipType: "ACCESSORY",
        rationale: "El feed no prescribe un bundle; no se introduce ningún producto adicional."
      },
      notebookSource: {
        sourceId: `gesio-xml-${id}`,
        title: `Feed EcomShop/Gesio — ${sku}`,
        type: "url",
        url: feedUrl,
        rationale: "Producto sincronizado directamente desde el feed XML oficial de EcomShop/Gesio."
      },
      actionTitle: `Ficha ${sku} — EcomShop`,
      targetSegment: "Profesionales de networking y canal B2B",
      defaultAngle: "PERFORMANCE",
      commercialAngles: {
        executiveRoi: "Evaluar el coste y la disponibilidad del producto según la ficha oficial.",
        engineeringPerformance: "Evaluar el rendimiento únicamente con las especificaciones publicadas en el feed.",
        operationsDeployment: "Evaluar instalación y operación según las características publicadas en EcomShop."
      },
      sectorAffinity: {},
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 1.0,
        LIQUIDATE_STOCK: 0.5,
        PROMOTE_NEW_ARRIVALS: 0.5,
        DEFEND_MARGIN: 0.5,
        PENETRATE_VERTICAL: 0.5
      }
    };

    products.push(product);
  });

  return products;
}
