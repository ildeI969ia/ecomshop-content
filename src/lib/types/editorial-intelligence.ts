import { z } from "zod";
import { EditorialThesisSchema, SectionOutlineItemSchema } from "@/lib/schema";

/**
 * Tipos de producto soportados por el Product Type Engine
 */
export const ProductTypeEnum = z.enum([
  "OPTICAL_TRANSCEIVER",
  "FIBER_CABLE",
  "DAC",
  "SWITCH",
  "ACCESS_POINT",
  "ROUTER",
  "FIREWALL",
  "CAMERA",
  "UPS",
  "RACK",
  "ANTENNA",
  "POWER_SUPPLY",
  "ACCESSORY"
]);
export type ProductType = z.infer<typeof ProductTypeEnum>;

/**
 * Estructura de Ángulo Editorial generado por el Angle Generator
 */
export const EditorialAngleSchema = z.object({
  id: z.string(),
  title: z.string(),
  editorialQuestion: z.string(),
  tension: z.string(), // "opción A vs opción B", "problema vs solución", "ahorro inicial vs TCO", etc.
  readerPromise: z.string(),
  rationale: z.string(),
  relevanceScore: z.number()
});
export type EditorialAngle = z.infer<typeof EditorialAngleSchema>;

/**
 * Mapa de Evidencia de Producto
 */
export const ProductEvidenceMapSchema = z.object({
  sku: z.string(),
  productType: ProductTypeEnum,
  verifiedFacts: z.array(z.string()),
  technicalImplications: z.array(z.string()),
  commercialFacts: z.array(z.string()),
  unknownFacts: z.array(z.string()),
  claimsNotAllowed: z.array(z.string())
});
export type ProductEvidenceMap = z.infer<typeof ProductEvidenceMapSchema>;

/**
 * Informe del Editorial Critic
 */
export const EditorialCriticReportSchema = z.object({
  interest: z.number().min(0).max(10),
  originality: z.number().min(0).max(10),
  technicalDepth: z.number().min(0).max(10),
  audienceRelevance: z.number().min(0).max(10),
  specificity: z.number().min(0).max(10),
  narrativeQuality: z.number().min(0).max(10),
  naturalness: z.number().min(0).max(10),
  evidenceQuality: z.number().min(0).max(10),
  commercialSubtlety: z.number().min(0).max(10),
  publishability: z.number().min(0).max(10),
  
  readerLearnings: z.array(z.string()), // 3-5 aprendizajes concretos del lector
  genericParagraphs: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  boringSections: z.array(z.object({
    sectionIndex: z.number(),
    reason: z.string()
  })),
  boringStart: z.string().optional(),
  boringReason: z.string().optional(),
  
  rewriteRequired: z.boolean(),
  criticFeedback: z.string()
});
export type EditorialCriticReport = z.infer<typeof EditorialCriticReportSchema>;

/**
 * Estructura de paquete final entregable para la Prueba Definitiva (12 artículos)
 */
export const MasterEditorialPackageSchema = z.object({
  productSku: z.string(),
  targetAudience: z.string(),
  productType: ProductTypeEnum,
  editorialQuestion: z.string(),
  editorialAngle: z.string(),
  tension: z.string(),
  thesis: EditorialThesisSchema,
  readerPromise: z.string(),
  readerLearnings: z.array(z.string()),
  outline: z.array(SectionOutlineItemSchema),
  evidenceMap: ProductEvidenceMapSchema,
  criticReport: EditorialCriticReportSchema,
  factCheckPassed: z.boolean(),
  finalStatus: z.enum(["PUBLISHABLE", "NEEDS_REVIEW", "REJECTED"]),
  blogHtml: z.string(),
  article: z.object({
    title: z.string(),
    metaDescription: z.string(),
    slug: z.string(),
    htmlContent: z.string(),
    plainText: z.string()
  })
});
export type MasterEditorialPackage = z.infer<typeof MasterEditorialPackageSchema>;
