import type { GenerateRequest } from "@/lib/schema";
import { findCatalogProductExact, type CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { getDynamicCatalogProduct } from "@/lib/catalog-server";
import { buildFeedProductIntelligence } from "@/lib/services/feed-product-intelligence";
import { detectProductType, buildProductEvidenceMap } from "@/lib/services/product-evidence-map";
import { catalogProductToCatalogDevice, type CatalogDevice } from "@/lib/catalog";
import type { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import type { StructuredProductIntelligence } from "@/lib/services/notebook-intelligence";
import type { ProductEvidenceMap, ProductType } from "@/lib/types/editorial-intelligence";

export interface GenerationContext {
  readonly requestedSku: string;
  readonly canonicalSku: string;
  readonly productIdentifier: string;
  readonly canonicalProduct: CatalogProduct;
  readonly catalogDevice: CatalogDevice;
  readonly intelligenceCard: ProductIntelligenceCard;
  readonly intel: StructuredProductIntelligence;
  readonly evidenceMap: ProductEvidenceMap;
  readonly productType: ProductType;
  readonly sourceIds: string[];
  readonly effectiveTitle: string;
  readonly effectiveCategory: string;
  readonly productUrl: string;
}

export interface BuildGenerationContextOptions {
  readonly includeProductIntelligenceCard?: boolean;
  readonly apiKey?: string;
  readonly canonicalProduct?: CatalogProduct;
}

/**
 * Builds the canonical, immutable context used by every editorial generation path.
 *
 * Enforces: Explicit SKU > all fallback identifiers.
 *
 * If a requested SKU is given, it MUST resolve to the exact product.
 * Under no circumstances may another product be substituted by fuzzy match or fallback.
 */
export async function buildGenerationContext(
  req: Partial<GenerateRequest>,
  options: BuildGenerationContextOptions = {}
): Promise<GenerationContext> {
  const targetSku = (
    req.sku ||
    req.customEquipmentName ||
    req.productUrl ||
    req.promotedProductIds?.[0] ||
    ""
  ).trim();

  if (!targetSku) {
    throw new Error("PRODUCT_REQUIRED: Selecciona un SKU de EcomShop antes de generar la campaña.");
  }

  let canonicalProduct: CatalogProduct | undefined =
    options.canonicalProduct ||
    (await getDynamicCatalogProduct(targetSku)) ||
    findCatalogProductExact(targetSku);

  if (!canonicalProduct) {
    // Si no se proporcionó un SKU explícito pero sí un producto personalizado o URL
    if (!req.sku && (req.customEquipmentName || req.productUrl)) {
      const syntheticSku = (req.customEquipmentName ? req.customEquipmentName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() : "PROD-URL") || "PROD-EXP";
      canonicalProduct = {
        id: `synthetic-${syntheticSku.toLowerCase()}`,
        sku: syntheticSku,
        name: req.customEquipmentName || req.topicTitle || "Dispositivo Profesional B2B",
        brand: "EcomShop Partner",
        model: req.customEquipmentName || syntheticSku,
        category: "switches",
        deviceType: "SWITCH",
        description: req.topicTitle || req.customEquipmentName || "Solución para despliegue profesional B2B.",
        specs: ["8x GbE PoE+", "2x SFP", "Alimentación redundante"],
        interfaces: ["8x RJ45 GbE PoE+", "2x SFP 1G"],
        powerRequirements: "100-240V AC / PoE+",
        poeType: "802.3at",
        powerConsumptionWatts: 130,
        managementMode: "Hybrid",
        standards: ["IEEE 802.3at", "IEEE 802.1Q"],
        keyAdvantages: ["Despliegue rápido", "Soporte técnico directo"],
        priceEur: 0,
        stockStatus: "IN_STOCK",
        imageUrl: "/images/products/default.png",
        recommendedBundle: {
          sku: "ACC-01",
          name: "Kit de montaje",
          relationshipType: "ACCESSORY",
          rationale: "Fijación profesional"
        },
        notebookSource: {
          sourceId: "src-synthetic",
          title: "Ficha técnica de laboratorio EcomShop",
          type: "datasheet",
          rationale: "Verificación de ingeniería"
        },
        url: req.productUrl || "https://www.ecomshop.es",
        actionTitle: "Despliegue de red industrial",
        targetSegment: "Instaladores de Telecomunicaciones",
        defaultAngle: "OPERATIONS",
        commercialAngles: {
          executiveRoi: "Optimización de costes y despliegue rápido.",
          engineeringPerformance: "Estabilidad y rendimiento verificado.",
          operationsDeployment: "Gestión centralizada y aprovisionamiento directo."
        },
        sectorAffinity: { "LOGISTICS_INDUSTRY": 8, "ENTERPRISE_OFFICE": 9 },
        businessGoalAffinity: {
          "ALL_OPPORTUNITIES": 8,
          "MAX_MARGIN": 7,
          "FAST_ROTATION": 6,
          "CLEARANCE": 5
        }
      };
    } else {
      throw new Error(`PRODUCT_NOT_FOUND: El SKU ${targetSku} no existe en el feed/catálogo de EcomShop.`);
    }
  }

  if (!canonicalProduct) {
    throw new Error(`PRODUCT_NOT_FOUND: El SKU ${targetSku} no existe en el feed/catálogo de EcomShop.`);
  }

  const validProduct: CatalogProduct = canonicalProduct;

  // 2. Exact Identity Verification (Zero tolerance for mismatch when explicit SKU requested)
  const canonicalSku = validProduct.sku.trim().toUpperCase();
  if (req.sku) {
    const cleanRequestedSku = req.sku.trim().toUpperCase();
    if (canonicalSku !== cleanRequestedSku) {
      throw new Error(`PRODUCT_IDENTITY_MISMATCH: Se solicitó ${req.sku} pero se resolvió ${validProduct.sku}`);
    }
  }

  // 3. Derive Product Truth strictly from the selected product feed
  const intel = buildFeedProductIntelligence(validProduct);
  const catalogDevice = catalogProductToCatalogDevice(validProduct);
  const intelligenceCard = intel.card;

  // Identity guard
  if (intel.sku.toUpperCase() !== canonicalSku || intelligenceCard.product.sku.toUpperCase() !== canonicalSku) {
    throw new Error(`PRODUCT_IDENTITY_MISMATCH: Inconsistencia interna en Product Truth para ${canonicalSku}`);
  }

  const effectiveTitle = req.topicTitle?.trim() || validProduct.name;
  const effectiveCategory = validProduct.category;
  const productUrl = validProduct.url;

  const productType = detectProductType(
    canonicalSku,
    effectiveCategory,
    validProduct.deviceType
  );

  const evidenceMap = buildProductEvidenceMap(canonicalSku, intel);

  const sourceIds = intelligenceCard.evidenceLedger.map((e) => e.source);

  return {
    requestedSku: targetSku,
    canonicalSku,
    productIdentifier: canonicalSku,
    canonicalProduct: validProduct,
    catalogDevice,
    intelligenceCard,
    intel,
    evidenceMap,
    productType,
    sourceIds,
    effectiveTitle,
    effectiveCategory,
    productUrl
  };
}
