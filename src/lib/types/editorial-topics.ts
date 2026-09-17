import { z } from "zod";

export const TopicCategorySchema = z.enum([
  "ALL",
  "WIFI7",
  "POE_SWITCHING",
  "FIBRA_SFP",
  "ROUTERS_5G"
]);
export type TopicCategory = z.infer<typeof TopicCategorySchema>;

export const TopicVerticalSchema = z.enum([
  "HOSPITALITY",
  "EMPRESAS_OFICINAS",
  "INDUSTRIA_CCTV",
  "ISP_WISP"
]);
export type TopicVertical = z.infer<typeof TopicVerticalSchema>;

export const TopicArchetypeSchema = z.enum([
  "TROUBLESHOOTING",
  "DIMENSIONAMIENTO",
  "BATTLECARD",
  "CASO_REAL"
]);
export type TopicArchetype = z.infer<typeof TopicArchetypeSchema>;

export const EditorialTopicCardSchema = z.object({
  id: z.string(),
  badge: z.string(),
  title: z.string(),
  targetAudience: z.string(),
  coreArgument: z.string(),
  suggestedSKUs: z.array(z.string()),
  category: TopicCategorySchema.default("ALL"),
  vertical: TopicVerticalSchema.optional(),
  archetype: TopicArchetypeSchema.optional(),
  isCustom: z.boolean().optional()
});
export type EditorialTopicCard = z.infer<typeof EditorialTopicCardSchema>;

export const EditorialTopicsQuerySchema = z.object({
  category: TopicCategorySchema.default("ALL"),
  vertical: TopicVerticalSchema.default("EMPRESAS_OFICINAS"),
  arquetipo: TopicArchetypeSchema.default("TROUBLESHOOTING")
});
export type EditorialTopicsQuery = z.infer<typeof EditorialTopicsQuerySchema>;

export const CreateCustomTopicSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  targetAudience: z.string().min(3, "Indica el público objetivo"),
  focusLevel: z.enum(["HIGH_TECHNICAL", "CONSULTATIVE_ROI"]).default("HIGH_TECHNICAL"),
  suggestedSKUs: z.array(z.string()).default([]),
  coreArgument: z.string().optional(),
  badge: z.string().optional()
});
export type CreateCustomTopicInput = z.infer<typeof CreateCustomTopicSchema>;
