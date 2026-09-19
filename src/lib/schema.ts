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
    cleanPlainTextExcerpt: z.string(),
    // Guía Editorial de Maquetación B2B
    editorialLayout: z.object({
      targetProfiles: z.array(z.object({
        profile: z.string(), // "Instalador" | "Director TIC" | "Jefe de Compras" | "Distribuidor"
        keyTakeaway: z.string()
      })).optional(),
      photoPlacements: z.array(z.object({
        id: z.string(),
        placementAfterHeading: z.string(),
        photoType: z.string(),
        description: z.string(),
        imagen3Prompt: z.string()
      })).optional(),
      ctaPlacements: z.array(z.object({
        id: z.string(),
        placement: z.string(),
        ctaType: z.string(),
        buttonText: z.string(),
        targetUrl: z.string()
      })).optional()
    }).optional()
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
  }),

  // Veto y Ajustes del EvidenceEngine (Fase 10 - NotebookLM)
  evidenceEngineAdjustments: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    reason: z.string(),
    sourceId: z.string()
  })).optional()
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

import { EditorialControlsSchema } from "./types/editorial-controls";

export const GenerateRequestSchema = z.object({
  topicTitle: z.string().min(3).optional(),
  category: z.enum(["wifi", "switches", "fibra", "engenius", "general"]).default("general"),
  customNotes: z.string().optional(),
  targetAudience: z.string().optional(),
  productUrl: z.string().optional(),
  customAngle: z.enum(["ROI", "PERFORMANCE", "OPERATIONS", "GENERAL"]).optional(),
  
  // Asistente Mailchimp B2B
  promotedProductIds: z.array(z.string()).optional(),
  customEquipmentName: z.string().optional(),
  customEquipmentUrl: z.string().optional(),
  ctaObjective: z.string().optional(),
  ctaButtonText: z.string().optional(),
  ctaUrl: z.string().optional(),
  syncWhatsApp: z.boolean().optional(),
  syncLinkedIn: z.boolean().optional(),

  // Controles Editoriales Personalizables (Fase 08.6)
  editorialControls: EditorialControlsSchema.optional(),

  // Hilo Conductor Narrativo y Objetivo Comercial (Fase 10)
  businessGoal: z.string().optional(),
  narrativeAnchor: z.object({
    pitch30s: z.string(),
    commercialObjection: z.string(),
    counterArgument: z.string(),
    targetSegment: z.string()
  }).optional()
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

