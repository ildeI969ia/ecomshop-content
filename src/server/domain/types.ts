import { z } from "zod";

export const UserRoleSchema = z.enum([
  "ADMIN",
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

export const CampaignStatusSchema = z.enum(["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);
export const CampaignSchema = z.object({
  id: z.string(),
  workspaceId: z.string().default("default-ecomspain"),
  code: z.string(),
  name: z.string().min(3),
  status: CampaignStatusSchema.default("DRAFT"),
  objective: z.string(),
  targetAudience: z.string(),
  targetPipelineEur: z.number().default(0),
  budgetEur: z.number().default(0),
  spentEur: z.number().default(0),
  aiCostEur: z.number().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  productIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string()
});
export type Campaign = z.infer<typeof CampaignSchema>;

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
  imageCount: z.number().default(0),
  latencyMs: z.number().default(0),
  estimatedCostEur: z.number(),
  currency: z.literal("EUR").default("EUR")
});
export type FinOpsRecord = z.infer<typeof FinOpsRecordSchema>;

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
