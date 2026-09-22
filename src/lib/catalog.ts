import {
  CatalogProduct,
  CatalogProductBundle,
  CatalogNotebookSource,
  CatalogCommercialAngles,
  DeviceType,
  ECOMSHOP_FULL_CATALOG,
  findCatalogProduct,
  getAllCatalogProducts
} from "./data/ecomshop-catalog";
import type { StarProduct } from "./knowledge";

export {
  type CatalogProduct,
  type CatalogProductBundle,
  type CatalogNotebookSource,
  type CatalogCommercialAngles,
  type DeviceType,
  findCatalogProduct,
  getAllCatalogProducts
};

export const ECOMSHOP_CATALOG: CatalogProduct[] = ECOMSHOP_FULL_CATALOG;

export type DeviceHardwareCategory =
  | "WIFI_7"
  | "WIFI_6"
  | "SWITCH_MULTIGIG"
  | "SWITCH_GIGABIT"
  | "SWITCH_FIBER_L3"
  | "GATEWAY_SDWAN"
  | "ACCESSORY";

export interface CatalogDeviceSpecs {
  wirelessStandards?: string[];
  bands?: string[];
  mimo?: string;
  maxSpeed?: string;
  layer?: "L2+" | "L3" | "Unmanaged" | string;
  portsCount?: string;
  uplinks?: string;
  throughput?: string;
  wanPorts?: string;
  vpnFeatures?: string[];
  interfaces: string[];
  powerSource: string;
  management: string;
  poeBudget?: string;
}

export interface CatalogDevice {
  brand: string;
  sku: string;
  name: string;
  type: DeviceType;
  category: DeviceHardwareCategory;
  shortDesc: string;
  recommendedBundle: string;
  productUrl: string;
  specs: CatalogDeviceSpecs;
  keyAdvantages: string[];
  notebookSource: string;
  notebookSourceId?: string;
}

/**
 * Obtiene la ficha de inteligencia adaptativa de hardware según el SKU o modelo.
 */
