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

    const product: CatalogProduct = {
      id,
      sku,
      model: modelNumber || sku,
      name,
      brand,
      deviceType,
      category,
      description: description || `Producto profesional ${name} de la categoría ${categoryRaw} disponible en ecomshop.es.`,
      url: productUrl || `https://www.ecomshop.es/productos/${id}`,
      imageUrl,
      priceEur,
      wholesalePriceEur: priceEur,
      stockStatus,
      specs,
      interfaces: ["Ethernet Gigabit RJ-45", "Alimentación PoE / DC"],
      powerRequirements: "Power-over-Ethernet (PoE) / DC",
      poeType: "802.3at",
      powerConsumptionWatts: 15,
      managementMode: "Cloud",
      standards: ["IEEE 802.3af/at"],
      keyAdvantages: [
        `Categoría oficial ecomshop.es: ${categoryRaw}`,
        "Disponibilidad con envío directo 24/48h",
        "Soporte directo oficial ecomspain.com sin costes de licenciamiento"
      ],
      recommendedBundle: {
        sku: "ECS2512FP",
        name: "Switch EnGenius Cloud PoE++ Multi-Gigabit",
        relationshipType: "REQUIRES_POE_SWITCH",
        rationale: "Alimentación PoE optimizada y conectividad sin caídas"
      },
      notebookSource: {
        sourceId: `gesio-xml-${id}`,
        title: `Feed XML Gesio - ${sku} (${categoryRaw})`,
        type: "url",
        url: productUrl,
        rationale: "Sincronizado directamente desde el feed XML oficial de Gesio Mercamania"
      },
      actionTitle: `Disponibilidad y Ficha ${sku} en ecomshop.es`,
      targetSegment: "Integradores de Telecomunicaciones, Seguridad IP e IT Corporativo",
      defaultAngle: "ROI",
      commercialAngles: {
        executiveRoi: "Optimización de presupuestos de infraestructura IT y rápida amortización.",
        engineeringPerformance: "Rendimiento probado de nivel profesional y alta estabilidad.",
        operationsDeployment: "Despliegue ágil y compatibilidad completa con estándares corporativos."
      },
      sectorAffinity: {
        "Videovigilancia & CCTV": 0.95,
        "Hospitality & Hoteles": 0.85,
        "Logística & Naves Industriales": 0.9,
        "Oficinas Corporativas": 0.9
      },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 1.0,
        LIQUIDATE_STOCK: 0.7,
        PROMOTE_NEW_ARRIVALS: 0.9,
        DEFEND_MARGIN: 0.85,
        PENETRATE_VERTICAL: 0.9
      }
    };

    products.push(product);
  });

  return products;
}
