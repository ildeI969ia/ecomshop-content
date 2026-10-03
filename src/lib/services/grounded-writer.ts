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
      const systemInstruction = this.buildSystemInstruction(activeSources, req.targetAudience, req.sku);

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

          // El Writer ejecuta la Editorial Decision; no vuelve a consultar motores
          // legacy de ángulos que puedan introducir contexto ajeno al feed.
          const { buildProductEvidenceMap } = await import("@/lib/services/product-evidence-map");
          const { auditEditorialQualityWithCritic } = await import("@/lib/services/editorial-critic");

          const evidenceMap = buildProductEvidenceMap(req.sku, intel);
          const bestAngle = editorialDecision?.selectedAngle || {
            id: "fallback-angle",
            title: editorialDecision?.thesis?.technicalQuestion || req.topicTitle || req.sku,
            editorialQuestion: editorialDecision?.thesis?.technicalQuestion || req.topicTitle || "¿Qué decisión profesional debe resolver este artículo?",
            tension: editorialDecision?.thesis?.whyItMatters || "necesidad profesional frente a especificaciones aisladas",
            readerPromise: editorialDecision?.thesis?.centralArgument || "El lector podrá convertir los datos verificables en un criterio de decisión.",
            rationale: "Ángulo derivado de la Editorial Decision; sin consulta a motores legacy.",
            relevanceScore: 100,
            targetAudience: editorialDecision?.primaryAudience || req.targetAudience || ""
          };

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

  private buildSystemInstruction(
    activeSources: Array<{ id: string; title: string; type: string; description: string; url?: string }>,
    audience = "",
    sku = ""
  ): string {
    const reqSkuForSystem = sku ? sku.trim().toUpperCase() : "el producto";
    const sourcesContext = activeSources
      .map((s) => `[${s.id}] (${s.type.toUpperCase()}) "${s.title}": ${s.description}`)
      .join("\n");

    return `
Eres un redactor técnico senior y editor jefe de una publicación B2B de ${ECOM_BRAND.name}.
Tu trabajo NO es describir cómo debe escribirse un artículo. Tu trabajo es ESCRIBIR EL ARTÍCULO FINAL.

REGLA PRINCIPAL:
El usuario debe recibir texto editorial terminado, no el brief, no el esquema, no las instrucciones del sistema y no una explicación de lo que debería escribir otro redactor.

================ PRODUCT TRUTH ================
- SKU bloqueado: ${reqSkuForSystem}
- Identidad, marca, modelo y especificaciones: exclusivamente feed EcomShop.
- No introduzcas otro SKU, modelo, marca o producto.
- Si un dato no está en el feed, no lo afirmes como hecho.
- No inventes precios, prestaciones, compatibilidades, licencias, disponibilidad, PoE, Wi-Fi, gestión, estándares ni cifras.

================ TRANSFORMACIÓN EDITORIAL OBLIGATORIA ================
La Editorial Decision contiene instrucciones INTERNAS para ti.
DEBES TRANSFORMARLAS EN PROSA EDITORIAL.

NUNCA COPIES LITERALMENTE COMO CONTENIDO:
- "Editorial Decision"
- "Editorial Brief"
- "Reader Learnings"
- "Reader Promise"
- "Tensión"
- "Tesis"
- "Outline"
- "Criterios técnicos que cambian la decisión"
- "Qué hay que entender antes de elegir"
- "Qué debe comprobar el lector"
- listas de instrucciones dirigidas al redactor
- nombres de campos, etiquetas, variables o estructuras JSON.

Ejemplo:
INPUT INTERNO:
"Pregunta: ¿Cómo reducir errores de inventario?"
"Tensión: capacidad nominal frente a capacidad realmente utilizable"
"Aprendizaje: identificar los criterios que condicionan la decisión"

SALIDA CORRECTA:
Una explicación narrativa que plantee el problema, explique la diferencia entre capacidad nominal y capacidad utilizable y enseñe al profesional qué criterios debe comprobar.

SALIDA INCORRECTA:
"¿Cómo reducir errores de inventario?"
"Tensión: capacidad nominal frente a capacidad..."
"Aprendizaje: identificar..."

La información interna debe DESAPARECER dentro de la redacción y convertirse en contenido útil.

================ MISIÓN EDITORIAL ================
INTENCIÓN DEL LECTOR
→ PROBLEMA REAL
→ CONTEXTO
→ ANÁLISIS
→ CRITERIOS
→ APLICACIÓN
→ LIMITACIONES
→ CONCLUSIÓN

Nunca:
PRODUCTO → CARACTERÍSTICAS → CARACTERÍSTICAS → CTA

El producto es una respuesta concreta dentro de una explicación útil; no es el índice del artículo.

================ VALOR PARA EL LECTOR ================
El lector debe poder:
1. comprender un problema técnico;
2. entender por qué importa;
3. aprender criterios aplicables;
4. aplicar esos criterios a un proyecto;
5. comprender dónde encaja el SKU;
6. conocer límites y verificaciones necesarias.

Si se eliminan las menciones al producto, el artículo debe conservar valor educativo.

================ ESPECIFICACIÓN → DECISIÓN ================
Cada especificación relevante debe convertirse en:
DATO → SIGNIFICADO TÉCNICO → IMPLICACIÓN PROFESIONAL → DECISIÓN

No enumeres características sin explicar su significado.

================ ESTRUCTURA DEL BLOG ================
- Apertura narrativa de 100-150 palabras: problema, situación o decisión profesional.
- Desarrollo del contexto.
- Análisis técnico.
- Criterios de decisión.
- Aplicación al SKU bloqueado.
- Límites y verificaciones.
- Conclusión que responda a la pregunta inicial.

El outline es una guía interna. NO LO IMPRIMAS COMO OUTLINE.

================ TODAS LAS LÍNEAS EDITORIALES ================
Genera contenido terminado para cada canal solicitado:

BLOG:
Artículo B2B completo, profundo y legible. Es la pieza editorial principal.

GEO/PR:
Versión editorial del mismo argumento, no una ficha técnica ni un texto genérico. Debe conservar la misma pregunta, tesis, producto y hechos.

MAILCHIMP:
Asunto, preview, cuerpo y CTA orientados a generar interés real sin convertir el contenido en una lista de especificaciones.

WHATSAPP:
Mensaje breve y natural que explique por qué el producto o tema merece atención. No copies el blog ni escribas una ficha.

LINKEDIN:
Post profesional con contexto, idea técnica y aprendizaje. No enumeres características sin interpretación.

ECOMSHOP:
Argumentario útil para la ficha comercial, basado únicamente en hechos del feed y en la aplicación profesional.

Todos los canales deben hablar del MISMO SKU y de la MISMA realidad técnica. Solo cambia el formato, profundidad y tono del canal.

================ ESTILO ================
Escribe como un ingeniero que sabe explicar una decisión técnica a otro profesional:
- preciso;
- pedagógico;
- natural;
- directo;
- sin grandilocuencia;
- sin lenguaje promocional vacío.

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
Adapta la explicación a sus decisiones reales. No introduzcas capacidades técnicas específicas solo porque sean habituales en esa audiencia.

================ SEO ================
Responde primero a la intención de búsqueda y optimiza después.
Keywords naturales. No escribas para un algoritmo.

================ COMPARATIVAS ================
No inventes competidores ni productos externos.
Las comparaciones tecnológicas solo son válidas si pueden sostenerse sin inventar datos.

================ CTA ================
El CTA debe ser consecuencia del contenido y aparecer al final. No conviertas el artículo en una página de venta.

================ FUENTES ================
Evidencia exclusivamente desde el feed EcomShop:
${sourcesContext}

================ CONTROL FINAL ANTES DEL JSON ================
Antes de devolver el JSON, comprueba:
- ¿He escrito el contenido final o he repetido instrucciones?
- ¿El primer párrafo parece escrito para un lector real?
- ¿El lector aprende algo útil aunque no compre?
- ¿El producto aparece como aplicación de un criterio y no como índice de características?
- ¿Todos los canales hablan del mismo SKU?
- ¿He eliminado cualquier texto de planificación editorial?
- ¿He evitado datos no presentes en el feed?

Devuelve JSON válido conforme a ContentOutputSchema.
blog.htmlContent y geo.htmlContent deben contener ARTÍCULOS TERMINADOS.
Nunca devuelvas un outline, brief o conjunto de instrucciones como sustituto del artículo.
`;
  }

  private buildPrompt(req: GroundedWriterRequest): string {
    const { intel, editorialControls, targetAudience = req.editorialDecision?.primaryAudience || "" } = req;
    const tone = editorialControls?.editorialTone || intel.recommendedTone;
    const sector = editorialControls?.targetSector || intel.naturalSector;
    const decision = req.editorialDecision;

    return `
OBJETIVO: ESCRIBE EL CONTENIDO FINAL. NO ESCRIBAS LAS INSTRUCCIONES PARA ESCRIBIRLO.

PRODUCT TRUTH BLOQUEADO
- SKU: ${req.sku}
- Modelo: ${intel.model}
- Marca: ${intel.brand}
- URL oficial: ${req.productUrl || intel.card.product.url}
- Categoría: ${req.category}

CONTEXTO
- Tema: ${req.topicTitle || "tema derivado de la intención editorial"}
- Audiencia: ${targetAudience}
- Sector: ${sector}
- Tono: ${tone}

DATOS VERIFICADOS DEL FEED
- Interfaces: ${intel.card.technicalSpecs.ports.join(", ") || "No especificado"}
- Estándares: ${intel.card.technicalSpecs.standards.join(", ") || "No especificado"}
- Alimentación: ${intel.card.technicalSpecs.powerRequirements || "No especificado"}
- Gestión: ${intel.card.technicalSpecs.management || "No especificado"}
- Diferenciadores: ${intel.card.technicalSpecs.keyDifferentiators.join(" | ") || "No especificado"}

BRIEF EDITORIAL INTERNO — NO COPIAR AL ARTÍCULO
- Ángulo: ${decision?.selectedAngle.title || "No disponible"}
- Pregunta central: ${decision?.selectedAngle.editorialQuestion || "No disponible"}
- Tensión: ${decision?.selectedAngle.tension || "No disponible"}
- Promesa al lector: ${decision?.selectedAngle.readerPromise || "No disponible"}
- Audiencia primaria: ${decision?.primaryAudience || targetAudience}
- Aprendizajes: ${(decision?.readerLearnings || []).join(" | ")}
- Tesis: ${JSON.stringify(decision?.thesis || {})}
- Outline: ${JSON.stringify(decision?.outline || [])}

TRANSFORMACIÓN:
Convierte todo el brief anterior en un artículo terminado.

NO escribas frases como:
- "Qué hay que entender antes de elegir"
- "Criterios técnicos que cambian la decisión"
- "Qué evidencia debe verificarse"
- "El lector aprenderá..."
- "El objetivo de este artículo..."
- "En este artículo veremos..."
- "Según el outline..."
- "La tensión es..."
- "La tesis es..."
- "El lector debe..."

En su lugar, EXPLICA directamente el conocimiento al lector.

REGLAS DE REDACCIÓN

1. ABRE CON EL PROBLEMA, NO CON EL PRODUCTO.
Los primeros 100-150 palabras deben parecer el inicio de un artículo profesional.

2. RESPONDE A LA PREGUNTA.
Cada sección debe aportar una parte de la respuesta.

3. ENSEÑA.
Convierte los aprendizajes internos en explicaciones, ejemplos conceptuales y criterios que el lector pueda aplicar.

4. INTERPRETA.
Usa:
dato → significado → implicación → decisión.

5. APLICA EL PRODUCTO.
Explica dónde encaja ${intel.model}, usando exclusivamente Product Truth.

6. LIMITACIONES.
Explica qué debe verificarse y cuándo el escenario requiere otra solución, sin inventar prestaciones.

7. CONCLUYE.
Responde directamente a la pregunta inicial.

8. NO RELLENES.
Objetivo orientativo: 1.200-1.800 palabras para el blog principal; menos si la complejidad no justifica más.

9. NO ESCRIBAS COMO FICHA.
Un párrafo que podría copiarse literalmente a otro SKU debe reescribirse para aportar contexto, razonamiento o aplicación.

10. NO INVENTES.
Nada de precios, cifras, compatibilidades, estándares, PoE, Wi-Fi, licencias, disponibilidad o rendimiento que no estén documentados.

11. MONOPRODUCTO.
No introduzcas otro SKU, modelo, marca o producto.

12. CONSISTENCIA MULTICANAL.
Blog, GEO, Mailchimp, WhatsApp, LinkedIn y EcomShop deben partir de la misma tesis y Product Truth, adaptando únicamente el formato y la profundidad.

13. TEXTO FINAL.
Todo campo destinado a contenido debe ser publicable. No pongas instrucciones, prompts, listas de trabajo ni explicaciones del proceso.

CONTROL FINAL:
- ¿Estoy entregando un artículo real?
- ¿El lector puede aprender algo útil?
- ¿La pregunta central queda respondida?
- ¿El SKU es siempre ${req.sku}?
- ¿El texto no parece una ficha ni un brief?
- ¿Los demás canales son piezas reales y no instrucciones?

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
  <p class="lead">${thesis.problem} En un proyecto B2B, una especificación solo aporta valor cuando ayuda a resolver una decisión concreta y puede contrastarse con las necesidades reales de la instalación.</p>

  <h2>${question}</h2>
  <p>${tension}. Por eso, antes de valorar una referencia conviene definir qué necesita realmente el proyecto, qué restricciones existen y qué información debe estar documentada.</p>

  <h2>El criterio técnico antes que la referencia</h2>
  <p>${thesis.businessContext} El orden importa: primero se define el escenario y después se comprueba si las capacidades documentadas del equipo responden a ese escenario. Esto evita convertir el catálogo en el punto de partida de una decisión que debería ser técnica.</p>
  <p>En la práctica, los datos disponibles deben interpretarse uno a uno. ${keyDifferentiators.length ? keyDifferentiators.join(" ") : "Cuando una característica no está especificada en el feed, debe considerarse un dato pendiente de verificación."}</p>

  <h2>Qué comprobar en el proyecto</h2>
  <ul>
    ${practicalCriteria.slice(0, 6).map((item) => `<li>${item}</li>`).join("")}
  </ul>

  <h2>Dónde encaja ${productName}</h2>
  <p>${readerPromise} ${thesis.centralArgument}</p>
  <p>La referencia ${sku} debe valorarse con los datos publicados en EcomShop. ${specsList.length ? `La información disponible documenta: ${specsList.join(", ")}.` : "Cuando una capacidad necesaria no aparece documentada, debe verificarse antes de tomar una decisión de compra o despliegue."}</p>

  <h2>Qué debe verificarse antes de desplegar</h2>
  <p>${thesis.solutionApproach} No debe asumirse ninguna prestación que la ficha de EcomShop no documente expresamente. La compatibilidad con la arquitectura existente, las necesidades de capacidad, las interfaces, la alimentación y cualquier requisito específico del proyecto deben validarse antes de la instalación.</p>

  <h2>La decisión profesional</h2>
  <p>${thesis.centralArgument} El criterio final consiste en comprobar que las capacidades necesarias están cubiertas por datos verificables y que las condiciones del proyecto son compatibles con ellos.</p>
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
      fallbackNotice: "Generación determinista basada exclusivamente en el feed de EcomShop. El contenido es un borrador de contingencia y requiere revisión editorial humana; no representa una generación IA completada."
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
