import { Storage } from "@google-cloud/storage";
import type { CatalogProduct, DeviceType } from "@/lib/data/ecomshop-catalog";

const DEFAULT_MASTER_BUCKET = "fotosecomspain";
const DEFAULT_MASTER_OBJECT = "catalogo/catalogo_maestro.json";
const CACHE_TTL_MS = 60_000;

export interface CatalogMasterAssets {
  datasheetUrl?: string;
  datasheetPath?: string;
  imageUrl?: string;
  imageUrls: string[];
  sourceUrls: string[];
}

export interface CatalogMasterRecord {
  sku: string;
  model: string;
  name: string;
  brand: string;
  description: string;
  url: string;
  imageUrl: string;
  specs: string[];
  interfaces: string[];
  powerRequirements?: string;
  poeType?: CatalogProduct["poeType"];
  poeBudgetWatts?: number;
  priceEur?: number;
  stockStatus?: CatalogProduct["stockStatus"];
  deviceType?: DeviceType;
  category?: CatalogProduct["category"];
  rawSpecs: string[];
  assets: CatalogMasterAssets;
  raw: Record<string, unknown>;
}

let cached: { expiresAt: number; records: CatalogMasterRecord[] } | null = null;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return "";
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[\\n;|]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function firstArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const values = stringArray(record[key]);
    if (values.length) return values;
  }
  return [];
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function inferDeviceType(value: string): DeviceType {
  const normalized = value.toLowerCase();
  if (normalized.includes("access") || normalized.includes("wifi") || normalized.includes("wi-fi")) return "ACCESS_POINT";
  if (normalized.includes("switch")) return "SWITCH";
  if (normalized.includes("router") || normalized.includes("4g") || normalized.includes("5g")) return "ROUTER_CELLULAR";
  if (normalized.includes("gateway")) return "GATEWAY";
  if (normalized.includes("fibra") || normalized.includes("fiber") || normalized.includes("sfp")) return "FIBER_OPTIC";
  if (normalized.includes("tester") || normalized.includes("test")) return "TESTER";
  if (normalized.includes("cctv") || normalized.includes("camera") || normalized.includes("cámara")) return "CCTV_CAMERA";
  if (normalized.includes("cpe") || normalized.includes("ptp")) return "CPE_PTP";
  return "ACCESSORY";
}

function inferCategory(value: string): CatalogProduct["category"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("wifi") || normalized.includes("wi-fi") || normalized.includes("access")) return "wifi";
  if (normalized.includes("switch")) return "switches";
  if (normalized.includes("gateway")) return "gateways";
  if (normalized.includes("fibra") || normalized.includes("fiber")) return "fibra";
  if (normalized.includes("cpe") || normalized.includes("ptp")) return "cpe_ptp";
  if (normalized.includes("cctv") || normalized.includes("camera")) return "cctv";
  if (normalized.includes("poe")) return "poe_injectors";
  if (normalized.includes("transceiver") || normalized.includes("sfp")) return "transceivers";
  if (normalized.includes("tester") || normalized.includes("test")) return "testers";
  return "accesorios";
}

