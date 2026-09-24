import { z } from "zod";

export const ContentTypeEnum = z.enum([
  "TEXT",
  "COMPARISON_TABLE",
  "TOPOLOGY_DIAGRAM",
  "INSTALLER_CALLOUT",
  "FAQ"
]);

export type ArticleContentType = z.infer<typeof ContentTypeEnum>;

export const SectionLevelEnum = z.enum(["H2", "H3"]);
export type SectionLevel = z.infer<typeof SectionLevelEnum>;

export const ArticleOutlineSectionSchema = z.object({
  id: z.string(),
  level: SectionLevelEnum,
  title: z.string().min(3),
  focusKeywords: z.array(z.string()).default([]),
  keyTakeaway: z.string(),
  contentType: ContentTypeEnum,
  suggestedProductLink: z.string().optional()
});

export type ArticleOutlineSection = z.infer<typeof ArticleOutlineSectionSchema>;

export const ArticleOutlineSchema = z.object({
  title: z.string().min(5),
  slug: z.string().min(3),
  metaDescription: z.string().min(10),
  targetAudience: z.string(),
  sections: z.array(ArticleOutlineSectionSchema).min(1)
});

export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>;

export const GenerateOutlineRequestSchema = z.object({
  topicOrProduct: z.string().min(2),
  targetAudience: z.string().optional(),
  vertical: z.string().optional(),
  category: z.string().optional()
}).strict();

export type GenerateOutlineRequest = z.infer<typeof GenerateOutlineRequestSchema>;
