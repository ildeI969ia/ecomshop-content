import { z } from "zod";

export const UserRoleSchema = z.enum([
  "ADMIN",
  "EDITOR",
  "MARKETING_MANAGER",
  "CONTENT_MANAGER",
  "PRODUCT_MANAGER",
  "DESIGNER",
  "SALES",
  "VIEWER"
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  role: UserRoleSchema,
  workspaceId: z.string().default("default-ecomspain"),
  organizationId: z.string().default("org-ecomspain"),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().optional()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SourceTypeSchema = z.enum(["datasheet", "pdf", "note", "url", "competitor_intel", "field_memo"]);
export const SourceItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  title: z.string().min(1),
  type: SourceTypeSchema,
  description: z.string(),
  url: z.string().optional(),
  fileStoragePath: z.string().optional(),
  tags: z.array(z.string()).default([]),
  verified: z.boolean().default(false),
  verifiedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string()
});
export type SourceItem = z.infer<typeof SourceItemSchema>;

export const CampaignLifecycleStageSchema = z.enum([
  "DRAFT",
  "PLANNING",
  "GROUNDING",
  "GENERATING",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "FAILED"
]);
export type CampaignLifecycleStage = z.infer<typeof CampaignLifecycleStageSchema>;

export const CampaignStatusSchema = z.enum([
  "DRAFT",
  "PLANNING",
  "GROUNDING",
  "GENERATING",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "FAILED",
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED"
]);
export const CampaignSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  code: z.string(),
  name: z.string().min(3),
  status: CampaignStatusSchema.default("DRAFT"),
  lifecycleStage: CampaignLifecycleStageSchema.default("DRAFT"),
  objective: z.string(),
  targetAudience: z.string(),
  opportunityId: z.string().optional(),
  targetPipelineEur: z.number().default(0),
  budgetEur: z.number().default(0),
  spentEur: z.number().default(0),
  aiCostEur: z.number().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  productIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  editorialControls: z.record(z.string(), z.any()).optional(),
  groundingState: z.record(z.string(), z.any()).optional(),
  contentState: z.record(z.string(), z.any()).optional(),
  assetState: z.record(z.string(), z.any()).optional(),
  channelState: z.record(z.string(), z.any()).optional(),
  qualityState: z.record(z.string(), z.any()).optional(),
  reviewState: z.record(z.string(), z.any()).optional(),
  versions: z.array(z.record(z.string(), z.any())).default([]),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string()
});
export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * Validador formal de la máquina de estados de Campaña.
 * Reglas de integridad comercial:
 * 1. DRAFT no puede saltar directamente a PUBLISHED (debe pasar por PLANNING -> GROUNDING -> GENERATING -> REVIEW -> APPROVED).
 * 2. GENERATING no puede pasar directamente a APPROVED (debe someterse a REVIEW).
 * 3. Si qualityState indica FAIL o no ha pasado, no puede pasar a APPROVED ni PUBLISHED.
 * 4. REVIEW no puede pasar a PUBLISHED sin estar APPROVED.
 */
