import { z } from "zod";

// ==========================================
// 1. PRODUCT LIFECYCLE & KNOWLEDGE STATUS
// ==========================================

export const ProductLifecycleStatusSchema = z.enum([
  "DISCOVERED",
  "VERIFIED",
  "HOMOLOGATED",
  "MARKETING_READY"
]);
export type ProductLifecycleStatus = z.infer<typeof ProductLifecycleStatusSchema>;

export const EvidenceConfidenceSchema = z.enum([
  "VERIFIED",
  "SUPPORTED",
  "INFERRED",
  "UNKNOWN"
]);
export type EvidenceConfidence = z.infer<typeof EvidenceConfidenceSchema>;

export const ProductEvidenceSchema = z.object({
  productId: z.string(),
  sourceId: z.string(),
  sourceType: z.enum(["datasheet", "pdf", "note", "url", "competitor_intel", "field_memo"]),
  claim: z.string(),
  value: z.string(),
  confidence: EvidenceConfidenceSchema,
  sourceUrl: z.string().optional(),
  retrievedAt: z.string()
});
export type ProductEvidence = z.infer<typeof ProductEvidenceSchema>;

// ==========================================
// 2. MARKETING PIPELINE STEPS & EXECUTION
// ==========================================

export const MarketingStepTypeSchema = z.enum([
  "PRODUCT_RESOLUTION",
  "KNOWLEDGE_RETRIEVAL",
  "PRODUCT_INTELLIGENCE",
  "POSITIONING",
  "AUDIENCE",
  "VALUE_PROPOSITION",
  "SEO",
  "PRODUCT_COPY",
  "SOCIAL_COPY",
  "CREATIVE_BRIEF",
  "QUALITY_GATE",
  "FINAL_PACKAGE"
]);
export type MarketingStepType = z.infer<typeof MarketingStepTypeSchema>;

export const MarketingStepStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "BLOCKED",
  "SKIPPED"
]);
export type MarketingStepStatus = z.infer<typeof MarketingStepStatusSchema>;

export const GenerationUsageSchema = z.object({
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().nullable().default(null),
  outputTokens: z.number().nullable().default(null),
  latencyMs: z.number().nullable().default(null),
  estimatedCost: z.number().nullable().default(null)
});
export type GenerationUsage = z.infer<typeof GenerationUsageSchema>;

export const MarketingStepRecordSchema = z.object({
  step: MarketingStepTypeSchema,
  status: MarketingStepStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  inputHash: z.string(),
  output: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  sources: z.array(z.string()).default([]),
  usage: GenerationUsageSchema.optional()
});
export type MarketingStepRecord = z.infer<typeof MarketingStepRecordSchema>;

export const MarketingRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "BLOCKED",
  "APPROVAL_REQUIRED"
]);
export type MarketingRunStatus = z.infer<typeof MarketingRunStatusSchema>;

export const MarketingRunSchema = z.object({
  runId: z.string(),
  productId: z.string(),
  sku: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  organizationId: z.string().default("org-ecomspain"),
  status: MarketingRunStatusSchema,
  currentStep: MarketingStepTypeSchema,
  steps: z.record(MarketingStepTypeSchema, MarketingStepRecordSchema),
  idempotencyHash: z.string(),
  requestedBy: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  contentVersion: z.number().default(1),
  promptVersion: z.string().default("v1.0.0"),
  knowledgeVersion: z.string().default("v1.0.0"),
  catalogVersion: z.string().default("canonical-2026"),
  provider: z.string().default("google-antigravity"),
  model: z.string().default("gemini-2.5-flash")
});
export type MarketingRun = z.infer<typeof MarketingRunSchema>;

// ==========================================
// 3. QUALITY GATE MODEL
// ==========================================

export const QualityCheckStatusSchema = z.enum(["PASS", "WARN", "FAIL"]);
export type QualityCheckStatus = z.infer<typeof QualityCheckStatusSchema>;

export const QualityCheckItemSchema = z.object({
  name: z.enum([
    "IDENTITY_CHECK",
    "SOURCE_CHECK",
    "CLAIM_CHECK",
    "BRAND_CHECK",
    "SEO_CHECK",
    "CONTENT_COMPLETENESS",
    "DUPLICATE_CHECK",
    "CTA_CHECK",
    "STRUCTURE_CHECK"
  ]),
  status: QualityCheckStatusSchema,
  details: z.string(),
  critical: z.boolean().default(false)
});
export type QualityCheckItem = z.infer<typeof QualityCheckItemSchema>;

export const QualityReportSchema = z.object({
  overallStatus: QualityCheckStatusSchema,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  checks: z.array(QualityCheckItemSchema),
  evaluatedAt: z.string(),
  blockReason: z.string().optional()
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

// ==========================================
// 4. CANONICAL MARKETING PACKAGE
// ==========================================

export const MarketingSeoSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  searchIntent: z.string(),
  semanticEntities: z.array(z.string()),
  faqCandidates: z.array(z.object({ question: z.string(), answer: z.string() })),
  internalLinkSuggestions: z.array(z.string())
});
export type MarketingSeo = z.infer<typeof MarketingSeoSchema>;

export const MarketingPackageSchema = z.object({
  packageId: z.string(),
  runId: z.string(),
  product: z.object({
    sku: z.string(),
    brand: z.string(),
    name: z.string(),
    deviceType: z.string(),
    priceEur: z.number(),
    wholesalePriceEur: z.number().optional(),
    url: z.string()
  }),
  positioning: z.string(),
  targetAudience: z.string(),
  valueProposition: z.string(),
  keyBenefits: z.array(z.string()),
  technicalHighlights: z.array(z.string()),
  verifiedClaims: z.array(ProductEvidenceSchema),
  seo: MarketingSeoSchema,
  productDescription: z.string(),
  shortDescription: z.string(),
  social: z.object({
    linkedin: z.string(),
    twitter: z.string(),
    whatsapp: z.string()
  }),
  creative: z.object({
    visualConcept: z.string(),
    keyVisualElements: z.array(z.string()),
    bannerHeadlines: z.array(z.string())
  }),
  cta: z.object({
    primary: z.string(),
    secondary: z.string(),
    url: z.string()
  }),
  sources: z.array(z.object({
    sourceId: z.string(),
    title: z.string(),
    url: z.string().optional(),
    type: z.string()
  })),
  quality: QualityReportSchema,
  contentVersion: z.number().default(1),
  createdAt: z.string()
});
export type MarketingPackage = z.infer<typeof MarketingPackageSchema>;
