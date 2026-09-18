import { ProductEvidenceClaimSchema, ProductIntelligenceCardSchema } from "../src/lib/schema/product-intelligence";
import { ProductIntelligenceCard } from "../src/lib/types/product-intelligence";

const testCard: ProductIntelligenceCard = {
  product: {
    brand: "EnGenius",
    model: "ECW536",
    sku: "ECW536",
    category: "engenius",
    url: "https://www.ecomshop.es/engenius-ecw536",
    stockStatus: "IN_STOCK"
  },
  technicalSpecs: {
    standards: ["Wi-Fi 7 (802.11be)", "PoE++ (802.3bt)"],
    ports: ["1x 10GbE RJ45", "1x 2.5GbE RJ45"],
    powerRequirements: "PoE++ 802.3bt (60W) o adaptador DC",
    management: "EnGenius Cloud / Standalone",
    keyDifferentiators: [
      "Tri-band 4096-QAM",
      "Sin cuotas ni licencias anuales obligatorias",
      "Aprovisionamiento instantáneo vía QR"
    ]
  },
  evidenceLedger: [
    {
      claim: "Soporta anchos de canal de 320 MHz y modulación 4096-QAM.",
      source: "https://www.ecomshop.es/engenius-ecw536",
      sourceType: "DATASHEET",
      confidence: "HIGH",
      verified: true
    },
    {
      claim: "Disponibilidad con stock en España y envío en 24h.",
      source: "https://www.ecomshop.es",
      sourceType: "ECOMSHOP_WEB",
      confidence: "HIGH",
      verified: true
    }
  ],
  commercialAngles: {
    executiveRoi: "Ahorro de más del 40% en TCO a 3 años por ausencia de cuotas cloud.",
    engineeringPerformance: "Caudal de 18.7 Gbps agregados y puerto 10GbE PoE++.",
    operationsDeployment: "Aprovisionamiento en minutos desde la app EnGenius Cloud To-Go."
  },
  complementaryProducts: [
    {
      skuOrCategory: "ECS2512FP",
      relationshipType: "REQUIRES_POE_SWITCH",
      reason: "Switch Multi-Gigabit 2.5G con PoE++ 802.3bt necesario para alimentar el AP a máximo rendimiento."
    }
  ],
  generatedAt: new Date().toISOString()
};

const result = ProductIntelligenceCardSchema.safeParse(testCard);
if (!result.success) {
  console.error("Validation failed:", result.error);
  process.exit(1);
} else {
  console.log("SUCCESS: ProductIntelligenceCard and EvidenceLedger passed strict Zod validation.");
}