export function getCatalogDevice(query: string): CatalogDevice | undefined {
  const prod = findCatalogProduct(query);
  if (!prod) return undefined;

  let type: DeviceType = prod.deviceType || "ACCESSORY";
  let category: DeviceHardwareCategory = "ACCESSORY";

  if (type === "ACCESS_POINT" || prod.category === "wifi") {
    type = "ACCESS_POINT";
    const isW7 =
      prod.standards.some((s) => s.toLowerCase().includes("wi-fi 7")) ||
      prod.specs.some((s) => s.toLowerCase().includes("wi-fi 7"));
    category = isW7 ? "WIFI_7" : "WIFI_6";
  } else if (type === "SWITCH" || prod.category === "switches") {
    type = "SWITCH";
    const isMultiGig = prod.specs.some(
      (s) =>
        s.includes("2.5G") ||
        s.includes("10G") ||
        s.toLowerCase().includes("multi-gig")
    );
    category = isMultiGig ? "SWITCH_MULTIGIG" : "SWITCH_GIGABIT";
  } else if (prod.category === "fibra") {
    type = "SWITCH";
    category = "SWITCH_FIBER_L3";
  } else if (type === "GATEWAY" || prod.category === "gateways") {
    type = "GATEWAY";
    category = "GATEWAY_SDWAN";
  } else {
    type = "ACCESSORY";
    category = "ACCESSORY";
  }

  let bands: string[] | undefined = undefined;
  let mimo: string | undefined = undefined;
  let maxSpeed: string | undefined = undefined;
  if (type === "ACCESS_POINT") {
    const isTriBand =
      prod.specs.some((s) => s.toLowerCase().includes("tri-band")) ||
      prod.standards.some((s) => s.toLowerCase().includes("tri-band"));
    bands = isTriBand ? ["2.4 GHz", "5 GHz", "6 GHz"] : ["2.4 GHz", "5 GHz"];
    const mimoSpec =
      prod.standards.find((s) => s.includes("4x4") || s.includes("2x2")) ||
      prod.specs.find((s) => s.includes("4x4") || s.includes("2x2"));
    mimo =
      mimoSpec ||
      (prod.sku.includes("536") || prod.sku.includes("546")
        ? "4x4:4 Tri-Band concurrente"
        : "2x2:2 Dual-Band");
    maxSpeed = prod.specs.find((s) => s.includes("Gbps") || s.includes("Mbps"));
  }

  let layer: string | undefined = undefined;
  let portsCount: string | undefined = undefined;
  let uplinks: string | undefined = undefined;
  if (type === "SWITCH") {
    layer = prod.specs.some((s) => s.toLowerCase().includes("l3")) ? "L3" : "L2+";
    portsCount =
      prod.specs.find(
        (s) =>
          s.toLowerCase().includes("puerto") ||
          s.includes("8x") ||
          s.includes("24x") ||
          s.includes("12x")
      ) || `${prod.interfaces.length} Interfaces de Conmutación`;
    uplinks =
      prod.fiberLinks ||
      prod.specs.find((s) => s.includes("SFP") || s.includes("Uplink")) ||
      "4x 10G SFP+";
  }

  let throughput: string | undefined = undefined;
  let wanPorts: string | undefined = undefined;
  let vpnFeatures: string[] | undefined = undefined;
  if (type === "GATEWAY") {
    throughput = prod.firewallThroughput || "1.0 Gbps IDS/IPS";
    wanPorts =
      prod.interfaces.find((i) => i.toLowerCase().includes("wan")) ||
      "Dual WAN 2.5 GbE Failover";
    vpnFeatures = ["Auto-VPN Mesh", "WireGuard", "IPsec", "OpenVPN Client/Server"];
  }

  return {
    brand: prod.brand,
    sku: prod.sku,
    name: prod.name,
    type,
    category,
    shortDesc: prod.description,
    recommendedBundle: prod.recommendedBundle?.sku || "ECS2512FP",
    productUrl: prod.url,
    specs: {
      wirelessStandards:
        type === "ACCESS_POINT"
          ? prod.standards.length
            ? prod.standards
            : ["Wi-Fi 7 (IEEE 802.11be)", "WPA3 Enterprise"]
          : undefined,
      bands,
      mimo,
      maxSpeed,
      layer,
      portsCount,
      uplinks,
      throughput,
      wanPorts,
      vpnFeatures,
      interfaces: prod.interfaces.length ? prod.interfaces : ["1x RJ45 Gigabit PoE+"],
      powerSource: prod.powerRequirements || "PoE (802.3at/bt)",
      management: prod.managementMode
        ? `EnGenius ${prod.managementMode} (Zero Licencias)`
        : "EnGenius Cloud To-Go",
      poeBudget: prod.poeBudgetWatts ? `${prod.poeBudgetWatts}W` : undefined
    },
    keyAdvantages:
      prod.keyAdvantages && prod.keyAdvantages.length
        ? prod.keyAdvantages
        : [
            "Tecnología oficial respaldada por el catálogo de ingeniería EcomShop",
            "Soporte preventa directo y sustitución avanzada en 24h",
            "Gestión en la nube sin costes de licenciamiento obligatorio"
          ],
    notebookSource:
      prod.notebookSource.sourceId ||
      `${prod.notebookSource.title} (${prod.notebookSource.sourceId})`,
    notebookSourceId: prod.notebookSource.sourceId
  };
}

/**
 * Convierte un CatalogDevice canónico a la interfaz StarProduct
 */
export function catalogDeviceToStarProduct(device: CatalogDevice): StarProduct {
  const specsList: string[] = [];
  if (device.specs.wirelessStandards?.length) specsList.push(device.specs.wirelessStandards[0]);
  if (device.specs.maxSpeed) specsList.push(device.specs.maxSpeed);
  if (device.specs.portsCount) specsList.push(device.specs.portsCount);
  if (device.specs.poeBudget) specsList.push(`PoE Budget: ${device.specs.poeBudget}`);
  if (device.specs.layer) specsList.push(`Capa: ${device.specs.layer}`);
  if (device.specs.throughput) specsList.push(device.specs.throughput);
  if (device.specs.management) specsList.push(device.specs.management);

  const prod = findCatalogProduct(device.sku);

  let category: StarProduct["category"] = "engenius";
  if (device.type === "ACCESS_POINT") category = "wifi";
  else if (device.type === "SWITCH") category = "switches";
  else if (device.type === "GATEWAY") category = "gateways";
  else category = "accesorios";

  return {
    id: prod?.id || device.sku.toLowerCase(),
    name: device.name,
    model: device.sku,
    category,
    description: device.shortDesc,
    url: device.productUrl || prod?.url || "",
    imageUrl: prod?.imageUrl || "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    specs: specsList.length > 0 ? specsList : (prod?.specs || ["Tecnología oficial EnGenius Cloud"])
  };
}

/**
 * Devuelve todos los dispositivos del catálogo oficial en formato CatalogDevice
 */
export function getAllCatalogDevices(): CatalogDevice[] {
  return ECOMSHOP_FULL_CATALOG.map((p) => getCatalogDevice(p.sku)!).filter(Boolean);
}
