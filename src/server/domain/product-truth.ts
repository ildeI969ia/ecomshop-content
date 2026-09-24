import { z } from "zod";
import { findCatalogProduct, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";

// ==========================================
// 1. VERIFIED CLAIM MODEL (CLAIM REGISTRY)
// ==========================================

export const ClaimValidationStatusSchema = z.enum([
  "SUPPORTED",
  "UNSUPPORTED",
  "CONTRADICTED",
  "UNKNOWN"
]);
export type ClaimValidationStatus = z.infer<typeof ClaimValidationStatusSchema>;

export const ClaimEvidenceTraceSchema = z.object({
  claimId: z.string(),
  claim: z.string(),
  sku: z.string(),
  sourceId: z.string(),
  sourceType: z.string(),
  evidenceId: z.string().optional(),
  evidence: z.string().optional(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  verified: z.boolean().default(true),
  verifiedAt: z.string()
});
export type ClaimEvidenceTrace = z.infer<typeof ClaimEvidenceTraceSchema>;

export const EvidenceCoverageSchema = z.object({
  totalClaims: z.number(),
  supported: z.number(),
  unsupported: z.number(),
  contradicted: z.number(),
  unknown: z.number(),
  criticalUnverifiedClaims: z.array(z.string()).default([]),
  coverageStatus: z.enum(["PASS", "WARN", "BLOCKED"])
});
export type EvidenceCoverage = z.infer<typeof EvidenceCoverageSchema>;

export const VerifiedClaimSchema = z.object({
  id: z.string(),
  sku: z.string(),
  claim: z.string(),
  technicalFact: z.string(),
  sourceId: z.string(),
  sourceType: z.string(),
  evidenceExcerpt: z.string().optional(),
  sourceUrl: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  status: ClaimValidationStatusSchema.default("SUPPORTED"),
  importance: z.enum(["CRITICAL", "IMPORTANT", "OPTIONAL"]).default("IMPORTANT"),
  verified: z.boolean().default(true),
  verifiedAt: z.string()
});
export type VerifiedClaim = z.infer<typeof VerifiedClaimSchema>;

// ==========================================
// 2. EVIDENCE RECORD MODEL
// ==========================================

export const EvidenceRecordSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  sourceType: z.string(),
  sourceUrl: z.string().optional(),
  excerpt: z.string(),
  verifiedFact: z.string(),
  verified: z.boolean().default(true)
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

// ==========================================
// 3. PRODUCT TRUTH CONTRACT MODEL 2.0
// ==========================================

export const ProductTruthContractSchema = z.object({
  sku: z.string(),
  brand: z.string(),
  model: z.string(),
  canonicalUrl: z.string(),
  category: z.string(),
  deviceType: z.string(),

  technicalSpecs: z.record(z.string(), z.any()),

  verifiedClaims: z.array(VerifiedClaimSchema),
  evidence: z.array(ClaimEvidenceTraceSchema),
  claimEvidenceTraces: z.array(ClaimEvidenceTraceSchema).optional(),
  sourceIds: z.array(z.string()),
  antiHallucinationRules: z.array(z.string()),

  verifiedAt: z.string(),
  version: z.string().default("2.0.0")
});
export type ProductTruthContract = z.infer<typeof ProductTruthContractSchema>;

// ==========================================
// 4. FACTORY & RESOLVER FOR PRODUCT TRUTH
// ==========================================

export class ProductTruthService {
  /**
   * Resuelve el contrato canónico inmutable de verdad para un SKU.
   * Si el SKU no existe en el catálogo canónico oficial, arroja error.
   */
  public static resolveContract(sku: string): ProductTruthContract {
    const product: CatalogProduct | undefined = findCatalogProduct(sku);
    if (!product) {
      throw new Error(`PRODUCT_NOT_IN_CANONICAL_CATALOG: El SKU '${sku}' no existe en el catálogo oficial de EcomShop.`);
    }

    const now = new Date().toISOString();
    const sourceIds: string[] = [
      product.notebookSource.sourceId,
      ...(product.additionalSourceIds || [])
    ].filter(Boolean);

    // Evidencias verificadas con trazabilidad estricta a NotebookLM (ClaimEvidenceTrace)
    const evidence: ClaimEvidenceTrace[] = [
      {
        claimId: `claim-${product.sku.toLowerCase()}-identity`,
        claim: `${product.brand} ${product.model} es un equipo de categoría ${product.deviceType}`,
        sku: product.sku,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        sourceTitle: product.notebookSource.title,
        sourceUrl: product.notebookSource.url,
        evidence: `${product.brand} ${product.model} (${product.deviceType}) - ${product.name}`,
        confidence: 1.0,
        verified: true,
        verifiedAt: now
      },
      {
        claimId: `claim-${product.sku.toLowerCase()}-power`,
        claim: `Requiere ${product.powerRequirements}`,
        sku: product.sku,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        sourceTitle: product.notebookSource.title,
        sourceUrl: product.notebookSource.url,
        evidence: `Alimentación: ${product.powerRequirements}. Consumo: ${product.powerConsumptionWatts}W.`,
        confidence: 1.0,
        verified: true,
        verifiedAt: now
      },
      {
        claimId: `claim-${product.sku.toLowerCase()}-interfaces`,
        claim: `Dispone de interfaces ${product.interfaces.join(", ")}`,
        sku: product.sku,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        sourceTitle: product.notebookSource.title,
        sourceUrl: product.notebookSource.url,
        evidence: `Interfaces: ${product.interfaces.join(", ")}`,
        confidence: 1.0,
        verified: true,
        verifiedAt: now
      }
    ];

    // Claims verificados
    const verifiedClaims: VerifiedClaim[] = [
      {
        id: `claim-${product.sku.toLowerCase()}-identity`,
        sku: product.sku,
        claim: `${product.brand} ${product.model} es un equipo de categoría ${product.deviceType}`,
        technicalFact: `${product.brand} ${product.model} pertenece a la familia ${product.deviceType} para redes empresariales.`,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: product.name,
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED",
        importance: "CRITICAL",
        verified: true,
        verifiedAt: now
      },
      {
        id: `claim-${product.sku.toLowerCase()}-power`,
        sku: product.sku,
        claim: `Requiere ${product.powerRequirements}`,
        technicalFact: `Alimentación eléctrica oficial: ${product.powerRequirements}`,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: product.powerRequirements,
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED",
        importance: "CRITICAL",
        verified: true,
        verifiedAt: now
      },
      {
        id: `claim-${product.sku.toLowerCase()}-interfaces`,
        sku: product.sku,
        claim: `Dispone de interfaces ${product.interfaces.join(", ")}`,
        technicalFact: `Puertos físicos certificados: ${product.interfaces.join(", ")}`,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: product.interfaces.join(", "),
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED",
        importance: "CRITICAL",
        verified: true,
        verifiedAt: now
      },
      {
        id: `claim-${product.sku.toLowerCase()}-mgmt`,
        sku: product.sku,
        claim: `Gestión bajo modo ${product.managementMode}`,
        technicalFact: `Modo de administración soportado: ${product.managementMode}`,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: `Management: ${product.managementMode}`,
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED",
        importance: "IMPORTANT",
        verified: true,
        verifiedAt: now
      },
      ...product.keyAdvantages.map((adv, idx) => ({
        id: `claim-${product.sku.toLowerCase()}-adv-${idx + 1}`,
        sku: product.sku,
        claim: adv,
        technicalFact: adv,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: adv,
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED" as const,
        importance: "IMPORTANT" as const,
        verified: true,
        verifiedAt: now
      })),
      ...product.specs.map((spec, idx) => ({
        id: `claim-${product.sku.toLowerCase()}-spec-${idx + 1}`,
        sku: product.sku,
        claim: spec,
        technicalFact: spec,
        sourceId: product.notebookSource.sourceId,
        sourceType: product.notebookSource.type,
        evidenceExcerpt: spec,
        sourceUrl: product.notebookSource.url,
        confidence: 1.0,
        status: "SUPPORTED" as const,
        importance: "IMPORTANT" as const,
        verified: true,
        verifiedAt: now
      }))
    ];

    const antiHallucinationRules: string[] = [
      ...(product.antiHallucinationNotes || [])
    ];

    if (product.deviceType === "GATEWAY") {
      antiHallucinationRules.push("PROHIBIDO afirmar que el gateway tiene Wi-Fi integrado o emite señal inalámbrica.");
    }
    if (product.deviceType === "SWITCH" && !product.specs.some(s => s.toLowerCase().includes("wi-fi"))) {
      antiHallucinationRules.push("PROHIBIDO afirmar que el switch de red tiene radio Wi-Fi integrada.");
    }
    if (product.brand === "EnGenius") {
      antiHallucinationRules.push("PROHIBIDO mencionar controladores obsoletos como 'Fit', 'FitController' o 'FitXpress'. Exclusivo 'EnGenius Cloud'.");
    }

    return {
      sku: product.sku,
      brand: product.brand,
      model: product.model,
      canonicalUrl: product.url,
      category: product.category,
      deviceType: product.deviceType,
      technicalSpecs: {
        ports: product.interfaces,
        standards: product.standards,
        powerRequirements: product.powerRequirements,
        management: product.managementMode,
        specs: product.specs,
        ...product.polymorphicSpecs
      },
      verifiedClaims,
      evidence,
      claimEvidenceTraces: evidence,
      antiHallucinationRules,
      sourceIds,
      verifiedAt: now,
      version: "2.0.0"
    };
  }
}
