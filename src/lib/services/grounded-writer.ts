import { ContentOutput, ContentOutputSchema, EditorialThesis, SectionOutlineItem } from "@/lib/schema";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { StructuredProductIntelligence } from "./notebook-intelligence";
import { ECOM_BRAND } from "@/lib/knowledge";
import { AI_REQUEST_TIMEOUT_MS } from "@/lib/ai-config";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";
import type { EditorialDecision } from "@/lib/types/editorial-orchestrator";

export interface GroundedWriterRequest {
  sku: string;
  topicTitle: string;
  category: string;
  productUrl?: string;
  targetAudience?: string;
  customNotes?: string;
  editorialControls?: EditorialControls;
  selectedSourceIds?: string[];
  intel: StructuredProductIntelligence;
  apiKey?: string;
  editorialDecision?: EditorialDecision;
}

export class GroundedWriterService {
  /**
   * Genera el paquete de contenido multicanal B2B basado en Tesis Editorial y Grounding NotebookLM
   */
  async generateGroundedContent(req: GroundedWriterRequest): Promise<ContentOutput> {
    const { intel, editorialControls, editorialDecision } = req;

    // Grounding exclusivamente desde el feed de EcomShop.
    // selectedSourceIds se conserva por compatibilidad, pero ya no decide la fuente de verdad.
    const activeSources = intel.card.evidenceLedger.map((evidence, index) => ({
      id: evidence.source,
      title: `Feed EcomShop — ${intel.sku}${index > 0 ? ` #${index + 1}` : ""}`,
      type: evidence.sourceType,
      description: evidence.claim,
      url: evidence.source
    }));

    const citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }> = {};
    activeSources.forEach((s) => {
      citations[s.id] = {
        id: s.id,
        title: s.title,
        type: s.type,
        excerpt: s.description,
        url: s.url
      };
    });

    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!req.apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
    const key = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let lastModelError: any = null;

