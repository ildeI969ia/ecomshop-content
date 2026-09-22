export type DeviceType = "ACCESS_POINT" | "SWITCH" | "GATEWAY" | "ACCESSORY";

export interface ProductEvidenceClaim {
  claim: string;
  source: string; // URL, Datasheet, Manual
  sourceType: "ECOMSHOP_WEB" | "DATASHEET" | "MANUFACTURER_FAQ" | "SEARCH_GROUNDING";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  verified: boolean;
}

export interface ProductComplementaryItem {
  skuOrCategory: string;
  relationshipType: "REQUIRES_POE_SWITCH" | "ACCESSORY" | "COMPATIBLE_TRANSCEIVER";
  reason: string;
}

export interface ProductIntelligenceCard {
  product: {
    brand: string;
    model: string;
    sku: string;
    ean?: string;
    category: string;
    url?: string;
    stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  };
  technicalSpecs: {
    deviceType?: DeviceType;
    standards: string[]; // e.g. ["Wi-Fi 7 (802.11be)", "PoE+ (802.3at)"] or firewall/VPN specs
    ports: string[];     // e.g. ["1x 2.5GbE RJ45", "1x GbE RJ45"]
    powerRequirements: string;
    management: string; // e.g. "EnGenius Cloud / Standalone"
    keyDifferentiators: string[];

    // Campos polimórficos especializados
    wirelessStandards?: string[];
    frequencyBands?: string[];
    mimo?: string;
    switchingCapacity?: string;
    switchingLayer?: string;
    poeBudget?: string;
    uplinks?: string[];
    firewallThroughput?: string;
    vpnProtocols?: string[];
    wanFailover?: boolean;
    hasWifiRadios?: boolean;
    isCableOnly?: boolean;
  };
  evidenceLedger: ProductEvidenceClaim[];
  commercialAngles: {
    executiveRoi: string;
    engineeringPerformance: string;
    operationsDeployment: string;
  };
  complementaryProducts: ProductComplementaryItem[];
  generatedAt: string;
}
