import type { StarProduct } from "./knowledge";

export type DeviceType = "ACCESS_POINT" | "SWITCH" | "GATEWAY" | "ACCESSORY";

export interface CatalogDevice {
  sku: string;
  brand: string;
  name: string;
  type: DeviceType;
  category:
    | "WIFI_7"
    | "WIFI_6"
    | "SWITCH_MULTIGIG"
    | "SWITCH_GIGABIT"
    | "SWITCH_FIBER_L3"
    | "GATEWAY_SDWAN"
    | "ACCESSORY";
  shortDesc: string;
  recommendedBundle: string;
  productUrl: string;
  specs: {
    // Específico para APs
    wirelessStandards?: string[];
    bands?: string[];
    mimo?: string;
    maxSpeed?: string;
    // Específico para Switches
    portsCount?: string;
    poeBudget?: string;
    uplinks?: string;
    layer?: "L2+" | "L3" | "Unmanaged";
    // Específico para Gateways
    throughput?: string;
    wanPorts?: string;
    vpnFeatures?: string[];
    // Común
    interfaces: string[];
    powerSource: string;
    management: string;
  };
  keyAdvantages: string[];
  notebookSource: string;
  notebookSourceId?: string;
}

export const ECOMSHOP_CATALOG: CatalogDevice[] = [
  // --- PUNTOS DE ACCESO WI-FI 7 ---
  {
    sku: "ECW536",
    brand: "EnGenius",
    name: "Cloud Wi-Fi 7 Enterprise AP 4x4x4",
    type: "ACCESS_POINT",
    category: "WIFI_7",
    shortDesc: "AP Tri-Banda BE19000 para auditorios y alta densidad extrema",
    recommendedBundle: "Switch ECS2530FP (PoE++ 740W) + Transceptores 10G",
    productUrl: "https://www.ecomshop.es/ecw536/",
    specs: {
      wirelessStandards: ["Wi-Fi 7 (802.11be)", "802.11ax/ac/n"],
      bands: ["2.4 GHz", "5 GHz", "6 GHz"],
      mimo: "4x4:4 Tri-Banda concurrente",
      maxSpeed: "Hasta 19.000 Mbps combinados",
      interfaces: ["1x 10GbE PoE++ (802.3bt)", "1x 10GbE LAN"],
      powerSource: "PoE++ 802.3bt (Clase 6/7) o f/a 12V",
      management: "EnGenius Cloud Native (Sin licencias obligatorias)",
    },
    keyAdvantages: [
      "Doble puerto 10GbE para eliminar estrangulamiento",
      "Canales ultrawide de 320 MHz en banda 6 GHz",
      "Preamble Puncturing y MLO"
    ],
    notebookSource: "Indoor Wireless Cloud | EnGenius Networks Europe B.V",
    notebookSourceId: "src-1",
  },
  {
    sku: "ECW510",
    brand: "EnGenius",
    name: "Cloud Wi-Fi 7 Dual-Band AP 2x2",
    type: "ACCESS_POINT",
    category: "WIFI_7",
    shortDesc: "Punto de acceso Wi-Fi 7 BE5000 rentable para oficinas y pymes",
    recommendedBundle: "Switch ECS2512FP (2.5G PoE+) + Inyector POE30Gv2",
    productUrl: "https://www.ecomshop.es/ecw510/",
    specs: {
      wirelessStandards: ["Wi-Fi 7 (802.11be)", "802.11ax/ac/n"],
      bands: ["2.4 GHz (700 Mbps)", "5 GHz (4300 Mbps)"],
      mimo: "2x2:2 Doble Banda",
      maxSpeed: "Hasta 5.000 Mbps",
      interfaces: ["1x 2.5GbE RJ45 compatible PoE+ 802.3at"],
      powerSource: "PoE+ 802.3at (Consumo pico 21W)",
      management: "EnGenius Cloud gratuito / Standalone / MESH",
    },
    keyAdvantages: [
      "Uplink 2.5GbE nativo",
      "MLO para roaming de baja latencia",
      "Sustitución directa de APs Wi-Fi 5 y 6 sin cambiar cableado"
    ],
    notebookSource: "EcomShop Superventas Datasheets",
    notebookSourceId: "src-4",
  },
  {
    sku: "ECW526",
    brand: "EnGenius",
    name: "Cloud Wi-Fi 7 Tri-Band AP 2x2x2",
    type: "ACCESS_POINT",
    category: "WIFI_7",
    shortDesc: "AP Tri-Banda BE9400 con radio nativa de 6 GHz para hospitality",
    recommendedBundle: "Switch ECS2512FP + Cable Cat6A",
    productUrl: "https://www.ecomshop.es/ecw526/",
    specs: {
      wirelessStandards: ["Wi-Fi 7 (802.11be)", "WPA3-Enterprise"],
      bands: ["2.4 GHz", "5 GHz", "6 GHz"],
      mimo: "2x2:2 Tri-Banda",
      maxSpeed: "Hasta 9.400 Mbps",
      interfaces: ["1x 10GbE PoE+ 802.3at"],
      powerSource: "PoE+ 802.3at",
      management: "EnGenius Cloud",
    },
    keyAdvantages: [
      "Acceso a banda limpia de 6 GHz",
      "Puerto 10GE para enlace troncal",
      "Optimizado para habitaciones ejecutivas y despachos"
    ],
    notebookSource: "Indoor Wireless Cloud | EnGenius Europe",
    notebookSourceId: "src-1",
  },

  // --- GATEWAYS DE SEGURIDAD SD-WAN (SIN WIFI) ---
  {
    sku: "ESG510",
    brand: "EnGenius",
    name: "Cloud Security Gateway SD-WAN 4x 2.5G",
    type: "GATEWAY",
    category: "GATEWAY_SDWAN",
    shortDesc: "Cortafuegos y enrutador SD-WAN Multi-Gigabit con Dual-WAN (Sin Wi-Fi integrado)",
    recommendedBundle: "Switch ECS2512FP + APs ECW510",
    productUrl: "https://www.ecomshop.es/esg510/",
    specs: {
      throughput: "2.5 Gbps Stateful Firewall / 950 Mbps IPSec VPN",
      wanPorts: "2x 2.5GbE RJ45 (Dual WAN Failover & Load Balancing)",
      vpnFeatures: ["Auto-VPN Mesh en nube", "Cliente SecuPoint VPN", "Site-to-Site IPSec / WireGuard"],
      interfaces: ["4x 2.5GbE RJ45 (2x WAN / 2x LAN configurables)", "1x USB 3.0 para módem LTE/5G"],
      powerSource: "PoE+ 802.3at de entrada o Adaptador 12V DC",
      management: "EnGenius Cloud unificada (Mismo panel que switches y APs)",
    },
    keyAdvantages: [
      "Conmutación por error automática entre dos operadores de fibra",
      "Aprovisionamiento Zero-Touch en minutos",
      "Cero cuotas recurrentes de suscripción de firewall"
    ],
    notebookSource: "EnGenius Network Switches & Security Gateways",
    notebookSourceId: "src-18",
  },

  // --- SWITCHES MULTI-GIGABIT Y 10G POE ---
  {
    sku: "ECS2512FP",
    brand: "EnGenius",
    name: "Switch Cloud Multi-Gigabit 8p 2.5G + 4p 10G SFP+",
    type: "SWITCH",
    category: "SWITCH_MULTIGIG",
    shortDesc: "Switch de distribución ideal para alimentar puntos de acceso Wi-Fi 7",
    recommendedBundle: "8x APs ECW510 o ECW536 + Módulos SFP-10G-SR",
    productUrl: "https://www.ecomshop.es/ecs2512fp/",
    specs: {
      portsCount: "8 puertos 2.5 Gbps PoE+ + 4 slots SFP+ 10 Gbps",
      poeBudget: "240W PoE+ (802.3at/af)",
      uplinks: "4x 10G SFP+ para fibra óptica troncal",
      layer: "L2+",
      interfaces: ["8x 2.5GbE RJ45 PoE+", "4x 10G SFP+", "1x Puerto de consola RJ45"],
      powerSource: "Fuente interna 100-240VAC",
      management: "EnGenius Cloud / Web GUI Local / CLI / SNMP",
    },
    keyAdvantages: [
      "Alimenta hasta 8 APs Wi-Fi 7 a 2.5G simultáneos",
      "Uplink 10G sin cuellos de botella hacia servidor o router",
      "Monitorización de consumo y reinicio remoto de puertos PoE"
    ],
    notebookSource: "Managed Switches Technology | EnGenius Europe",
    notebookSourceId: "src-7",
  },
  {
    sku: "ECS1528FP",
    brand: "EnGenius",
    name: "Switch Cloud Gigabit 24p PoE+ (410W) + 4p 10G SFP+",
    type: "SWITCH",
    category: "SWITCH_GIGABIT",
    shortDesc: "Switch de conmutación robusto para proyectos de videovigilancia IP y conectividad",
    recommendedBundle: "Kit Cámaras IP CCTV + Transceptores SFP-10G-SR-KIT",
    productUrl: "https://www.ecomshop.es/ecs1528fp/",
    specs: {
      portsCount: "24 puertos Gigabit PoE+ + 4 slots SFP+ 10G",
      poeBudget: "410W PoE+ de alta potencia",
      uplinks: "4x 10G SFP+",
      layer: "L2+",
      interfaces: ["24x 10/100/1000 Mbps RJ45 PoE+", "4x 10G SFP+"],
      powerSource: "Fuente interna AC industrial",
      management: "EnGenius Cloud / App Cloud To-Go",
    },
    keyAdvantages: [
      "410W de potencia para cámaras térmicas y PTZ",
      "Aislamiento de VLANs por hardware",
      "Garantía oficial y soporte en España"
    ],
    notebookSource: "Cloud Switch Datasheet Oficial",
    notebookSourceId: "src-8",
  },

  // --- SWITCHES DE FIBRA Y CAPA 3 ENTERPRISE ---
  {
    sku: "ECS5512F",
    brand: "EnGenius",
    name: "Switch de Agregación de Fibra 12p 10G SFP+",
    type: "SWITCH",
    category: "SWITCH_FIBER_L3",
    shortDesc: "Switch de agregación de fibra 10 Gigabit de medio rack para backbones corporativos",
    recommendedBundle: "Transceptores SFP-10G-SR + Latiguillos OM4 LC-LC",
    productUrl: "https://www.ecomshop.es/ecs5512f/",
    specs: {
      portsCount: "12 puertos 10G SFP+",
      poeBudget: "Sin PoE (Switch de fibra puro)",
      uplinks: "12x 10G SFP+ enmallados",
      layer: "L2+",
      interfaces: ["12x SFP+ 10 Gbps"],
      powerSource: "Fuente interna 100-240V",
      management: "EnGenius Cloud / SNMP / CLI",
    },
    keyAdvantages: [
      "Interconexión de racks a 10 Gbps",
      "Formato medio rack compacto",
      "Baja latencia de conmutación"
    ],
    notebookSource: "EnGenius Network Switches Layer 3",
    notebookSourceId: "src-18",
  },

  // --- INYECTORES Y ACCESORIOS ECOM ---
  {
    sku: "POE30Gv2",
    brand: "ECOM",
    name: "Inyector PoE+ Gigabit 30W 802.3af/at",
    type: "ACCESSORY",
    category: "ACCESSORY",
    shortDesc: "Inyector de alimentación individual para puntos de acceso y cámaras sin switch PoE",
    recommendedBundle: "AP EnGenius ECW210L o ECW510",
    productUrl: "https://www.ecomshop.es/ecom-inyector-poe-2-puertos-gigabit-poe30gv2-hasta-30-w-8023-afat-dc-output48v0625a-p-1-50-526/",
    specs: {
      interfaces: ["1x Entrada LAN Gigabit RJ45", "1x Salida PoE Gigabit 802.3af/at (30W)"],
      powerSource: "Entrada 90-240VAC / Salida 48V 0.625A",
      management: "Plug & Play no gestionado",
    },
    keyAdvantages: [
      "Tiradas de hasta 100 metros certificados",
      "Clema lateral para agrupación en rack",
      "Protección contra sobretensiones"
    ],
    notebookSource: "EcomShop Catálogo Oficial ECOM",
    notebookSourceId: "src-4",
  }
];

