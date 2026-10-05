import { ContentOutput, ContentOutputSchema } from "@/lib/schema";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { AIExecutionService } from "@/lib/services/ai-execution-service";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";
import type { EditorialDecision } from "@/lib/types/editorial-orchestrator";
import { ChannelStrategyPlanner } from "@/lib/services/channel-strategy-planner";
import { CrossChannelCritic, type CrossChannelReport } from "@/lib/services/cross-channel-critic";
import {
  generateBlogChannel,
  generateLinkedInChannel,
  generateWhatsAppChannel,
  generateMailchimpChannel,
  generateGeoChannel
} from "@/lib/services/channel-writers";
import { generateDynamicComparativeTableHtml } from "@/lib/services/grounded-writer-comparative";
import type { GenerationContext } from "@/server/services/generation-context";

export interface GroundedWriterRequest {
  sku: string;
  topicTitle: string;
  category: string;
  productUrl?: string;
  targetAudience?: string;
  customNotes?: string;
  editorialControls?: EditorialControls;
  selectedSourceIds?: string[];
  intel: import("./notebook-intelligence").StructuredProductIntelligence;
  apiKey?: string;
  editorialDecision?: EditorialDecision;
}

export class GroundedWriterService {
  /**
   * Genera el paquete multicanal B2B aplicando:
   * GenerationContext -> EditorialDecision -> ChannelStrategyPlanner -> Channel Writers -> CrossChannelCritic -> Quality Gate.
   */
  async generateGroundedContent(
    req: GroundedWriterRequest,
    context?: GenerationContext
  ): Promise<ContentOutput> {
    const { intel, editorialDecision } = req;
    const sku = (req.sku || intel.sku).trim().toUpperCase();

    // Resolver citas basadas en Product Truth del feed
    const citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }> = {};
    intel.card.evidenceLedger.forEach((evidence, index) => {
      citations[evidence.source] = {
        id: evidence.source,
        title: `Feed EcomShop — ${intel.sku}${index > 0 ? ` #${index + 1}` : ""}`,
        type: evidence.sourceType,
        excerpt: evidence.claim,
        url: evidence.source
      };
    });

    // 1. Channel Strategy Planner
    const planner = new ChannelStrategyPlanner();
    let genContext = context;
    if (!genContext) {
      const { buildGenerationContext } = await import("@/server/services/generation-context");
      genContext = await buildGenerationContext({
        sku,
        topicTitle: req.topicTitle,
        category: req.category,
        productUrl: req.productUrl,
        targetAudience: req.targetAudience,
        customNotes: req.customNotes
      });
    }

    if (!editorialDecision) {
      throw new Error(`EDITORIAL_DECISION_REQUIRED: No se puede generar contenido sin EditorialDecision del Orchestrator.`);
    }

    const strategies = planner.planStrategies(genContext, editorialDecision);