function normalizeRecord(raw: Record<string, unknown>): CatalogMasterRecord | null {
  const sku = firstText(raw, ["referencia_modelo", "referencia", "sku", "SKU", "modelo", "model", "codigo"]);
  if (!sku) return null;

  const model = firstText(raw, ["modelo", "model", "referencia_modelo", "sku"]) || sku;
  const name = firstText(raw, ["titulo", "title", "nombre", "name", "product_name"]) || model;
  const brand = firstText(raw, ["marca", "brand", "fabricante", "manufacturer"]) || "EcomShop";
  const description = firstText(raw, [
    "descripcion_enriquecida",
    "descripcion",
    "description",
    "texto_enriquecido",
    "web_description",
    "contenido"
  ]);
  const url = firstText(raw, ["url", "url_producto", "product_url", "web_url"]);
  const imageUrls = firstArray(raw, ["fotos", "imagenes", "imageUrls", "image_urls", "photos"]);
  const imageUrl = firstText(raw, [
    "foto_optimizada_url",
    "imagen_optimizada_url",
    "imageUrl",
    "image_url",
    "foto_url",
    "imagen_url",
    "foto",
    "imagen"
  ]) || imageUrls[0] || "";

  const specs = firstArray(raw, [
    "especificaciones_tecnicas",
    "especificaciones",
    "specs",
    "technical_specs",
    "caracteristicas",
    "features"
  ]);
  const interfaces = firstArray(raw, ["puertos", "interfaces", "ports", "port_list"]);
  const rawSpecs = [...new Set([...specs, ...interfaces, description].filter(Boolean))];

  const datasheetUrl = firstText(raw, [
    "datasheet_url",
    "pdf_datasheet_url",
    "datasheet",
    "pdf_url",
    "pdf",
    "ficha_tecnica_url"
  ]);
  const datasheetPath = firstText(raw, ["datasheet_path", "pdf_path", "ficha_tecnica_path"]);

  const categoryValue = firstText(raw, ["category", "categoria", "familia", "tipo", "deviceType", "device_type"]);
  const deviceTypeValue = firstText(raw, ["deviceType", "device_type", "tipo_dispositivo"]);
  const inferredType = inferDeviceType([categoryValue, name, description].filter(Boolean).join(" "));
  const inferredCategory = inferCategory([categoryValue, name, description].filter(Boolean).join(" "));

  return {
    sku: sku.toUpperCase(),
    model,
    name,
    brand,
    description,
    url,
    imageUrl,
    specs,
    interfaces,
    powerRequirements: firstText(raw, ["powerRequirements", "power_requirements", "alimentacion", "alimentación"]),
    poeType: firstText(raw, ["poeType", "poe_type", "poe"]) as CatalogProduct["poeType"] | undefined,
    poeBudgetWatts: numberValue(raw.poeBudgetWatts ?? raw.poe_budget_watts ?? raw.presupuesto_poe_w),
    priceEur: numberValue(raw.priceEur ?? raw.price_eur ?? raw.pvd ?? raw.precio),
    stockStatus: firstText(raw, ["stockStatus", "stock_status", "stock"]) as CatalogProduct["stockStatus"] | undefined,
    deviceType: deviceTypeValue as DeviceType | undefined || inferredType,
    category: categoryValue as CatalogProduct["category"] | undefined || inferredCategory,
    rawSpecs,
    assets: {
      datasheetUrl: datasheetUrl || undefined,
      datasheetPath: datasheetPath || undefined,
      imageUrl: imageUrl || undefined,
      imageUrls,
      sourceUrls: [url, datasheetUrl].filter(Boolean)
    },
    raw
  };
}

function extractRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"));
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["data", "products", "catalog", "items", "productos"]) {
    const value = object[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    }
  }
  return [];
}

export function getCatalogMasterBucketName(): string {
  return process.env.CATALOG_MASTER_BUCKET?.trim() || DEFAULT_MASTER_BUCKET;
}

export function getCatalogMasterObjectName(): string {
  return process.env.CATALOG_MASTER_OBJECT?.trim() || DEFAULT_MASTER_OBJECT;
}

export async function getCatalogMasterRecords(forceRefresh = false): Promise<CatalogMasterRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now) return cached.records;

  const storage = new Storage();
  const bucket = storage.bucket(getCatalogMasterBucketName());
  const file = bucket.file(getCatalogMasterObjectName());
  const [contents] = await file.download();
  const payload: unknown = JSON.parse(contents.toString("utf-8"));
  const records = extractRecords(payload).map(normalizeRecord).filter((record): record is CatalogMasterRecord => Boolean(record));

  if (records.length === 0) {
    throw new Error("CATALOG_MASTER_EMPTY: El catálogo maestro no contiene productos reconocibles.");
  }

  cached = { expiresAt: now + CACHE_TTL_MS, records };
  return records;
}