/**
 * Consulta un dispositivo en el catálogo por su SKU (insensible a mayúsculas/minúsculas).
 */
export function getCatalogDevice(sku: string): CatalogDevice | undefined {
  if (!sku) return undefined;
  const clean = sku.trim().toUpperCase();
  return ECOMSHOP_CATALOG.find(
    (d) => d.sku.toUpperCase() === clean || clean.includes(d.sku.toUpperCase())
  );
}

/**
 * Filtra dispositivos por tipo (ACCESS_POINT, SWITCH, GATEWAY, ACCESSORY).
 */
export function getDevicesByType(type: DeviceType): CatalogDevice[] {
  return ECOMSHOP_CATALOG.filter((d) => d.type === type);
}

/**
 * Filtra dispositivos por categoría tecnológica.
 */
export function getDevicesByCategory(
  category: CatalogDevice["category"]
): CatalogDevice[] {
  return ECOMSHOP_CATALOG.filter((d) => d.category === category);
}

/**
 * Adaptador hacia StarProduct para compatibilidad con módulos legados.
 */
export function catalogDeviceToStarProduct(device: CatalogDevice): StarProduct {
  let cat: StarProduct["category"] = "engenius";
  if (device.type === "ACCESS_POINT") cat = "wifi";
  else if (device.type === "SWITCH") cat = "switches";
  else if (device.type === "GATEWAY") cat = "gateways";
  else if (device.type === "ACCESSORY") cat = "accesorios";
  else cat = "engenius";

  const specsList: string[] = [];
  if (device.specs.wirelessStandards?.length) {
    specsList.push(device.specs.wirelessStandards.join(", "));
  }
  if (device.specs.maxSpeed) specsList.push(device.specs.maxSpeed);
  if (device.specs.portsCount) specsList.push(device.specs.portsCount);
  if (device.specs.poeBudget) specsList.push(`PoE: ${device.specs.poeBudget}`);
  if (device.specs.throughput) specsList.push(`Throughput: ${device.specs.throughput}`);
  if (device.specs.management) specsList.push(device.specs.management);

  return {
    id: device.sku.toLowerCase(),
    name: device.name,
    model: device.sku,
    category: cat,
    description: device.shortDesc,
    url: device.productUrl,
    imageUrl: `https://store.engeniustech.com/cdn/shop/files/${device.sku}-front.jpg`,
    specs: specsList.length > 0 ? specsList : device.keyAdvantages
  };
}

/**
 * Devuelve todos los dispositivos del catálogo oficial en formato CatalogDevice
 */
export function getAllCatalogDevices(): CatalogDevice[] {
  return ECOMSHOP_CATALOG;
}

export {
  findCatalogProduct,
  type CatalogProduct,
  ECOMSHOP_FULL_CATALOG,
  getAllCatalogProducts
} from "./data/ecomshop-catalog";