    if (key || isVertex) {
      const { getGenAIClient, getActiveGeminiModel } = await import("@/lib/genai-client");
      const ai = getGenAIClient(req.apiKey);
      const activeModel = getActiveGeminiModel(req.apiKey);

      const prompt = this.buildPrompt(req);
      const systemInstruction = this.buildSystemInstruction(activeSources, req.targetAudience);

      const { AI_TEXT_MODEL, AI_FALLBACK_MODEL } = await import("@/lib/ai-config");
      const candidateModels = [activeModel, AI_TEXT_MODEL, AI_FALLBACK_MODEL]
        .filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

      for (const modelToTry of candidateModels) {
        try {
          const generatePromise = ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.5,
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout con modelo ${modelToTry} en Vertex AI (${AI_REQUEST_TIMEOUT_MS}ms)`)), AI_REQUEST_TIMEOUT_MS)
          );

          const res = await Promise.race([generatePromise, timeoutPromise]);
          let rawText = (res as any).text || "{}";
          rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

          const parsed = JSON.parse(rawText);
          const usageMetadata = (res as any).usageMetadata ? {
            promptTokenCount: (res as any).usageMetadata.promptTokenCount,
            candidatesTokenCount: (res as any).usageMetadata.candidatesTokenCount,
            totalTokenCount: (res as any).usageMetadata.totalTokenCount
          } : undefined;

          const comparativeTableHtml = generateDynamicComparativeTableHtml(intel);
          const geoObj = {
            title: parsed.geo?.title || parsed.blog?.title || `${intel.brand} ${intel.model}: Despliegue B2B`,
            metaDescription: parsed.geo?.metaDescription || parsed.blog?.metaDescription || `Análisis técnico de ${intel.brand} ${intel.model}.`,
            htmlContent: parsed.geo?.htmlContent || parsed.blog?.htmlContent || "",
            comparativeTableHtml: parsed.geo?.comparativeTableHtml || comparativeTableHtml,
            jsonLd: parsed.geo?.jsonLd || JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": `${intel.brand} ${intel.model}`,
              "sku": intel.sku,
              "brand": { "@type": "Brand", "name": intel.brand }
            }, null, 2),
            markdownContent: parsed.geo?.markdownContent || `# ${intel.brand} ${intel.model}\n\n${comparativeTableHtml}`
          };

          const rawOutput = {
            ...parsed,
            editorialDecision: editorialDecision || undefined,
            geo: geoObj,
            usageMetadata,
            citations: { ...citations, ...(parsed.citations || {}) }
          };

          // Integrar Editorial Critic, Product Evidence Map y Angle Engine
          const { detectProductType, buildProductEvidenceMap } = await import("@/lib/services/product-evidence-map");
          const { generateEditorialAngleCandidates, selectBestEditorialAngle } = await import("@/lib/services/editorial-angle-engine");
          const { auditEditorialQualityWithCritic } = await import("@/lib/services/editorial-critic");

          const productType = detectProductType(req.sku, req.category, intel.card?.technicalSpecs?.deviceType);
          const evidenceMap = buildProductEvidenceMap(req.sku, intel);
          const angleCandidates = generateEditorialAngleCandidates(req.sku, productType, req.targetAudience || "", intel);
          const bestAngle = editorialDecision?.selectedAngle || selectBestEditorialAngle(angleCandidates);

          const criticReport = auditEditorialQualityWithCritic(rawOutput as any, bestAngle, evidenceMap, req.targetAudience);
          const qualityReport = validateEditorialQuality(rawOutput as any, req.targetAudience, req.sku);

          const validated = ContentOutputSchema.safeParse(rawOutput);
          if (validated.success) {
            return {
              ...validated.data,
              source: "ai",
              status: (qualityReport.passed && criticReport.publishability >= 8) ? "DRAFT" : "NEEDS_REVIEW",
              factCheckScore: qualityReport.score
            };
          }
        } catch (modelErr) {
          lastModelError = modelErr;
          console.error(`[GroundedWriter] Fallo con ${modelToTry} en Vertex AI:`, modelErr);
        }
      }
    }

    console.warn(`[GroundedWriter] Usando fallback determinista Mandato 2 para SKU ${req.sku} (Audiencia: ${req.targetAudience || "sin audiencia explícita"}).`);
    return this.generateGroundedFallback(req, citations);
  }

  private generateGroundedFallback(req: GroundedWriterRequest, citations: Record<string, any>): ContentOutput {
    const fallback = this.buildDeterministicGroundedContent(req, citations);
    return { ...fallback, editorialDecision: req.editorialDecision || undefined };
  }

  private buildSystemInstruction(activeSources: Array<{ id: string; title: string; type: string; description: string; url?: string }>, audience = ""): string {
    const sourcesContext = activeSources
      .map((s) => `[${s.id}] (${s.type.toUpperCase()}) "${s.title}": ${s.description}`)
      .join("\n");

    return `
Eres el Director de Estrategia e Inteligencia Editorial B2B de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión NO es escribir fichas técnicas ampliadas ni artículos genéricos. Tu misión es DESCUBRIR UNA HISTORIA EDITORIAL ALREDEDOR DE CADA PRODUCTO.

🎯 REGLA DE FUENTE DE VERDAD DE PRODUCTO (SKU):
- El SKU y modelo del producto solicitado por el usuario es la ÚNICA FUENTE DE VERDAD del producto que se debe generar.
- Queda TERMINANTEMENTE PROHIBIDO hablar de marcas, modelos o productos ajenos al SKU solicitado (ej. No mencionar ECW510 cuando se solicita DAC-10G-3M o ST3116G).

🎯 SUPERMANDATO EDITORIAL B2B - REGLAS OBLIGATORIAS DE REDACCIÓN:
1. ÁNGULO Y PREGUNTA CENTRAL: Todo artículo debe responder a una única PREGUNTA CENTRAL relevante que un profesional quiera resolver (ej: "¿DAC o fibra para 10G en rack?").
2. TENSIÓN NARRATIVA: Construye siempre una tensión (Opción A vs Opción B, Ahorro inicial vs TCO a 3-5 años, Rendimiento teórico vs Realidad en obra).
3. PROMESA AL LECTOR: Al terminar el artículo, el profesional debe haber aprendido entre 3 y 5 conocimientos concretos aplicables a su trabajo.
4. MICROCONCLUSIONES: Incluye una frase de "Idea clave" o microconclusión tras cada bloque técnico principal.
5. REGLA "¿Y QUÉ?": Especificación -> Significado Técnico -> Implicación -> Decisión Profesional.
6. ELIMINAR IA-SPEAK Y SOBREADJETIVACIÓN: Prohibido usar frases vacías como "en el mundo actual", "es importante destacar", "revolucionario", "de última generación", "potente y robusto". Deja que los hechos técnicos convenzan.
7. APERTURA NARRATIVA (OPENING HOOK): Los primeros 100-150 palabras DEBEN plantear una contradicción, un error habitual o una consecuencia técnica. PROHIBIDO empezar con "Visión General del Producto" o fichas técnicas.
8. COMPARATIVAS REALES Y TABLAS ÚTILES: Queda prohibido inventar competidores genéricos como "Alternativa Comercial Genérica". Las comparaciones son Tecnología A vs Tecnología B o Enfoque A vs Enfoque B.

ADAPTACIÓN ESTRICTA A LA AUDIENCIA SELECCIONADA (${audience}):
- Instalador / Técnico: montaje físico, tendido de cableado, presupuestos PoE, tiempos de obra, prevención de incidencias en campo.
- Director TIC / Sistemas: arquitectura de red, seguridad WPA3, latencia MLO, gestión centralizada cloud, 0€ en cuotas de software.
- Jefe de Compras / TCO: TCO a 3-5 años, riesgo de licencias cautivas, disponibilidad e inventario en España (24/48h) y tarifas B2B.
- Distribuidor / Canal: demanda de mercado B2B, venta cruzada con electrónica prescrita, rotación de catálogo y canal protegido.

FUENTE ÚNICA DE VERDAD — FEED ECOMSHOP PARA CITAS:
${sourcesContext}

REGLA ESTRICTA DE PRECIOS B2B:
- TOLERANCIA CERO A PRECIOS NUMÉRICOS INVENTADOS EN EUROS. Indicar siempre: "Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h".

Debes responder SIEMPRE en formato JSON estricto cumpliendo la estructura ContentOutputSchema con editorialThesis y outline.
`;
  }

  private buildPrompt(req: GroundedWriterRequest): string {
    const { intel, editorialControls, targetAudience = "Instalador B2B" } = req;
    const tone = editorialControls?.editorialTone || intel.recommendedTone;
    const sector = editorialControls?.targetSector || intel.naturalSector;

    return `
Genera el artículo maestro de inteligencia editorial B2B para el producto SOLICITADO:
- SKU Solicitado: ${req.sku}
- Modelo Solicitado: ${intel.model}
- Marca: ${intel.brand}
- Título/Tema: ${req.topicTitle}
- Audiencia Objetivo: ${targetAudience}
- Sector Objetivo: ${sector}
- Tono Editorial: ${tone}
- Specs del Datasheet:
  * Puertos: ${intel.card.technicalSpecs.ports.join(", ")}
  * Estándares: ${intel.card.technicalSpecs.standards.join(", ")}
  * Alimentación: ${intel.card.technicalSpecs.powerRequirements}
  * Gestión: ${intel.card.technicalSpecs.management}

Asegúrate de que el artículo hable EXCLUSIVAMENTE del producto ${req.sku} (${intel.model}) y responda a las necesidades de ${targetAudience}.\n\nDECISIÓN EDITORIAL DEL ORCHESTRATOR (NO REDECIDIR):\n- Ángulo: ${req.editorialDecision?.selectedAngle.title || "No disponible"}\n- Pregunta central: ${req.editorialDecision?.selectedAngle.editorialQuestion || "No disponible"}\n- Tensión: ${req.editorialDecision?.selectedAngle.tension || "No disponible"}\n- Promesa: ${req.editorialDecision?.selectedAngle.readerPromise || "No disponible"}\n- Target primario: ${req.editorialDecision?.primaryAudience || targetAudience}\n- Aprendizajes: ${(req.editorialDecision?.readerLearnings || []).join(" | ")}\n- Tesis: ${JSON.stringify(req.editorialDecision?.thesis || {})}\n- Outline: ${JSON.stringify(req.editorialDecision?.outline || [])}\n\nREGLA: no sustituir el ángulo, target, tesis u outline por una plantilla genérica. La decisión anterior es la fuente de verdad editorial.
`;
  }

  private buildDeterministicGroundedContent(
    req: GroundedWriterRequest,
    citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }>
  ): ContentOutput {
    const { intel, sku, targetAudience = req.editorialDecision?.primaryAudience || intel.naturalAudience } = req;
    const productName = `${intel.brand} ${intel.model}`;
    const technicalSpecs = intel.card.technicalSpecs;
    const claims = intel.keyClaims.slice(0, 8);
    const primarySource = intel.card.product.url || "https://www.ecomshop.es";

    const thesis: EditorialThesis = req.editorialDecision?.thesis || {
      problem: `Tomar una decisión técnica correcta para ${productName} sin sobredimensionar ni introducir componentes que no pertenecen al producto seleccionado.`,
      targetProfessional: targetAudience,
      businessContext: `Evaluación y despliegue B2B del producto ${productName} a partir de su ficha oficial de EcomShop.`,
      technicalQuestion: req.editorialDecision?.selectedAngle.editorialQuestion || `¿Qué criterios técnicos permiten decidir si ${productName} encaja en este escenario?`,
      whyItMatters: "Una decisión basada en datos verificables reduce errores de dimensionamiento y de compra.",
      centralArgument: `${productName} debe evaluarse exclusivamente con sus características verificadas en EcomShop y con el contexto profesional definido para esta campaña.`,
      solutionApproach: "Relacionar cada especificación con su implicación práctica antes de tomar la decisión de despliegue.",
      productRole: `${productName} es el producto objeto de esta campaña y no debe sustituirse por otro SKU.`
    };

    const outline: SectionOutlineItem[] = req.editorialDecision?.outline?.length
      ? req.editorialDecision.outline
      : [
          { section: "Qué problema hay que resolver", purpose: "Definir el escenario profesional.", argument: thesis.technicalQuestion },
          { section: "Qué dicen los datos del producto", purpose: "Interpretar las especificaciones verificadas.", argument: technicalSpecs.keyDifferentiators.slice(0, 2).join(" ") || productName },
          { section: "Cómo evaluar el despliegue", purpose: "Convertir especificaciones en criterios de decisión.", argument: technicalSpecs.ports.join(", ") || "Interfaces verificadas en EcomShop." },
          { section: `Dónde encaja ${intel.model}`, purpose: "Aplicar los datos al escenario.", argument: `${productName} según su ficha oficial.` }
        ];

    const specsList = [
      ...technicalSpecs.ports,
      ...technicalSpecs.standards,
      technicalSpecs.powerRequirements,
      technicalSpecs.management
    ].filter(Boolean);

    const blogTitle = req.editorialDecision?.selectedAngle.title
      ? `${req.editorialDecision.selectedAngle.title} — ${productName}`
      : `${productName}: criterios técnicos para una decisión B2B`;

    const blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead">${thesis.whyItMatters}</p>
  <h2>El problema que hay que resolver</h2>
  <p>${thesis.problem} ${thesis.businessContext}</p>
  <h2>Qué dicen los datos de ${intel.model}</h2>
  <p>${technicalSpecs.keyDifferentiators.slice(0, 4).join(" ")} ${technicalSpecs.ports.join(". ")}.</p>
  <h2>Cómo convertir las especificaciones en una decisión</h2>
  <p>${thesis.centralArgument} ${thesis.solutionApproach}</p>
  <ul>${specsList.slice(0, 8).map((spec) => `<li>${spec}</li>`).join("")}</ul>
  <h2>Aplicación al escenario profesional</h2>
  <p>Para ${targetAudience}, la decisión debe contrastarse con las necesidades reales de instalación, operación, disponibilidad y mantenimiento. Los datos de esta sección proceden exclusivamente de la ficha de EcomShop de ${intel.sku}.</p>
  <p><strong>Idea clave:</strong> ${productName} es el producto evaluado; cualquier componente adicional debe tratarse como accesorio o compatibilidad explícita, nunca como sustituto del SKU seleccionado.</p>
</article>`;

    const markdown = [
      `# ${blogTitle}`,
      "",
      thesis.problem,
      "",
      "## Datos técnicos verificables",
      ...specsList.slice(0, 8).map((spec) => `- ${spec}`),
      "",
      `Fuente: ${primarySource}`
    ].join("\n");

    return {
      topicId: `feed-${intel.sku.toLowerCase()}-${Date.now().toString(36)}`,
      topicTitle: blogTitle,
      category: intel.card.product.category,
      generatedAt: new Date().toISOString(),
      editorialThesis: thesis,
      outline,
      blog: {
        title: blogTitle,
        metaDescription: `Análisis B2B de ${productName} basado en la ficha oficial de EcomShop.`,
        slug: `${intel.sku.toLowerCase()}-analisis-b2b`,
        readingTimeMinutes: 4,
        targetKeywords: [intel.sku, intel.model, intel.card.product.category],
        htmlContent: blogHtml,
        cleanPlainTextExcerpt: thesis.centralArgument
      },
      mailchimp: {
        subjectA: `${productName}: datos técnicos para decidir`,
        subjectB: `Ficha B2B de ${intel.sku}`,
        previewText: `Información verificada de ${productName} desde EcomShop.`,
        ctaButtonText: "Consultar producto",
        ctaUrl: primarySource,
        newsletterHtml: `<p>${thesis.centralArgument}</p><p>${technicalSpecs.keyDifferentiators.slice(0, 3).join(". ")}</p>`,
        plainText: `${productName} — ${thesis.centralArgument}`
      },
      whatsapp: {
        headline: `${productName}`,
        formattedMessage: `${productName}\\n\\n${technicalSpecs.keyDifferentiators.slice(0, 3).join("\\n")}\\n\\nFicha: ${primarySource}`,
        callToAction: "Consultar producto",
        targetUrl: primarySource
      },
      linkedin: {
        hook: `${productName}: qué revisar antes de desplegarlo`,
        body: `${thesis.centralArgument} ${technicalSpecs.ports.slice(0, 2).join(". ")}.`,
        takeaways: technicalSpecs.keyDifferentiators.slice(0, 4),
        callToAction: "Consultar ficha técnica",
        hashtags: ["#EcomShop", "#NetworkingB2B", `#${intel.sku}`],
        fullPostText: `${productName}: ${thesis.centralArgument}`
      },
      geo: {
        title: blogTitle,
        metaDescription: `Ficha técnica B2B de ${productName}.`,
        htmlContent: blogHtml,
        comparativeTableHtml: generateDynamicComparativeTableHtml(intel),
        jsonLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: intel.card.product.model || intel.model,
          sku: intel.card.product.sku || intel.sku,
          brand: { "@type": "Brand", name: intel.card.product.brand || intel.brand },
          url: primarySource
        }, null, 2),
        markdownContent: markdown
      },
      citations,
      claims: claims.map((claim) => ({ text: claim.claim, sourceId: claim.sourceId })),
      source: "fallback",
      generator: "GroundedWriterService.feed-only",
      fallbackUsed: true,
      fallbackNotice: "Generación determinista basada exclusivamente en el feed de EcomShop."
    };
  }

}

export function generateDynamicComparativeTableHtml(intel: StructuredProductIntelligence): string {
  const productName = `${intel.brand} ${intel.model}`;
  const specs = intel.card.technicalSpecs;

  const rows = [
    ["SKU", intel.sku],
    ["Interfaces", specs.ports.join(" + ") || "No especificado"],
    ["Estándares", specs.standards.join(" / ") || "No especificado"],
    ["Alimentación", specs.powerRequirements || "No especificado"],
    ["Gestión", specs.management || "No especificado"],
    ["Diferenciadores", specs.keyDifferentiators.join(" · ") || "No especificado"]
  ];

  return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Dato verificable</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${productName}</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map(([label, value]) => `
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">${label}</td>
      <td class="p-3 border border-slate-200 text-slate-900">${value}</td>
    </tr>`).join("")}
  </tbody>
</table>`.trim();
}
