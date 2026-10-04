import type { CatalogProduct } from "@/lib/data/ecomshop-catalog";
import type { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import type { StructuredProductIntelligence } from "./notebook-intelligence";

/**
 * Fuente canónica de verdad para generación editorial:
 * producto sincronizado desde el feed/ficha de EcomShop.
 *
 * No consulta NotebookLM ni ningún catálogo externo.
 * La IA puede redactar, pero no puede cambiar la identidad ni las especificaciones
 * que proceden del producto seleccionado.
 */
export function buildFeedProductIntelligence(product: CatalogProduct): StructuredProductIntelligence {
  const card: ProductIntelligenceCard = {
    product: {
      brand: product.brand,
      model: product.model,
      sku: product.sku,
      category: product.category,
      url: product.url,
      stockStatus: product.stockStatus
    },
    technicalSpecs: {
      deviceType: product.deviceType,
      standards: Array.isArray(product.standards) ? [...product.standards] : [],
      ports: Array.isArray(product.interfaces) ? [...product.interfaces] : [],
      powerRequirements: product.powerRequirements || "Consultar ficha",
      management: product.managementMode || "Cloud / Local",
      keyDifferentiators: Array.isArray(product.keyAdvantages) ? [...product.keyAdvantages] : [],
      poeBudget: product.poeBudgetWatts ? `${product.poeBudgetWatts}W` : undefined,
      switchingCapacity: product.polymorphicSpecs?.switch?.switchingCapacityGbps
        ? `${product.polymorphicSpecs.switch.switchingCapacityGbps} Gbps`
        : undefined,
      switchingLayer: product.polymorphicSpecs?.switch?.switchingLayer,
      uplinks: product.polymorphicSpecs?.switch?.uplinkPorts,
      wirelessStandards: product.polymorphicSpecs?.accessPoint?.wirelessStandards,
      frequencyBands: product.polymorphicSpecs?.accessPoint?.frequencyBands,
      mimo: product.polymorphicSpecs?.accessPoint?.mimo,
      firewallThroughput: product.firewallThroughput,
      vpnProtocols: product.polymorphicSpecs?.gateway?.vpnProtocols,
      wanFailover: product.polymorphicSpecs?.gateway?.wanFailover,
      hasWifiRadios: product.polymorphicSpecs?.gateway?.hasWifiRadios,
      isCableOnly: product.polymorphicSpecs?.gateway?.hasWifiRadios === false,
      mobileTechnology: product.polymorphicSpecs?.cellularRouter?.mobileTechnology,
      simSlots: product.polymorphicSpecs?.cellularRouter?.simSlots,
      dualSimFailover: product.polymorphicSpecs?.cellularRouter?.dualSimFailover,
      cellularSpeedDownstream: product.polymorphicSpecs?.cellularRouter?.cellularSpeedDownstream,
      gnssSupport: product.polymorphicSpecs?.cellularRouter?.gnssSupport,
      industrialInterfaces: product.polymorphicSpecs?.cellularRouter?.industrialInterfaces,
      testCapabilities: product.polymorphicSpecs?.tester?.testCapabilities,
      mediaSupported: product.polymorphicSpecs?.tester?.mediaSupported,
      batteryLifeHours: product.polymorphicSpecs?.tester?.batteryLifeHours,
      poeLoadTestWatts: product.polymorphicSpecs?.tester?.poeLoadTestWatts
    },
    evidenceLedger: [
      {
        claim: `${product.name}: ${product.description}`,
        source: product.url,
        sourceType: "ECOMSHOP_WEB",
        confidence: "HIGH",
        verified: true
      },
      ...product.specs.slice(0, 12).map((spec) => ({
        claim: spec,
        source: product.url,
        sourceType: "ECOMSHOP_WEB" as const,
        confidence: "HIGH" as const,
        verified: true
      }))
    ],
    commercialAngles: {
      executiveRoi: product.commercialAngles?.executiveRoi || "Optimización de costes y despliegue rápido.",
      engineeringPerformance: product.commercialAngles?.engineeringPerformance || "Estabilidad y rendimiento verificado.",
      operationsDeployment: product.commercialAngles?.operationsDeployment || "Gestión centralizada y aprovisionamiento directo."
    },
    // La campaña es monoproducto. Los bundles pueden existir en catálogo,
    // pero no forman parte del Product Truth editorial ni de la redacción.
    complementaryProducts: [],
    generatedAt: new Date().toISOString()
  };

  const deviceType = product.deviceType;
  const sectorAffinity = (product as any).sectorAffinity || { "LOGISTICS_INDUSTRY": 8, "ENTERPRISE_OFFICE": 9 };
  const naturalSector =
    (sectorAffinity["LOGISTICS_INDUSTRY"] ?? 0) >= (sectorAffinity["ENTERPRISE_OFFICE"] ?? 0)
      ? "LOGISTICS_INDUSTRY"
      : (sectorAffinity["HOSPITALITY"] ?? 0) >= (sectorAffinity["ENTERPRISE_OFFICE"] ?? 0)
        ? "HOSPITALITY"
        : (sectorAffinity["EDUCATION_CAMPUS"] ?? 0) >= (sectorAffinity["ENTERPRISE_OFFICE"] ?? 0)
          ? "EDUCATION_CAMPUS"
          : "ENTERPRISE_OFFICE";

  const recommendedAngle = (product as any).defaultAngle || "TCO_ROI";
  const targetSegment = (product as any).targetSegment || "enterprise";
  const recommendedTone =
    targetSegment.toLowerCase().includes("instal")
      ? "CHANNEL_INSTALLER"
      : targetSegment.toLowerCase().includes("director") || targetSegment.toLowerCase().includes("tic")
        ? "C_LEVEL_TCO"
        : "ENGINEERING_PREVENTA";

  return {
    sku: product.sku,
    model: product.model,
    brand: product.brand,
    naturalSector,
    naturalAudience: targetSegment,
    recommendedAngle,
    recommendedTone,
    recommendedCompetitor: "NONE",
    mandatoryElectronics: {
      recommendedSwitchSku: "",
      recommendedSwitchName: "",
      reason: "",
      portsAndUplink: product.interfaces.join(", ")
    },
    keyClaims: product.specs.slice(0, 12).map((claim) => ({
      claim,
      sourceId: product.url,
      sourceTitle: `Feed EcomShop — ${product.sku}`,
      verified: true
    })),
    objections: [],
    card
  };
}