export function validateCampaignTransition(
  currentStage: CampaignLifecycleStage,
  targetStage: CampaignLifecycleStage,
  context?: {
    qualityPassed?: boolean;
    isApproved?: boolean;
  }
): { valid: boolean; reason?: string } {
  if (currentStage === targetStage) return { valid: true };

  // FAILED permite reintento volviendo a PLANNING o GROUNDING
  if (targetStage === "FAILED") return { valid: true };

  // Regla 1: DRAFT -> PUBLISHED impedido
  if (currentStage === "DRAFT" && targetStage === "PUBLISHED") {
    return { valid: false, reason: "Transición inválida: DRAFT no puede publicarse directamente sin pasar por las fases de generación y aprobación." };
  }

  // Regla 2: GENERATING -> APPROVED impedido
  if (currentStage === "GENERATING" && targetStage === "APPROVED") {
    return { valid: false, reason: "Transición inválida: GENERATING no puede aprobarse directamente; requiere pasar por fase REVIEW." };
  }

  // Regla 3: QUALITY FAIL -> APPROVED / PUBLISHED impedido
  if ((targetStage === "APPROVED" || targetStage === "PUBLISHED") && context?.qualityPassed === false) {
    return { valid: false, reason: "Transición bloqueada por Quality Gate: los controles de calidad no fueron superados (QUALITY_GATE_FAIL)." };
  }

  // Regla 4: REVIEW -> PUBLISHED sin aprobación
  if (currentStage === "REVIEW" && targetStage === "PUBLISHED" && !context?.isApproved) {
    return { valid: false, reason: "Transición bloqueada: La campaña en REVIEW requiere aprobación explícita (APPROVED) antes de ser publicada." };
  }

  // Mapa de transiciones legítimas del ciclo de vida
  const allowedTransitions: Record<CampaignLifecycleStage, CampaignLifecycleStage[]> = {
    DRAFT: ["PLANNING", "GROUNDING", "FAILED"],
    PLANNING: ["GROUNDING", "GENERATING", "DRAFT", "FAILED"],
    GROUNDING: ["GENERATING", "PLANNING", "FAILED"],
    GENERATING: ["REVIEW", "GROUNDING", "FAILED"],
    REVIEW: ["APPROVED", "GENERATING", "FAILED"],
    APPROVED: ["PUBLISHED", "REVIEW", "FAILED"],
    PUBLISHED: ["REVIEW", "DRAFT"],
    FAILED: ["PLANNING", "GROUNDING", "DRAFT"]
  };

  const allowed = allowedTransitions[currentStage] || [];
  if (!allowed.includes(targetStage)) {
    return {
      valid: false,
      reason: `Transición inválida: no está permitido pasar de ${currentStage} a ${targetStage}. Flujo esperado: DRAFT -> PLANNING -> GROUNDING -> GENERATING -> REVIEW -> APPROVED -> PUBLISHED.`
    };
  }

  return { valid: true };
}

export const ContentStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
export const ContentChannelSchema = z.enum(["BLOG", "MAILCHIMP", "WHATSAPP", "LINKEDIN", "X_TWITTER", "CASE_STUDY_PDF"]);

export const AIProvenanceSchema = z.object({
  provider: z.literal("google-vertex-genai"),
  model: z.string(),
  requestId: z.string(),
  promptHash: z.string().optional(),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  cachedTokens: z.number().default(0),
  latencyMs: z.number().default(0),
  estimatedCostEur: z.number().default(0),
  sourceIdsUsed: z.array(z.string()).default([]),
  generatedAt: z.string()
});
export type AIProvenance = z.infer<typeof AIProvenanceSchema>;

export const ContentVersionSchema = z.object({
  version: z.number().int().positive(),
  body: z.record(z.string(), z.any()),
  changeSummary: z.string(),
  editedByUserId: z.string(),
  isAIGenerated: z.boolean(),
  aiProvenance: AIProvenanceSchema.optional(),
  timestamp: z.string()
});
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

export const ContentVariantSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  channel: ContentChannelSchema,
  status: ContentStatusSchema.default("DRAFT"),
  title: z.string().optional(),
  bodyPayload: z.record(z.string(), z.any()),
  version: z.number().default(1),
  isAIGenerated: z.boolean().default(true),
  humanModified: z.boolean().default(false),
  aiProvenance: AIProvenanceSchema.optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ContentVariant = z.infer<typeof ContentVariantSchema>;

export const ContentItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  campaignId: z.string().optional(),
  title: z.string().min(3),
  slug: z.string(),
  category: z.string(),
  status: ContentStatusSchema.default("DRAFT"),
  currentVersion: z.number().default(1),
  authorId: z.string(),
  versions: z.array(ContentVersionSchema).default([]),
  canonicalBody: z.record(z.string(), z.any()),
  linkedProductIds: z.array(z.string()).default([]),
  linkedSourceIds: z.array(z.string()).default([]),
  latestAIProvenance: AIProvenanceSchema.optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string()
});
export type ContentItem = z.infer<typeof ContentItemSchema>;

