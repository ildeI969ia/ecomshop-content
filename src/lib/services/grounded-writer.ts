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
    return {
      ...fallback,
      editorialDecision: req.editorialDecision || undefined,
      status: "NEEDS_REVIEW",
      fallbackUsed: true,
      fallbackNotice: "Fallback determinista: requiere revisión editorial humana antes de aprobación."
    };
  }

  private buildSystemInstruction(activeSources: Array<{ id: string; title: string; type: string; description: string; url?: string }>, audience = ""): string {
    const sourcesContext = activeSources
      .map((s) => `[${s.id}] (${s.type.toUpperCase()}) "${s.title}": ${s.description}`)
      .join("\n");

    return `
Eres un redactor técnico senior y editor jefe de una publicación B2B de ${ECOM_BRAND.name}.
Tu objetivo es producir un artículo que un profesional quiera LEER porque resuelve una pregunta, problema o decisión real.

NO eres un generador de fichas técnicas.
NO eres un redactor publicitario.
NO debes rellenar texto para alcanzar longitud.
El lector es el centro del artículo y el producto es una pieza de la solución.

================ PRODUCT TRUTH ================
- SKU solicitado: el SKU bloqueado por el contexto de generación
- La identidad, marca, modelo y especificaciones del producto proceden EXCLUSIVAMENTE del feed de EcomShop.
- No introduzcas otro SKU, modelo, marca o producto.
- No conviertas inferencias generales en características del producto.
- Si un dato no está en la evidencia del feed, no lo afirmes como hecho del producto.
- No inventes precios, prestaciones, compatibilidades, licencias, disponibilidad, PoE, Wi-Fi, gestión, estándares ni cifras.

================ MISIÓN EDITORIAL ================
El artículo debe seguir esta cadena:

INTENCIÓN DEL LECTOR
→ PROBLEMA
→ PREGUNTA
→ CONTEXTO
→ ANÁLISIS
→ CRITERIOS DE DECISIÓN
→ PRODUCTO COMO SOLUCIÓN
→ APLICACIÓN
→ LIMITACIONES
→ CONCLUSIÓN

Nunca escribas:

PRODUCTO → CARACTERÍSTICAS → CARACTERÍSTICAS → CTA

================ DECISIÓN EDITORIAL ================
La Editorial Decision es la estrategia que debes ejecutar, no volver a decidir.

Debes respetar:
- ángulo seleccionado;
- pregunta central;
- tensión;
- promesa al lector;
- audiencia;
- aprendizajes;
- tesis;
- outline.

Puedes mejorar la redacción, los ejemplos conceptuales y las transiciones, pero NO cambiar la historia editorial por una ficha genérica.

================ VALOR PARA EL LECTOR ================
El artículo debe permitir que el lector:
1. comprenda un problema técnico;
2. entienda por qué importa;
3. aprenda criterios para resolverlo;
4. pueda aplicar esos criterios a un proyecto;
5. comprenda dónde encaja el producto;
6. conozca sus límites o qué debe verificar antes del despliegue.

Debe dejar entre 4 y 7 aprendizajes concretos.

Si se eliminan las menciones al producto, el artículo debe conservar valor educativo. El producto aporta aplicación concreta, no el contenido completo.

================ ESPECIFICACIÓN → DECISIÓN ================
Cada especificación relevante debe tratarse así:

DATO → SIGNIFICADO TÉCNICO → IMPLICACIÓN PROFESIONAL → DECISIÓN

Nunca enumeres características sin explicar para qué sirven.

================ ESTRUCTURA ================
Construye una narrativa profesional, adaptada a la pregunta. Como mínimo:

1. Hook: 100-150 palabras iniciales con problema, contradicción, error habitual o consecuencia.
2. Contexto: por qué la decisión importa.
3. Análisis: conceptos técnicos necesarios.
4. Criterios de decisión: cómo evaluar el escenario.
5. Aplicación: cómo encaja el SKU bloqueado por el contexto de generación.
6. Cuándo encaja / cuándo no: límites y verificaciones.
7. Conclusión: respuesta clara a la pregunta inicial.

El outline proporcionado por el Orchestrator tiene prioridad y debe desarrollarse realmente.

================ ESTILO ================
Escribe como un ingeniero que sabe explicar una decisión técnica a otro profesional:
- preciso;
- pedagógico;
- natural;
- directo;
- sin grandilocuencia;
- sin lenguaje promocional.

PROHIBIDO:
"en el mundo actual"
"en un entorno cada vez más"
"es importante destacar"
"sin duda"
"revolucionario"
"de última generación"
"potente y robusto"
"solución definitiva"
"máximo rendimiento"
"en este artículo veremos"
"en conclusión"

No repitas el nombre del producto en cada párrafo.

================ AUDIENCIA ================
La audiencia seleccionada es: ${audience || "la definida por la Editorial Decision"}.

Adapta el razonamiento a sus decisiones reales. No introduzcas capacidades técnicas específicas solo porque sean habituales en esa audiencia.

================ SEO ================
Responde primero a la intención de búsqueda y optimiza después.
Las keywords deben aparecer de forma natural.
No escribas para un algoritmo.
No repitas keywords artificialmente.
Incluye preguntas relacionadas solo cuando aporten valor real.

================ COMPARATIVAS ================
No inventes competidores.
Puedes comparar tecnologías, enfoques, arquitecturas o criterios técnicos cuando la comparación sea válida.
No atribuyas a productos externos especificaciones no verificadas.

================ CTA ================
El CTA debe ser consecuencia del análisis y aparecer al final.
No conviertas el artículo en una página de venta.

================ FUENTE ================
Evidencia disponible exclusivamente desde el feed EcomShop:
${sourcesContext}

================ SALIDA ================
Devuelve JSON válido conforme a ContentOutputSchema.
El campo blog.htmlContent debe contener un artículo completo, no una ficha técnica.
El campo geo.htmlContent debe reproducir la misma historia editorial, no una versión genérica.
El contenido debe desarrollar de verdad la tesis y el outline.
`;
  }

  private buildPrompt(req: GroundedWriterRequest): string {
    const { intel, editorialControls, targetAudience = req.editorialDecision?.primaryAudience || "" } = req;
    const tone = editorialControls?.editorialTone || intel.recommendedTone;
    const sector = editorialControls?.targetSector || intel.naturalSector;
    const decision = req.editorialDecision;

    return `
ESCRIBE UN ARTÍCULO EDITORIAL B2B DE ALTO VALOR.

PRODUCT TRUTH
- SKU: ${req.sku}
- Modelo: ${intel.model}
- Marca: ${intel.brand}
- URL oficial: ${req.productUrl || intel.card.product.url}
- Categoría: ${req.category}

CONTEXTO EDITORIAL
- Tema solicitado: ${req.topicTitle || "tema derivado de la intención editorial"}
- Audiencia: ${targetAudience}
- Sector: ${sector}
- Tono: ${tone}

DATOS VERIFICADOS DEL FEED
- Interfaces: ${intel.card.technicalSpecs.ports.join(", ") || "No especificado"}
- Estándares: ${intel.card.technicalSpecs.standards.join(", ") || "No especificado"}
- Alimentación: ${intel.card.technicalSpecs.powerRequirements || "No especificado"}
- Gestión: ${intel.card.technicalSpecs.management || "No especificado"}
- Diferenciadores: ${intel.card.technicalSpecs.keyDifferentiators.join(" | ") || "No especificado"}

EDITORIAL DECISION — EJECUTAR, NO REDECIDIR
- Ángulo: ${decision?.selectedAngle.title || "No disponible"}
- Pregunta central: ${decision?.selectedAngle.editorialQuestion || "No disponible"}
- Tensión: ${decision?.selectedAngle.tension || "No disponible"}
- Promesa al lector: ${decision?.selectedAngle.readerPromise || "No disponible"}
- Audiencia primaria: ${decision?.primaryAudience || targetAudience}
- Aprendizajes: ${(decision?.readerLearnings || []).join(" | ")}
- Tesis: ${JSON.stringify(decision?.thesis || {})}
- Outline: ${JSON.stringify(decision?.outline || [])}

REGLAS DE REDACCIÓN

1. ABRE CON EL PROBLEMA, NO CON EL PRODUCTO.
Los primeros 100-150 palabras deben presentar una situación, error, contradicción o decisión profesional.

2. RESPONDE A LA PREGUNTA.
Todo el artículo debe avanzar hacia la resolución de la pregunta central.

3. ENSEÑA.
Desarrolla entre 4 y 7 aprendizajes concretos que el lector pueda aplicar.

4. INTERPRETA.
No enumeres especificaciones. Explica:
dato → significado → implicación → decisión.

5. CONTEXTUALIZA.
Utiliza escenarios profesionales plausibles, pero no inventes datos específicos del producto.

6. APLICA EL PRODUCTO.
Explica cuándo y por qué ${intel.model} encaja en el escenario, usando únicamente Product Truth.

7. DECLARA LIMITACIONES.
Incluye qué debe comprobarse antes de desplegarlo y cuándo otra arquitectura podría ser necesaria, sin inventar prestaciones de terceros.

8. CONCLUYE.
La conclusión debe responder directamente a la pregunta inicial y dejar un criterio de decisión.

9. NO HAGAS RELLENO.
Objetivo orientativo: 1.200-1.800 palabras para un artículo principal; menos si la complejidad real no justifica más extensión.

10. NO ESCRIBAS COMO UNA FICHA.
Si un párrafo podría copiarse sin cambios a cualquier producto del catálogo, reescríbelo para que aporte contexto, razonamiento o aplicación.

11. NO INVENTES.
No inventes precios, cifras, compatibilidades, estándares, PoE, Wi-Fi, licencias, disponibilidad ni rendimiento.

12. NO MENCIONES OTROS PRODUCTOS.
La campaña es monoproducto y el SKU está bloqueado.

PRUEBA FINAL ANTES DE DEVOLVER JSON:
- ¿El lector aprende algo útil aunque no compre el producto?
- ¿Puede tomar una decisión mejor después de leer?
- ¿El producto aparece como solución y no como índice de características?
- ¿La conclusión responde a la pregunta?
- ¿Hay una sección clara sobre límites/verificaciones?
- ¿El texto suena escrito por un profesional y no por una plantilla?

Devuelve JSON válido conforme a ContentOutputSchema.
`;
  }

  private buildDeterministicGroundedContent(
    req: GroundedWriterRequest,
    citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }>
  ): ContentOutput {
    const { intel, sku, targetAudience = req.editorialDecision?.primaryAudience || intel.naturalAudience || "" } = req;
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

    const question = req.editorialDecision?.selectedAngle.editorialQuestion || thesis.technicalQuestion;
    const tension = req.editorialDecision?.selectedAngle.tension || thesis.whyItMatters;
    const readerPromise = req.editorialDecision?.selectedAngle.readerPromise || thesis.centralArgument;
    const learnings = (req.editorialDecision?.readerLearnings || [
      "Identificar los criterios técnicos que condicionan la decisión.",
      "Interpretar las especificaciones antes de comparar productos.",
      "Comprobar las limitaciones del escenario antes del despliegue.",
      "Relacionar la capacidad necesaria con el crecimiento previsto."
    ]).slice(0, 7);

    const keyDifferentiators = technicalSpecs.keyDifferentiators.slice(0, 5);
    const practicalCriteria = [
      "Definir primero la necesidad real y el escenario de instalación.",
      ...keyDifferentiators.map((item) => `Comprobar qué implica técnicamente: ${item}`),
      "Validar antes del despliegue cualquier requisito que el feed no especifique."
    ];

    const blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead">${thesis.whyItMatters} La decisión no debería empezar por una lista de características, sino por el problema que se necesita resolver.</p>

  <h2>${question}</h2>
  <p>${thesis.problem} En un proyecto B2B, la especificación solo es útil cuando permite tomar una decisión concreta. La tensión que guía este análisis es ${tension.toLowerCase()}.</p>

  <h2>Qué hay que entender antes de elegir</h2>
  <p>${thesis.businessContext} Antes de valorar el producto conviene separar la necesidad real de la solución que se pretende instalar. Eso permite evitar dos errores habituales: sobredimensionar el equipo o descubrir una limitación cuando el despliegue ya está en marcha.</p>
  <ul>
    ${learnings.map((item) => `<li>${item}</li>`).join("")}
  </ul>

  <h2>Criterios técnicos que cambian la decisión</h2>
  <p>Las características técnicas deben interpretarse en función del escenario. En lugar de preguntar únicamente qué especificaciones tiene el equipo, hay que preguntar qué consecuencia tiene cada una sobre la instalación, operación y mantenimiento.</p>
  <ul>
    ${practicalCriteria.slice(0, 8).map((item) => `<li>${item}</li>`).join("")}
  </ul>

  <p class="key-takeaway"><strong>Lo importante:</strong> una especificación no es todavía una decisión. Su valor aparece cuando permite descartar una arquitectura, confirmar una compatibilidad o dimensionar correctamente el despliegue.</p>

  <h2>Cómo encaja ${productName}</h2>
  <p>${readerPromise} ${thesis.centralArgument}</p>
  <p>${keyDifferentiators.join(" ") || `La ficha de EcomShop de ${sku} contiene los datos que deben utilizarse para validar el encaje del producto.`}</p>

  <h2>Qué conviene comprobar antes del despliegue</h2>
  <p>${thesis.solutionApproach} Antes de instalar ${productName}, deben comprobarse las condiciones concretas del proyecto y cualquier requisito que no aparezca especificado en el feed de EcomShop. No se deben asumir prestaciones que la ficha no documente.</p>
  <ul>
    <li>Compatibilidad con la arquitectura existente.</li>
    <li>Capacidad necesaria en el escenario real.</li>
    <li>Alimentación e interfaces disponibles.</li>
    <li>Necesidades de crecimiento y mantenimiento.</li>
    <li>Cualquier requisito no especificado explícitamente en la ficha.</li>
  </ul>

  <h2>Cuándo encaja y cuándo conviene replantear la arquitectura</h2>
  <p>${productName} encaja cuando sus características verificadas cubren las necesidades definidas al principio del proyecto. Si una condición esencial queda fuera de lo documentado, la decisión debe detenerse y verificarse antes de comprar o desplegar.</p>

  <h2>La decisión profesional</h2>
  <p>${thesis.centralArgument} El criterio final no es elegir el producto con más características, sino comprobar que las características necesarias para el escenario están realmente cubiertas y documentadas.</p>
  <p><strong>Para llevarse:</strong> ${learnings.slice(0, 3).join(" ")}</p>
</article>`;

    const markdown = [
      `# ${blogTitle}`,
      "",
      thesis.whyItMatters,
      "",
      `## ${question}`,
      thesis.problem,
      "",
      "## Qué hay que entender antes de elegir",
      thesis.businessContext,
      "",
      "## Criterios técnicos",
      ...practicalCriteria.slice(0, 8).map((item) => `- ${item}`),
      "",
      `## Cómo encaja ${productName}`,
      readerPromise,
      "",
      "## Qué conviene comprobar antes del despliegue",
      "Validar el escenario real y cualquier requisito no especificado en el feed de EcomShop.",
      "",
      "## Decisión profesional",
      thesis.centralArgument,
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
