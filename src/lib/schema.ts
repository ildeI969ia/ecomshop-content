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

  // Prensa / Blog GEO (Prensa, Tabla Comparativa, JSON-LD)
  geo: z.object({
    title: z.string(),
    metaDescription: z.string(),
    htmlContent: z.string(),
    comparativeTableHtml: z.string().optional(),
    jsonLd: z.string().optional(),
    markdownContent: z.string().optional()
  }).optional(),

  // Ficha ecomshop.es (Argumentario CMS sin estilos inline sucios)
  ecomshop: z.object({
    title: z.string(),
    argumentario: z.string(),
    features: z.array(z.string()),
    cmsHtml: z.string()
  }).optional(),

  // Veto y Ajustes del EvidenceEngine (Fase 10 - NotebookLM)
  evidenceEngineAdjustments: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    reason: z.string(),
    sourceId: z.string()
  })).optional(),

  // Citas Interactivas de Fuentes de NotebookLM
  citations: z.record(z.string(), z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    excerpt: z.string(),
    url: z.string().optional()
  })).optional(),

  // Afirmaciones Técnicas y Citas de Fuentes (Fase 6c - Grounding Obligatorio)
  claims: z.array(z.object({
    text: z.string(),
    sourceId: z.string()
  })).optional(),

  groundingValidation: z.object({
    isValid: z.boolean(),
    claims: z.array(z.object({
      text: z.string(),
      sourceId: z.string(),
      verified: z.boolean()
    })),
    ungroundedClaims: z.array(z.object({
      text: z.string(),
      number: z.string(),
      reason: z.string()
    }))
  }).optional(),

  // Fact-Check Score de Fidelidad Técnica (0-100)
  factCheckScore: z.number().optional(),

  // Trazabilidad de origen y revisión (Fase 6b)
  source: z.enum(["ai", "fallback"]).optional(),
  generator: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
  status: z.enum(["DRAFT", "NEEDS_REVIEW", "APPROVED", "PUBLISHED"]).optional(),
  fallbackNotice: z.string().optional(),

  // Reporte de Reglas por Canal (Fase 6d)
  channelValidation: z.object({
    passed: z.boolean(),
    score: z.number(),
    rules: z.array(z.object({
      id: z.string(),
      channel: z.string(),
      label: z.string(),
      passed: z.boolean(),
      message: z.string()
    })),
    failedChannels: z.array(z.string())
  }).optional(),

  // Metadatos reales de consumo de tokens Gemini
  usageMetadata: z.object({
    promptTokenCount: z.number().optional(),
    candidatesTokenCount: z.number().optional(),
    totalTokenCount: z.number().optional()
  }).optional()
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

import { EditorialControlsSchema } from "./types/editorial-controls";

export const GenerateRequestSchema = z.object({
  sku: z.string().optional().default(""),
  productName: z.string().optional().default(""),
  bundleSku: z.string().optional().default(""),
  topic: z.string().optional().default(""),
  editorialThesis: z.string().optional().default(""),
  topicTitle: z.string().optional().default("Solución de Conectividad B2B"),
  category: z.string().optional().default("general"),
  customNotes: z.string().optional().default(""),
  targetAudience: z.string().optional().default("Instalador B2B"),
  productUrl: z.string().optional().default("https://ecomshop.es"),
  customAngle: z.string().optional().default("ROI"),
  
  // Asistente Mailchimp B2B
  promotedProductIds: z.array(z.string()).optional().default([]),
  customEquipmentName: z.string().optional().default(""),
  customEquipmentUrl: z.string().optional().default(""),
  ctaObjective: z.string().optional().default(""),
  ctaButtonText: z.string().optional().default(""),
  ctaUrl: z.string().optional().default(""),
  syncWhatsApp: z.boolean().optional().default(true),
  syncLinkedIn: z.boolean().optional().default(true),

  // Controles Editoriales Personalizables
  editorialControls: EditorialControlsSchema.optional(),

  // Hilo Conductor Narrativo y Objetivo Comercial
  businessGoal: z.string().optional().default("ALL_OPPORTUNITIES"),
  narrativeAnchor: z.object({
    pitch30s: z.string().optional().default(""),
    commercialObjection: z.string().optional().default(""),
    counterArgument: z.string().optional().default(""),
    targetSegment: z.string().optional().default("Instalador B2B")
  }).optional(),

  // Fuentes Seleccionadas del NotebookLM
  selectedSourceIds: z.array(z.string()).optional().default([])
}).passthrough();

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