export const FinOpsRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  timestamp: z.string(),
  userId: z.string(),
  campaignId: z.string().optional(),
  contentId: z.string().optional(),
  sku: z.string().optional(),
  operation: z.string().optional(),
  provider: z.string().optional(),
  requestId: z.string().optional(),
  action: z.enum([
    "gemini_generation",
    "gemini_angles",
    "gemini_multimodal_advisor",
    "imagen_image",
    "firestore_read",
    "firestore_write",
    "cloud_run_req"
  ]),
  model: z.string().optional(),
  tokensInput: z.number().default(0),
  tokensOutput: z.number().default(0),
  cachedTokens: z.number().default(0),
  thoughtTokens: z.number().default(0).optional(),
  totalTokens: z.number().default(0).optional(),
  imageCount: z.number().default(0),
  latencyMs: z.number().default(0),
  estimatedCostEur: z.number(),
  actualCost: z.number().optional(),
  costStatus: z.enum(["EXACT", "ESTIMATED", "ACTUAL", "UNKNOWN"]).default("ESTIMATED"),
  currency: z.literal("EUR").default("EUR")
});
export type FinOpsRecord = z.infer<typeof FinOpsRecordSchema>;

export const HumanEditEventSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  campaignId: z.string().optional(),
  channel: ContentChannelSchema,
  originalText: z.string(),
  editedText: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  reason: z.string().optional()
});
export type HumanEditEvent = z.infer<typeof HumanEditEventSchema>;

export const MarketingPerformanceEventSchema = z.object({
  id: z.string().optional(),
  campaignId: z.string(),
  contentId: z.string(),
  sku: z.string(),
  channel: z.string(),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  leads: z.number().default(0),
  revenue: z.number().default(0),
  timestamp: z.string()
});
export type MarketingPerformanceEvent = z.infer<typeof MarketingPerformanceEventSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  timestamp: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  action: z.enum([
    "CREATE",
    "EDIT",
    "DELETE",
    "APPROVE",
    "REJECT",
    "PUBLISH",
    "GENERATE_AI",
    "LOGIN",
    "PERMISSION_CHANGE"
  ]),
  entity: z.string(),
  entityId: z.string(),
  diff: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  source: z.literal("UI").or(z.literal("SYSTEM_JOB"))
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
export const AssetTypeSchema = z.enum(["image", "diagram", "pdf", "audio", "datasheet"]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  storagePath: z.string(),
  publicUrl: z.string().optional(),
  type: AssetTypeSchema.default("image"),
  campaignId: z.string().optional(),
  productId: z.string().optional(),
  contentId: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  aiProvenance: AIProvenanceSchema.optional(),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  storageStatus: z
    .enum(["VERIFIED", "EXTERNAL_URL", "MISSING_URL", "PLACEHOLDER_STORAGE_PATH", "BROKEN_SOURCE"])
    .optional(),
  sha256: z.string().optional(),
  originalSizeBytes: z.number().optional()
});
export type Asset = z.infer<typeof AssetSchema>;

export const ProductEntitySchema = z.object({
  id: z.string(),
  sku: z.string(),
  ean: z.string().optional(),
  brand: z.string(),
  model: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  url: z.string().url().optional(),
  stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"]).default("IN_STOCK"),
  priceEur: z.number().optional(),
  wholesalePriceEur: z.number().optional(),
  datasheetUrl: z.string().url().optional(),
  standards: z.array(z.string()).default([]),
  ports: z.array(z.string()).default([]),
  poeBudgetWatts: z.number().optional(),
  managementType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  updatedAt: z.string()
});
export type ProductEntity = z.infer<typeof ProductEntitySchema>;

export const ProductIntelligenceRecordSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  cardPayload: z.record(z.string(), z.any()),
  version: z.number().default(1),
  qualityGatePassed: z.boolean().default(true),
  evidenceCount: z.number().default(0),
  generatedAt: z.string(),
  updatedAt: z.string()
});
export type ProductIntelligenceRecord = z.infer<typeof ProductIntelligenceRecordSchema>;
