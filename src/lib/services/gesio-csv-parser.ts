import { CatalogProduct, DeviceType } from "@/lib/data/ecomshop-catalog";

export const GESIO_CSV_FEED_URL =
  "https://ecomspain.gesio.be/catalogo-site.php?idsite=1&idioma=50&mode=httppublica&format=csvmercamania&tarifa=14&code=65a86cbd4e960467c7779065c4d309e3";

/**
 * Función robusta para parsear líneas de CSV delimitadas por punto y coma (;)
 * respetando comillas dobles y saltos de línea internos.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // Omitir la comilla escapada
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ";" && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Deducción de DeviceType a partir de la categoría y nombre del producto Gesio
 */
export function determineDeviceType(name: string, category: string, brand: string): DeviceType {
  const text = `${name} ${category} ${brand}`.toLowerCase();
  if (text.includes("cámara") || text.includes("camara") || text.includes("cctv") || text.includes("videosupervisión")) {
    return "CCTV_CAMERA";
  }
  if (text.includes("switch") || text.includes("conmutador")) {
    return "SWITCH";
  }
  if (text.includes("router") || text.includes("celular") || text.includes("5g") || text.includes("4g") || text.includes("lte")) {
    return "ROUTER_CELLULAR";
  }
  if (text.includes("gateway") || text.includes("pasarela")) {
    return "GATEWAY";
  }
  if (text.includes("fibra") || text.includes("transceiver") || text.includes("sfp")) {
    return "FIBER_OPTIC";
  }
  if (text.includes("tester") || text.includes("probador")) {
    return "TESTER";
  }
  if (text.includes("cpe") || text.includes("ptp") || text.includes("antena")) {
    return "CPE_PTP";
  }
  if (text.includes("accesor") || text.includes("soporte") || text.includes("inyector")) {
    return "ACCESSORY";
  }
  return "ACCESS_POINT";
}

/**
 * Normaliza la categoría Gesio a las categorías del schema EcomShop
 */
export function normalizeCategory(category: string, name: string): CatalogProduct["category"] {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();

  if (cat.includes("cámaras") || cat.includes("camara") || n.includes("cámara")) return "cctv";
  if (cat.includes("switch") || n.includes("switch")) return "switches";
  if (n.includes("5g") || n.includes("4g") || cat.includes("celular")) return "cellular";
  if (cat.includes("wifi") || cat.includes("inalámbrica") || n.includes("wi-fi") || n.includes("access point")) return "wifi";
  if (cat.includes("fibra") || n.includes("sfp") || n.includes("fibra")) return "fibra";
  if (cat.includes("accesorio") || n.includes("inyector") || n.includes("soporte")) return "accesorios";
  if (n.includes("engenius")) return "engenius";
  return "wifi";
}

/**
 * Parsea el feed CSV de Gesio en una lista limpia de entidades CatalogProduct
 */
export function parseGesioCsvCatalog(csvText: string): CatalogProduct[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase());
  const idx = {
    category: headers.indexOf("category"),
    offer_id: headers.indexOf("offer_id"),
    name: headers.indexOf("name"),
    prize: headers.indexOf("prize"),
    product_url: headers.indexOf("product_url"),
    image_url: headers.indexOf("image_url"),
    description: headers.indexOf("description"),
    brand: headers.indexOf("brand"),
    model_number: headers.indexOf("model_number"),
    hay_stock: headers.indexOf("hay_stock"),
    precio_neto: headers.indexOf("precio_neto"),
    large_image_url: headers.indexOf("large_image_url"),
    long_description: headers.indexOf("long_description")
  };

  const products: CatalogProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= 3) continue;

    const offerId = row[idx.offer_id] || "";
    const name = row[idx.name] || "";
    const modelNumber = row[idx.model_number] || "";
    const rawBrand = row[idx.brand] || "ENGENIUS";
    const brand = rawBrand.toUpperCase().trim();
    const categoryRaw = row[idx.category] || "";

    // Deducir SKU único
    const sku = (modelNumber || offerId || name.split(" ")[1] || "GENERIC").toUpperCase().trim();
    if (!sku) continue;

    const id = sku.toLowerCase();
    const priceStr = (row[idx.prize] || row[idx.precio_neto] || "0").replace(",", ".");
    const priceEur = parseFloat(priceStr) || 0;
    const wholesalePriceStr = (row[idx.precio_neto] || "0").replace(",", ".");
    const wholesalePriceEur = parseFloat(wholesalePriceStr) || priceEur;

    const stockVal = row[idx.hay_stock];
    const stockStatus = stockVal === "1" ? "IN_STOCK" : stockVal === "0" ? "OUT_OF_STOCK" : "LOW_STOCK";

    const productUrl = row[idx.product_url] || `https://www.ecomshop.es/productos/${id}`;
    const imageUrl = row[idx.large_image_url] || row[idx.image_url] || "";
    const shortDesc = row[idx.description] || "";
    const longDesc = row[idx.long_description] || shortDesc;

    const deviceType = determineDeviceType(name, categoryRaw, brand);
    const category = normalizeCategory(categoryRaw, name);

    // Extraer viñetas de especificaciones si existen en la descripción
    const specs = shortDesc
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (specs.length === 0) {
      specs.push(`Producto oficial ${brand} garantizado por EcomSpain`);
    }

    const product: CatalogProduct = {
      id,
      sku,
      model: modelNumber || sku,
      name,
      brand,
      deviceType,
      category,
      description: longDesc || shortDesc,
      url: productUrl,
      imageUrl,
      priceEur,
      wholesalePriceEur,
      stockStatus,
      specs,
      interfaces: ["Ethernet Gigabit RJ-45", "PoE Standard"],
      powerRequirements: "Power-over-Ethernet (PoE) / DC",
      poeType: "802.3at",
      powerConsumptionWatts: 15,
      managementMode: "Cloud",
      standards: ["IEEE 802.3af/at"],
      keyAdvantages: [
        "Catálogo directo de ecomshop.es con actualización en vivo",
        "Disponibilidad con envío express 24/48h",
        "Soporte directo oficial ecomspain.com sin costes ocultos"
      ],
      recommendedBundle: {
        sku: "ECS2512FP",
        name: "Switch EnGenius Cloud PoE++ Multi-Gigabit",
        relationshipType: "REQUIRES_POE_SWITCH",
        rationale: "Alimentación PoE optimizada y conectividad sin interrupciones"
      },
      notebookSource: {
        sourceId: `gesio-feed-${id}`,
        title: `Feed Oficial Gesio EcomShop - ${sku}`,
        type: "url",
        url: productUrl,
        rationale: "Sincronizado directamente desde el feed CSV público oficial de EcomShop"
      },
      actionTitle: `Disponibilidad y Oferta ${sku} en ecomshop.es`,
      targetSegment: "Integradores de Telecomunicaciones, Seguridad IP e IT Corporativo",
      defaultAngle: "ROI",
      commercialAngles: {
        executiveRoi: "Optimización de inversiones IT y entrega inmediata sin intermediarios.",
        engineeringPerformance: "Rendimiento probado de grado industrial y conectividad sin caídas.",
        operationsDeployment: "Instalación sencilla y compatibilidad con infraestructuras estándar."
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
  }

  return products;
}
