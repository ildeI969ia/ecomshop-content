import { z } from "zod";

export const ContentOutputSchema = z.object({
  topicId: z.string(),
  topicTitle: z.string(),
  category: z.string(),
  generatedAt: z.string(),
  
  // Blog Post (Listo para Durable)
  blog: z.object({
    title: z.string(),
    metaDescription: z.string(),
    slug: z.string(),
    readingTimeMinutes: z.number(),
    targetKeywords: z.array(z.string()),
    htmlContent: z.string(),
    cleanPlainTextExcerpt: z.string()
  }),

  // Mailchimp Campaign Draft
  mailchimp: z.object({
    subjectA: z.string(),
    subjectB: z.string(),
    previewText: z.string(),
    ctaButtonText: z.string(),
    ctaUrl: z.string(),
    newsletterHtml: z.string(),
    plainText: z.string()
  }),

  // WhatsApp Broadcast
  whatsapp: z.object({
    headline: z.string(),
    formattedMessage: z.string(),
    callToAction: z.string(),
    targetUrl: z.string()
  }),

  // LinkedIn Post
  linkedin: z.object({
    hook: z.string(),
    body: z.string(),
    takeaways: z.array(z.string()),
    callToAction: z.string(),
    hashtags: z.array(z.string()),
    fullPostText: z.string()
  })
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

export const GenerateRequestSchema = z.object({
  topicTitle: z.string().min(3),
  category: z.enum(["wifi", "switches", "fibra", "engenius", "general"]),
  customNotes: z.string().optional(),
  targetAudience: z.string().optional(),
  productUrl: z.string().optional(),
  
  // Asistente Mailchimp B2B
  promotedProductIds: z.array(z.string()).optional(),
  customEquipmentName: z.string().optional(),
  customEquipmentUrl: z.string().optional(),
  ctaObjective: z.string().optional(),
  ctaButtonText: z.string().optional(),
  ctaUrl: z.string().optional(),
  syncWhatsApp: z.boolean().optional(),
  syncLinkedIn: z.boolean().optional()
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