    // 2. Ejecución con IA si está disponible
    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!req.apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
    const key = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (key || isVertex) {
      try {
        const { getGenAIClient, getActiveGeminiModel } = await import("@/lib/genai-client");
        const ai = getGenAIClient(req.apiKey);
        const activeModel = getActiveGeminiModel(req.apiKey);
        const { AI_TEXT_MODEL, AI_FALLBACK_MODEL, normalizeVertexModelName } = await import("@/lib/ai-config");
        const rawModels = [activeModel, AI_TEXT_MODEL, AI_FALLBACK_MODEL, "gemini-3.1-flash-lite"];
        const candidateModels = rawModels
          .filter((m): m is string => Boolean(m))
          .map((m) => normalizeVertexModelName(m))
          .filter((m, i, arr) => arr.indexOf(m) === i);

        const prompt = this.buildPrompt(req, strategies);
        const systemInstruction = this.buildSystemInstruction(editorialDecision.primaryAudience, sku);

        const execution = await new AIExecutionService().generateJson({
          models: candidateModels,
          generate: async (model) => {
            const res = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.5,
                maxOutputTokens: 12288,
                responseMimeType: "application/json"
              }
            });

            return {
              text: res.text || "{}",
              usageMetadata: res.usageMetadata
                ? {
                    promptTokenCount: res.usageMetadata.promptTokenCount,
                    candidatesTokenCount: res.usageMetadata.candidatesTokenCount,
                    totalTokenCount: res.usageMetadata.totalTokenCount
                  }
                : undefined
            };
          }
        });

        const parsed = execution.parsed as Record<string, unknown>;

        // 3. Montar y asegurar la arquitectura multicanal desacoplada
        const rawBlog = (typeof parsed.blog === "object" && parsed.blog !== null) ? parsed.blog as Record<string, unknown> : {};
        const rawLinkedin = (typeof parsed.linkedin === "object" && parsed.linkedin !== null) ? parsed.linkedin as Record<string, unknown> : {};
        const rawWhatsapp = (typeof parsed.whatsapp === "object" && parsed.whatsapp !== null) ? parsed.whatsapp as Record<string, unknown> : {};
        const rawMailchimp = (typeof parsed.mailchimp === "object" && parsed.mailchimp !== null) ? parsed.mailchimp as Record<string, unknown> : {};
        const rawGeo = (typeof parsed.geo === "object" && parsed.geo !== null) ? parsed.geo as Record<string, unknown> : {};

        const writerInput = { context: genContext, decision: editorialDecision, strategies };

        const blog = generateBlogChannel(rawBlog as Partial<ContentOutput["blog"]>, writerInput);
        const linkedin = generateLinkedInChannel(rawLinkedin as Partial<ContentOutput["linkedin"]>, writerInput);
        const whatsapp = generateWhatsAppChannel(rawWhatsapp as Partial<ContentOutput["whatsapp"]>, writerInput);
        const mailchimp = generateMailchimpChannel(rawMailchimp as Partial<ContentOutput["mailchimp"]>, writerInput);
        const geo = generateGeoChannel(rawGeo as Partial<ContentOutput["geo"]>, writerInput);

        const packageOutput: ContentOutput = {
          topicId: typeof parsed.topicId === "string" ? parsed.topicId : `ecom-${sku.toLowerCase()}-${Date.now().toString(36)}`,
          topicTitle: typeof parsed.topicTitle === "string" ? parsed.topicTitle : blog.title,
          category: genContext.effectiveCategory,
          generatedAt: new Date().toISOString(),
          editorialThesis: editorialDecision.thesis,
          outline: editorialDecision.outline,
          blog,
          linkedin,
          whatsapp,
          mailchimp,
          geo,
          ecomshop: {
            title: blog.title,
            argumentario: editorialDecision.thesis.centralArgument,
            features: intel.card.technicalSpecs.keyDifferentiators,
            cmsHtml: `<p><strong>${editorialDecision.thesis.problem}</strong></p><p>${editorialDecision.thesis.centralArgument}</p>`
          },
          citations: { ...citations, ...(parsed.citations && typeof parsed.citations === "object" ? (parsed.citations as Record<string, any>) : {}) },
          claims: intel.keyClaims.slice(0, 8).map((c) => ({ text: c.claim, sourceId: c.sourceId })),
          editorialDecision: editorialDecision as unknown as Record<string, unknown>,
          usageMetadata: execution.usageMetadata,
          generator: "GroundedWriterService.multichannel",
          fallbackUsed: execution.fallbackUsed,
          source: "ai"
        };

        // 4. Cross Channel Critic Audit
        const critic = new CrossChannelCritic();
        const crossReport: CrossChannelReport = critic.evaluate(packageOutput, strategies, sku);

        // 5. Final Quality Gate
        const qualityReport = validateEditorialQuality(
          packageOutput,
          editorialDecision.primaryAudience,
          sku
        );

        const isPublishable = qualityReport.passed && crossReport.publishable;

        const validated = ContentOutputSchema.safeParse(packageOutput);
        if (validated.success) {
          return {
            ...validated.data,
            status: isPublishable ? "DRAFT" : "NEEDS_REVIEW",
            factCheckScore: qualityReport.score
          };
        }

        console.error("[GroundedWriter] Validación de schema fallida tras generación IA:", validated.error);
      } catch (aiError) {
        console.error("[GroundedWriter] Error en generación IA multicanal:", aiError);\n        const detail = aiError instanceof Error ? aiError.message : String(aiError);\n        throw new Error(`EDITORIAL_AI_GENERATION_FAILED: ${detail}`);
      }
    }

    // 6. Honest Fallback
    const allowEditorialFallback =
      process.env.ALLOW_EDITORIAL_FALLBACK === "true" ||
      process.env.NODE_ENV === "test" ||
      process.env.VITEST === "true";
    if (!allowEditorialFallback) {
      throw new Error(`EDITORIAL_AI_GENERATION_FAILED: Fallo en IA y fallback no autorizado en producción.`);
    }

    console.warn(`[GroundedWriter] Activando Fallback determinista honesto para ${sku}.`);
    return this.buildHonestFallback(genContext, editorialDecision, strategies, citations);
  }

  private buildPrompt(req: GroundedWriterRequest, strategies: import("@/lib/types/channel-strategy").MultichannelStrategyMap): string {
    const { intel, editorialDecision } = req;
    return `
OBJETIVO: GENERA CONTENIDO EDITORIAL B2B MULTICANAL DIFERENCIADO POR CANAL.
PROHIBIDO GENERAR RESÚMENES DEL BLOG PARA LOS OTROS CANALES.
CADA CANAL DEBE TENER SU PROPIO ARGUMENTO, ESTRUCTURA Y CTA.

PRODUCT TRUTH INMUTABLE:
- SKU: ${intel.sku}
- Marca: ${intel.brand}
- Modelo: ${intel.model}
- Categoría: ${req.category}
- URL Oficial: ${req.productUrl || intel.card.product.url}

TESIS EDITORIAL COMPARTIDA:
- Problema: ${editorialDecision?.thesis.problem}
- Pregunta Técnica: ${editorialDecision?.thesis.technicalQuestion}
- Tensión: ${editorialDecision?.thesis.whyItMatters}
- Argumento Central: ${editorialDecision?.thesis.centralArgument}
- Audiencia: ${editorialDecision?.primaryAudience}

ESTRATEGIAS POR CANAL:
1. BLOG (Educación y análisis): ${strategies.BLOG.objective}. Job: ${strategies.BLOG.jobToBeDone}. Longitud mínima: ${strategies.BLOG.targetLength} palabras.
2. LINKEDIN (Autoridad y debate): ${strategies.LINKEDIN.objective}. Job: ${strategies.LINKEDIN.jobToBeDone}.
3. WHATSAPP (Activación rápida): ${strategies.WHATSAPP.objective}. Job: ${strategies.WHATSAPP.jobToBeDone}.
4. MAILCHIMP (Decisión de aprovisionamiento): ${strategies.MAILCHIMP.objective}. Job: ${strategies.MAILCHIMP.jobToBeDone}.
5. GEO (Respuestas directas y entidades): ${strategies.GEO.objective}. Job: ${strategies.GEO.jobToBeDone}.

Devuelve exclusivamente un JSON conforme a ContentOutputSchema.
`;
  }

  private buildSystemInstruction(audience = "", sku = ""): string {
    return `
Eres el Redactor Técnico y Multicanal Senior de EcomShop.
Tu misión es generar contenido técnico B2B riguroso, útil e independiente.
REGLAS OBLIGATORIAS:
1. SKU HARD LOCK: El único producto que existe en esta campaña es ${sku}. Prohibido mencionar cualquier otro SKU.
2. DIFERENCIACIÓN MULTICANAL: Cada canal debe resolver un Job-To-Be-Done diferente. WhatsApp no es un resumen del blog; LinkedIn no es una copia del blog.
3. GROUNDING: Solo datos verificados del feed. No inventar precios, certificaciones ni especificaciones.
4. CALIDAD EDITORIAL: Desarrollar conceptos técnicos independientes (VLAN, PoE, latencia, roaming, backhaul).
`;
  }

  private buildHonestFallback(
    context: GenerationContext,
    decision: EditorialDecision,
    strategies: import("@/lib/types/channel-strategy").MultichannelStrategyMap,
    citations: Record<string, any>
  ): ContentOutput {
    const sku = context.canonicalSku;
    const writerInput = { context, decision, strategies };

    const blog = generateBlogChannel(undefined, writerInput);
    const linkedin = generateLinkedInChannel(undefined, writerInput);
    const whatsapp = generateWhatsAppChannel(undefined, writerInput);
    const mailchimp = generateMailchimpChannel(undefined, writerInput);
    const geo = generateGeoChannel(undefined, writerInput);

    return {
      topicId: `fallback-${sku.toLowerCase()}-${Date.now().toString(36)}`,
      topicTitle: blog.title,
      category: context.effectiveCategory,
      generatedAt: new Date().toISOString(),
      editorialThesis: decision.thesis,
      outline: decision.outline,
      blog,
      linkedin,
      whatsapp,
      mailchimp,
      geo,
      ecomshop: {
        title: blog.title,
        argumentario: decision.thesis.centralArgument,
        features: context.intel.card.technicalSpecs.keyDifferentiators,
        cmsHtml: `<p>${decision.thesis.centralArgument}</p>`
      },
      citations,
      claims: context.intel.keyClaims.slice(0, 8).map((c) => ({ text: c.claim, sourceId: c.sourceId })),
      editorialDecision: decision as unknown as Record<string, unknown>,
      generator: "catalog-fallback",
      fallbackUsed: true,
      source: "fallback",
      status: "NEEDS_REVIEW",
      fallbackNotice: "Fallback determinista por contingencia: requiere revisión editorial humana explícita antes de publicación."
    };
  }

  /**
   * Método de compatibilidad para suite de tests de fallback (Sprint P1-C).
   */
  buildDeterministicGroundedContent(
    req: GroundedWriterRequest,
    citations: Record<string, any> = {}
  ): ContentOutput {
    const sku = (req.sku || req.intel?.sku || "PRODUCT").trim().toUpperCase();
    const model = req.intel?.model || sku;
    const brand = req.intel?.brand || "EnGenius";
    const category = req.category || "wifi";
    const title = `${brand} ${model}: Criterios técnicos para una decisión B2B`;

    const dummyThesis: import("@/lib/schema").EditorialThesis = {
      problem: `Tomar una decisión técnica correcta para ${brand} ${model}.`,
      targetProfessional: req.targetAudience || "Ingeniero de Telecomunicaciones",
      businessContext: `Evaluación técnica y despliegue B2B para ${sku}.`,
      technicalQuestion: `¿Qué criterios técnicos permiten validar el despliegue de ${model}?`,
      whyItMatters: "Evitar sobredimensionamientos y cuellos de botella en la instalación.",
      centralArgument: `${model} aporta los criterios necesarios para resolver este escenario.`,
      solutionApproach: "Relacionar cada especificación con su implicación operativa.",
      productRole: `${model} es el elemento técnico de la decisión.`
    };

    return {
      topicId: `fallback-${sku.toLowerCase()}-${Date.now().toString(36)}`,
      topicTitle: title,
      category,
      generatedAt: new Date().toISOString(),
      editorialThesis: dummyThesis,
      outline: [
        { section: "Problema técnico", purpose: "Plantear la decisión", argument: dummyThesis.technicalQuestion },
        { section: "Criterios de análisis", purpose: "Interpretar especificaciones", argument: dummyThesis.centralArgument },
        { section: "Aplicación profesional", purpose: "Relacionar producto", argument: `${brand} ${model}` },
        { section: "Decisión final", purpose: "Conclusión accionable", argument: "Criterios verificados" }
      ],
      blog: {
        title,
        metaDescription: `Análisis técnico de ${brand} ${model} para entornos profesionales.`,
        slug: `${sku.toLowerCase()}-analisis-b2b`,
        readingTimeMinutes: 5,
        targetKeywords: [sku, model, category],
        htmlContent: `<article><h2>${dummyThesis.technicalQuestion}</h2><p>${dummyThesis.problem}</p><p>${dummyThesis.centralArgument}</p></article>`,
        cleanPlainTextExcerpt: dummyThesis.centralArgument
      },
      linkedin: {
        hook: `¿Cómo dimensionar ${category} con precisión técnica?`,
        body: dummyThesis.centralArgument,
        takeaways: ["Verificar requisitos de arquitectura", "Validar alimentación y puertos"],
        callToAction: "Debate en comentarios",
        hashtags: ["#NetworkingB2B", `#${sku}`],
        fullPostText: `${title}\n\n${dummyThesis.centralArgument}`
      },
      whatsapp: {
        headline: `${brand} ${sku}`,
        formattedMessage: `*${title}*\n\n${dummyThesis.centralArgument}\n\nFicha: https://ecomshop.es`,
        callToAction: "Consultar ficha",
        targetUrl: "https://ecomshop.es"
      },
      mailchimp: {
        subjectA: `${model} (${sku}): Datos para defender tu proyecto`,
        subjectB: `Criterio técnico: ${sku}`,
        previewText: `Evaluación de ${sku}.`,
        ctaButtonText: "Consultar",
        ctaUrl: "https://ecomshop.es",
        newsletterHtml: `<p>${dummyThesis.centralArgument}</p>`,
        plainText: dummyThesis.centralArgument
      },
      geo: {
        title,
        metaDescription: `Ficha técnica de ${model}.`,
        htmlContent: `<p>${dummyThesis.centralArgument}</p>`
      },
      citations,
      claims: [],
      generator: "catalog-fallback",
      fallbackUsed: true,
      source: "fallback",
      status: "NEEDS_REVIEW",
      fallbackNotice: "Fallback determinista: requiere revisión editorial humana explícita."
    };
  }
}

export { generateDynamicComparativeTableHtml } from "@/lib/services/grounded-writer-comparative";
