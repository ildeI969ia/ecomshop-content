import type { StarProduct } from "./knowledge";
import {
  ECOMSHOP_FULL_CATALOG,
  findCatalogProduct,
  getAllCatalogProducts,
  type CatalogProduct,
  type DeviceType
} from "./data/ecomshop-catalog";

export type { DeviceType };

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
    | "ROUTER_CELLULAR"
    | "TESTER"
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
    // Específico para Gateways & Celular
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

/**
 * Adaptador canónico y estricto de CatalogProduct a CatalogDevice.
 * Mapea explícitamente todos los campos técnicos sin casts inseguros (as any / as CatalogDevice).
 */
export function catalogProductToCatalogDevice(prod: CatalogProduct): CatalogDevice {
  // 1. Mapeo semántico exhaustivo de categoría según tipo y especificaciones
  let category: CatalogDevice["category"] = "ACCESSORY";
  if (prod.deviceType === "ACCESS_POINT") {
    const isWifi7 = prod.standards.some(s => s.toLowerCase().includes("wi-fi 7") || s.toLowerCase().includes("802.11be")) ||
      (prod.polymorphicSpecs?.accessPoint?.wirelessStandards.some(s => s.toLowerCase().includes("wi-fi 7") || s.toLowerCase().includes("802.11be")) ?? false);
    category = isWifi7 ? "WIFI_7" : "WIFI_6";
  } else if (prod.deviceType === "SWITCH") {
    if (prod.sku === "ECS5512F") {
      category = "SWITCH_FIBER_L3";
    } else if (prod.sku === "ECS2512FP" || prod.sku === "ECS5512FP" || prod.sku === "ECS2510FP" || prod.sku === "ECS2530FP") {
      category = "SWITCH_MULTIGIG";
    } else {
      category = "SWITCH_GIGABIT";
    }
  } else if (prod.deviceType === "GATEWAY") {
    category = "GATEWAY_SDWAN";
  } else if (prod.deviceType === "ROUTER_CELLULAR") {
    category = "ROUTER_CELLULAR";
  } else if (prod.deviceType === "TESTER") {
    category = "TESTER";
  } else if (prod.deviceType === "FIBER_OPTIC" || prod.category === "fibra") {
    category = "SWITCH_FIBER_L3";
  } else {
    category = "ACCESSORY";
  }

  // 2. Mapeo de especificaciones polimórficas técnicas
  const polyAp = prod.polymorphicSpecs?.accessPoint;
  const polySw = prod.polymorphicSpecs?.switch;
  const polyGw = prod.polymorphicSpecs?.gateway;

  const wirelessStandards = polyAp?.wirelessStandards || (prod.deviceType === "ACCESS_POINT" ? prod.standards : undefined);
  const bands = polyAp?.frequencyBands;
  const mimo = polyAp?.mimo;
  const maxSpeed = polyAp?.maxPhysicalRate;

  const portsCount = polySw?.portDensity || (prod.deviceType === "SWITCH" ? `${prod.interfaces.length} interfaces` : undefined);
  const poeBudget = prod.poeBudgetWatts !== undefined && prod.poeBudgetWatts > 0 ? `${prod.poeBudgetWatts}W` : (polySw?.poeBudgetWatts ? `${polySw.poeBudgetWatts}W` : undefined);
  const uplinks = polySw?.uplinkPorts ? polySw.uplinkPorts.join(", ") : undefined;
  let layer: "L2+" | "L3" | "Unmanaged" | undefined = undefined;
  if (polySw?.switchingLayer === "L3" || polySw?.switchingLayer === "L3 Lite") {
    layer = "L3";
  } else if (polySw?.switchingLayer === "L2+") {
    layer = "L2+";
  }

  const throughput = polyGw?.firewallThroughput || prod.firewallThroughput;
  const wanPorts = polyGw?.wanPorts;
  const vpnFeatures = polyGw?.vpnProtocols;

  // 3. Recomendación de Bundle en formato legible
  const recommendedBundle = prod.recommendedBundle
    ? `${prod.recommendedBundle.name} (${prod.recommendedBundle.rationale})`
    : "";

  return {
    sku: prod.sku,
    brand: prod.brand,
    name: prod.name,
    type: prod.deviceType,
    category,
    shortDesc: prod.description.length > 120 ? `${prod.description.slice(0, 117)}...` : prod.description,
    recommendedBundle,
    productUrl: prod.url,
    specs: {
      wirelessStandards,
      bands,
      mimo,
      maxSpeed,
      portsCount,
      poeBudget,
      uplinks,
      layer,
      throughput,
      wanPorts,
      vpnFeatures,
      interfaces: prod.interfaces,
      powerSource: prod.powerRequirements,
      management: `${prod.managementMode} EnGenius Cloud`
    },
    keyAdvantages: prod.keyAdvantages,
    notebookSource: prod.notebookSource.title,
    notebookSourceId: prod.notebookSource.sourceId
  };
}

/**
 * Catálogo derivado en runtime a partir de la fuente canónica ECOMSHOP_FULL_CATALOG.
 * Mantiene 100% de compatibilidad hacia atrás con cualquier consumidor de CatalogDevice.
 */
export const ECOMSHOP_CATALOG: CatalogDevice[] = ECOMSHOP_FULL_CATALOG.map(catalogProductToCatalogDevice);

/**
 * Consulta un dispositivo en el catálogo por su SKU (insensible a mayúsculas/minúsculas).
 * Resuelve directamente sobre la fuente canónica oficial.
 */
export function getCatalogDevice(sku: string): CatalogDevice | undefined {
  if (!sku) return undefined;
  const prod = findCatalogProduct(sku);
  if (prod) {
    return catalogProductToCatalogDevice(prod);
  }
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
 * Adaptador directo desde CatalogProduct hacia StarProduct.
 */
export function catalogProductToStarProduct(product: CatalogProduct): StarProduct {
  let cat: StarProduct["category"] = "engenius";
  if (product.deviceType === "ACCESS_POINT") cat = "wifi";
  else if (product.deviceType === "SWITCH") cat = "switches";
  else if (product.deviceType === "GATEWAY") cat = "gateways";
  else if (product.deviceType === "ACCESSORY") cat = product.category === "fibra" ? "fibra" : "accesorios";
  else cat = "engenius";

  return {
    id: product.id,
    name: product.name,
    model: product.sku,
    category: cat,
    description: product.description,
    url: product.url,
    imageUrl: product.imageUrl,
    specs: product.specs.length > 0 ? product.specs : product.keyAdvantages
  };
}

/**
 * Adaptador hacia StarProduct para compatibilidad con módulos legados.
 */
export function catalogDeviceToStarProduct(device: CatalogDevice): StarProduct {
  const prod = findCatalogProduct(device.sku);
  if (prod) {
    return catalogProductToStarProduct(prod);
  }

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
