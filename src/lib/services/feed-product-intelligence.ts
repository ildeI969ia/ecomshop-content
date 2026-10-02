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
      standards: [...product.standards],
      ports: [...product.interfaces],
      powerRequirements: product.powerRequirements,
      management: product.managementMode,
      keyDifferentiators: [...product.keyAdvantages],
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
      executiveRoi: product.commercialAngles.executiveRoi,
      engineeringPerformance: product.commercialAngles.engineeringPerformance,
      operationsDeployment: product.commercialAngles.operationsDeployment
    },
    complementaryProducts: product.recommendedBundle?.sku
      ? [{
          skuOrCategory: product.recommendedBundle.sku,
          relationshipType: product.recommendedBundle.relationshipType,
          reason: product.recommendedBundle.rationale
        }]
      : [],
    generatedAt: new Date().toISOString()
  };

  const deviceType = product.deviceType;
  const naturalSector =
    product.sectorAffinity["LOGISTICS_INDUSTRY"] >= product.sectorAffinity["ENTERPRISE_OFFICE"]
      ? "LOGISTICS_INDUSTRY"
      : product.sectorAffinity["HOSPITALITY"] >= product.sectorAffinity["ENTERPRISE_OFFICE"]
        ? "HOSPITALITY"
        : product.sectorAffinity["EDUCATION_CAMPUS"] >= product.sectorAffinity["ENTERPRISE_OFFICE"]
          ? "EDUCATION_CAMPUS"
          : "ENTERPRISE_OFFICE";

  const recommendedAngle = product.defaultAngle;
  const recommendedTone =
    product.targetSegment.toLowerCase().includes("instal")
      ? "CHANNEL_INSTALLER"
      : product.targetSegment.toLowerCase().includes("director") || product.targetSegment.toLowerCase().includes("tic")
        ? "C_LEVEL_TCO"
        : "ENGINEERING_PREVENTA";

  return {
    sku: product.sku,
    model: product.model,
    brand: product.brand,
    naturalSector,
    naturalAudience: product.targetSegment,
    recommendedAngle,
    recommendedTone,
    recommendedCompetitor: "NONE",
    mandatoryElectronics: {
      recommendedSwitchSku: product.recommendedBundle?.sku || "",
      recommendedSwitchName: product.recommendedBundle?.name || "",
      reason: product.recommendedBundle?.rationale || "",
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