export async function getCatalogMasterRecord(sku: string): Promise<CatalogMasterRecord | undefined> {
  const requested = sku.trim().toUpperCase();
  if (!requested) return undefined;
  const records = await getCatalogMasterRecords();
  return records.find((record) => record.sku === requested || record.model.trim().toUpperCase() === requested);
}

export function mergeMasterIntoCatalogProduct(
  base: CatalogProduct,
  master: CatalogMasterRecord
): CatalogProduct {
  const mergedSpecs = master.specs.length ? master.specs : base.specs;
  const mergedInterfaces = master.interfaces.length ? master.interfaces : base.interfaces;
  const mergedDescription = master.description || base.description;
  const mergedImageUrl = master.imageUrl || base.imageUrl;
  const mergedUrl = master.url || base.url;

  return {
    ...base,
    sku: master.sku,
    model: master.model || base.model,
    name: master.name || base.name,
    brand: master.brand || base.brand,
    description: mergedDescription,
    url: mergedUrl,
    imageUrl: mergedImageUrl,
    specs: mergedSpecs,
    interfaces: mergedInterfaces,
    powerRequirements: master.powerRequirements || base.powerRequirements,
    poeType: master.poeType || base.poeType,
    poeBudgetWatts: master.poeBudgetWatts ?? base.poeBudgetWatts,
    priceEur: master.priceEur ?? base.priceEur,
    stockStatus: master.stockStatus || base.stockStatus,
    rawSpecs: [...new Set([...(base.rawSpecs || []), ...master.rawSpecs])],
    masterAssets: master.assets
  };
}

export function catalogMasterRecordToCatalogProduct(master: CatalogMasterRecord): CatalogProduct {
  const deviceType = master.deviceType || inferDeviceType([master.name, master.description].join(" "));
  const category = master.category || inferCategory([master.name, master.description].join(" "));
  return {
    id: master.sku.toLowerCase(),
    sku: master.sku,
    model: master.model,
    name: master.name,
    brand: master.brand,
    deviceType,
    category,
    description: master.description || "Producto del catálogo maestro EcomSpain.",
    url: master.url || "https://ecomshop.es",
    imageUrl: master.imageUrl || "/images/products/default.png",
    priceEur: master.priceEur ?? 0,
    stockStatus: master.stockStatus || "UNKNOWN",
    specs: master.specs,
    interfaces: master.interfaces,
    powerRequirements: master.powerRequirements || "Consultar ficha técnica.",
    poeType: master.poeType || "NONE",
    powerConsumptionWatts: 0,
    managementMode: "Standalone",
    standards: [],
    keyAdvantages: [],
    rawSpecs: master.rawSpecs,
    masterAssets: master.assets,
    recommendedBundle: {
      sku: "",
      name: "",
      relationshipType: "ACCESSORY",
      rationale: ""
    },
    notebookSource: {
      sourceId: master.assets.datasheetPath || master.assets.datasheetUrl || "catalog-master-gcs",
      title: master.assets.datasheetUrl ? "Datasheet del catálogo maestro EcomSpain" : "Catálogo maestro EcomSpain",
      type: master.assets.datasheetUrl ? "datasheet" : "url",
      url: master.assets.datasheetUrl || master.url || undefined,
      rationale: "Registro consolidado desde gs://fotosecomspain/catalogo/catalogo_maestro.json."
    },
    notebookSourceId: master.assets.datasheetPath || master.assets.datasheetUrl,
    lifecycleStatus: "VERIFIED",
    actionTitle: master.name,
    targetSegment: "B2B",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Evaluar coste total de propiedad y adecuación al proyecto.",
      engineeringPerformance: "Basar la decisión en las especificaciones verificadas del catálogo maestro.",
      operationsDeployment: "Priorizar una implantación trazable y compatible con el entorno existente."
    },
    sectorAffinity: {},
    businessGoalAffinity: {}
  };
}
