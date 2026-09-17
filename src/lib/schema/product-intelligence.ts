import { z } from "zod";

export const ProductEvidenceClaimSchema = z.object({
  claim: z.string().min(1),
  source: z.string().min(1),
  sourceType: z.enum(["ECOMSHOP_WEB", "DATASHEET", "MANUFACTURER_FAQ", "SEARCH_GROUNDING"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  verified: z.boolean()
});

export const ProductComplementaryItemSchema = z.object({
  skuOrCategory: z.string().min(1),
  relationshipType: z.enum(["REQUIRES_POE_SWITCH", "ACCESSORY", "COMPATIBLE_TRANSCEIVER"]),
  reason: z.string().min(1)
});

export const ProductIntelligenceCardSchema = z.object({
  product: z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    sku: z.string().min(1),
    ean: z.string().optional(),
    category: z.string().min(1),
    url: z.string().url().optional(),
    stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"])
  }),
  technicalSpecs: z.object({
    standards: z.array(z.string()),
    ports: z.array(z.string()),
    powerRequirements: z.string(),
    management: z.string(),
    keyDifferentiators: z.array(z.string())
  }),
  evidenceLedger: z.array(ProductEvidenceClaimSchema),
  commercialAngles: z.object({
    executiveRoi: z.string(),
    engineeringPerformance: z.string(),
    operationsDeployment: z.string()
  }),
  complementaryProducts: z.array(ProductComplementaryItemSchema),
  generatedAt: z.string()
});

export type ProductEvidenceClaimZod = z.infer<typeof ProductEvidenceClaimSchema>;
export type ProductIntelligenceCardZod = z.infer<typeof ProductIntelligenceCardSchema>;
