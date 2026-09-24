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

export const ProductMarketingStatusSchema = z.enum([
  "NOT_READY",
  "READY",
  "RUNNING",
  "GENERATED",
  "READY_WITH_WARNINGS",
  "BLOCKED",
  "FAILED"
]);
export type ProductMarketingStatus = z.infer<typeof ProductMarketingStatusSchema>;

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
// 3. QUALITY GATE MODEL (SPRINT 6)
// ==========================================

export const QualityCheckStatusSchema = z.enum(["PASS", "WARN", "FAIL", "BLOCKED"]);
export type QualityCheckStatus = z.infer<typeof QualityCheckStatusSchema>;

export const QualityGateNameSchema = z.enum([
  "PRODUCT_IDENTITY",
  "TECHNICAL_ACCURACY",
  "EVIDENCE_COVERAGE",
  "CANONICAL_URL",
  "PACKAGE_COMPLETENESS",
  "MARKETING_INTELLIGENCE",
  "POSITIONING",
  "SEARCH_INTENT",
  "SEO",
  "COMMERCIAL_VALUE",
  "CHANNEL_FIT",
  "INTERNAL_LINKING",
  "BRAND_COMPLIANCE",
  "DUPLICATE_CONTENT",
  "CREATIVE_COMPLETENESS",
  // Aliases legacy para retrocompatibilidad con Sprint 5/6
  "IDENTITY_CHECK",
  "SOURCE_CHECK",
  "CLAIM_CHECK",
  "BRAND_CHECK",
  "SEO_CHECK",
  "CONTENT_COMPLETENESS",
  "DUPLICATE_CHECK",
  "CTA_CHECK",
  "STRUCTURE_CHECK"
]);
export type QualityGateName = z.infer<typeof QualityGateNameSchema>;

export const QualityCheckItemSchema = z.object({
  name: QualityGateNameSchema,
  status: QualityCheckStatusSchema,
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  score: z.number().min(0).max(100).optional(),
  details: z.string(),
  reasons: z.array(z.string()).default([]).optional(),
  evidenceIds: z.array(z.string()).default([]).optional(),
  critical: z.boolean().default(false)
});
export type QualityCheckItem = z.infer<typeof QualityCheckItemSchema>;

export const QualityReportSchema = z.object({
  overallStatus: QualityCheckStatusSchema,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  completenessPercentage: z.number().min(0).max(100).default(100),
  checks: z.array(QualityCheckItemSchema),
  evaluatedAt: z.string(),
  blockReason: z.string().optional()
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

// ==========================================
// 4. CANONICAL MARKETING PACKAGE 2.0
// ==========================================

export const CreativeBriefSchema = z.object({
  objective: z.string().default("Campaña de producto técnico B2B"),
  audience: z.string().default("Directores IT e instaladores"),
  message: z.string().default("Hardware homologado con garantía oficial"),
  visualConcept: z.string(),
  productFocus: z.string().default("Networking profesional"),
  mandatoryElements: z.array(z.string()).default([]),
  forbiddenElements: z.array(z.string()).default([]),
  formatRecommendations: z.array(z.string()).default([]),
  imagePrompt: z.string().optional(),
  altText: z.string().optional(),
  headline: z.string().optional(),
  supportingHeadline: z.string().optional(),
  environment: z.string().optional(),
  keyVisualElements: z.array(z.string()).default([]),
  bannerHeadlines: z.array(z.string()).default([])
});
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

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
    model: z.string().optional(),
    name: z.string(),
    deviceType: z.string(),
    category: z.string().optional(),
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
  creative: CreativeBriefSchema,
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
  marketingIntelligence: z.record(z.string(), z.any()).optional(),
  structuredData: z.record(z.string(), z.any()).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  version: z.string().default("2.0.0").optional(),
  productCopy: z.record(z.string(), z.any()).optional(),
  socialCopy: z.record(z.string(), z.any()).optional(),
  creativeBrief: CreativeBriefSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  quality: QualityReportSchema,
  contentVersion: z.number().default(1),
  createdAt: z.string()
});
export type MarketingPackage = z.infer<typeof MarketingPackageSchema>;

// ==========================================
// 5. MARKETING BATCH MODEL
// ==========================================

export const MarketingBatchStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_FAILED",
  "FAILED"
]);
export type MarketingBatchStatus = z.infer<typeof MarketingBatchStatusSchema>;

export const MarketingBatchItemSchema = z.object({
  sku: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "BLOCKED"]),
  runId: z.string().optional(),
  packageId: z.string().optional(),
  error: z.string().optional(),
  qualityScore: z.number().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional()
});
export type MarketingBatchItem = z.infer<typeof MarketingBatchItemSchema>;

export const MarketingBatchSchema = z.object({
  batchId: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  organizationId: z.string().default("org-ecomspain"),
  status: MarketingBatchStatusSchema,
  items: z.record(z.string(), MarketingBatchItemSchema),
  totalItems: z.number(),
  completedItems: z.number(),
  failedItems: z.number(),
  blockedItems: z.number(),
  requestedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().optional(),
  provider: z.string().default("google-antigravity")
});
export type MarketingBatch = z.infer<typeof MarketingBatchSchema>;
