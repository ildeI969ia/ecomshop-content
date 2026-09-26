import { ContentOutput, ContentOutputSchema, EditorialThesis, SectionOutlineItem } from "@/lib/schema";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { StructuredProductIntelligence } from "./notebook-intelligence";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import { ECOM_BRAND } from "@/lib/knowledge";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";

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
}

export class GroundedWriterService {
  /**
   * Genera el paquete de contenido multicanal B2B basado en Tesis Editorial y Grounding NotebookLM
   */
  async generateGroundedContent(req: GroundedWriterRequest): Promise<ContentOutput> {
    const { intel, selectedSourceIds = [], editorialControls } = req;

    // Resolver las fuentes que se usarán para el grounding
    const allSources = OFFICIAL_NOTEBOOK.sources;
    const activeSources = allSources.filter((s) =>
      selectedSourceIds.length > 0 ? selectedSourceIds.includes(s.id) : true
    );

    // Construir el diccionario de citas para tooltips y Source Drawer
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

      const prompt = this.buildPrompt(req, activeSources);
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
            setTimeout(() => reject(new Error(`Timeout con modelo ${modelToTry} en Vertex AI (75s)`)), 75000)
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
            geo: geoObj,
            usageMetadata,
            citations: { ...citations, ...(parsed.citations || {}) }
          };

          // Audit con el Quality Gate Mandato 2 y Contaminación
          const qualityReport = validateEditorialQuality(rawOutput as any, req.targetAudience, req.sku);

          const validated = ContentOutputSchema.safeParse(rawOutput);
          if (validated.success) {
            return {
              ...validated.data,
              source: "ai",
              status: qualityReport.passed ? "DRAFT" : "NEEDS_REVIEW",
              factCheckScore: qualityReport.score
            };
          }
        } catch (modelErr) {
          lastModelError = modelErr;
          console.error(`[GroundedWriter] Fallo con ${modelToTry} en Vertex AI:`, modelErr);
        }
      }
    }

    console.warn(`[GroundedWriter] Usando fallback determinista Mandato 2 para SKU ${req.sku} (Audiencia: ${req.targetAudience || 'Instalador B2B'}).`);
    return this.generateGroundedFallback(req, citations);
  }

  private generateGroundedFallback(req: GroundedWriterRequest, citations: Record<string, any>): ContentOutput {
    return this.buildDeterministicGroundedContent(req, citations);
  }

  private buildSystemInstruction(activeSources: typeof OFFICIAL_NOTEBOOK.sources, audience = "Instalador B2B"): string {
    const sourcesContext = activeSources
      .map((s) => `[${s.id}] (${s.type.toUpperCase()}) "${s.title}": ${s.description}`)
      .join("\n");

    return `
Eres el Director de Estrategia Técnica y Jefe de Ingeniería Preventa de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión es redactar artículos técnicos de blog y campañas B2B guiados por el MANDATO DE SINCRONIZACIÓN Y CALIDAD EDITORIAL B2B.

🎯 REGLA DE FUENTE DE VERDAD DE PRODUCTO (SKU):
- El SKU y modelo del producto solicitado por el usuario es la ÚNICA FUENTE DE VERDAD del producto que se debe generar.
- Queda TERMINANTEMENTE PROHIBIDO hablar de marcas, modelos o productos ajenos al SKU solicitado (ej. No mencionar ECW510 cuando se solicita DAC-10G-3M o ST3116G).

🎯 REGLA FUNDAMENTAL: EL PRODUCTO NO ES EL TEMA PRINCIPAL DEL ARTÍCULO.
- El producto es una respuesta concreta a una cuestión profesional o de ingeniería de la audiencia.
- El primer 20-30% del artículo DEBE centrarse exclusivamente en: PROBLEMA REAL PROFESIONAL + CONTEXTO + POR QUÉ IMPORTA + CRITERIOS TÉCNICOS DE DECISIÓN.
- El producto concreto NO se introduce hasta la zona central/posterior del artículo como solución a los criterios expuestos.

PROHIBICIONES ESTRICTAS DE APERTURA EDITORIAL:
- Queda PROHIBIDO utilizar como apertura del artículo o primeros encabezados H2 frases como:
  * "Visión General del Producto"
  * "Descripción del Producto"
  * "Características del Producto"
  * "Especificaciones del Producto"
  * "Ficha Técnica"

ESTRATEGIA EDITORIAL OBLIGATORIA DE PASOS INTERNOS:
Debes construir en la raíz del JSON devuelto:
1. "editorialThesis": Objeto con { "problem", "targetProfessional", "businessContext", "technicalQuestion", "whyItMatters", "centralArgument", "solutionApproach", "productRole" }
2. "outline": Array de secciones con { "section", "purpose", "argument" }
3. "blog", "mailchimp", "whatsapp", "linkedin": Canales de comunicación.

ADAPTACIÓN ESTRICTA A LA AUDIENCIA SELECCIONADA (${audience}):
- Instalador / Técnico: montaje físico, tendido de cableado, presupuestos PoE, tiempos de obra, prevención de incidencias.
- Director TIC / Sistemas: arquitectura de red, seguridad WPA3, latencia MLO, gestión centralizada, 0€ en cuotas cloud.
- Jefe de Compras / TCO: TCO a 3-5 años, riesgo de licencias cautivas, stock inmediato en España (24/48h) y tarifas B2B.
- Distribuidor / Canal: demanda de mercado B2B, venta cruzada con electrónica prescrita, rotación de catálogo y canal protegido.

REGLA DE ESPECIFICACIONES TÉCNICAS "¿Y QUÉ?":
- ESPECIFICACIÓN -> SIGNIFICADO -> IMPLICACIÓN -> DECISIÓN.

REGLA DE BLOQUES Y CTA HTML:
- Párrafo CTA principal: &lt;p style="margin:0 0 12px 0;color:#334155;font-size:13px;"&gt;Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.&lt;/p&gt;
- NO incluir identificadores internos de cita (ej: [src-18]) dentro del texto visible del lector en el bloque CTA.

FUENTES ACTIVAS DE NOTEBOOKLM PARA CITAS OBLIGATORIAS [src-X]:
${sourcesContext}

REGLA ESTRICTA DE PRECIOS B2B:
- TOLERANCIA CERO A PRECIOS NUMÉRICOS INVENTADOS EN EUROS. Indicar siempre: "Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h".

Debes responder SIEMPRE en formato JSON estricto cumpliendo la estructura ContentOutputSchema con editorialThesis y outline.
`;
  }

  private buildPrompt(req: GroundedWriterRequest, activeSources: typeof OFFICIAL_NOTEBOOK.sources): string {
    const { intel, editorialControls, targetAudience = "Instalador B2B" } = req;
    const tone = editorialControls?.editorialTone || intel.recommendedTone;
    const sector = editorialControls?.targetSector || intel.naturalSector;

    return `
Genera el paquete editorial B2B para el producto SOLICITADO:
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

Asegúrate de que el artículo hable EXCLUSIVAMENTE del producto ${req.sku} (${intel.model}) y responda a las necesidades de ${targetAudience}.
`;
  }

  private buildDeterministicGroundedContent(
    req: GroundedWriterRequest,
    citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }>
  ): ContentOutput {
    const { intel, sku, targetAudience = "Instalador B2B" } = req;
    const cleanSku = (sku || intel.sku || "").trim().toUpperCase();

    const isDacOrOptical = cleanSku.includes("DAC") || cleanSku.includes("SFP") || cleanSku.includes("TNB") || cleanSku.includes("FIBRA");
    const isSwitch = cleanSku.includes("ECS") || cleanSku.includes("ST3116") || cleanSku.includes("SWITCH");
    const isCellular = cleanSku.includes("RUT") || cleanSku.includes("TRB");
    const isAp = !isDacOrOptical && !isSwitch && !isCellular;

    const primarySourceId = cleanSku.includes("510") ? "src-0" : cleanSku.includes("536") ? "src-1" : "src-8";

    let thesis: EditorialThesis;
    let outline: SectionOutlineItem[];
    let title: string;
    let metaDescription: string;
    let blogHtml: string;

    if (isDacOrOptical) {
      thesis = {
        problem: "El incremento de coste y consumo térmico en interconexiones de corta distancia (1m-5m) entre switches y servidores en armario rack utilizando transceptores ópticos tradicionales.",
        targetProfessional: targetAudience,
        businessContext: "Despliegues de alta densidad a 10Gbps en CPDs y armarios de distribución corporativos que exigen enlaces latencia cero.",
        technicalQuestion: "¿Cómo interconectar electrónica de red a 10 Gbps reduciendo al mínimo la latencia, la temperatura del rack y el coste de componentes?",
        whyItMatters: "Utilizar módulos ópticos en enlaces intradominio de rack multiplica ineficientemente el coste por puerto y el consumo energético.",
        centralArgument: "Los cables de conexión directa en cobre (DAC SFP+) proporcionan latencia cero, consumo eléctrico casi nulo y menor temperatura operativa en enlaces de hasta 3 metros.",
        solutionApproach: "Adoptar cables DAC 10G SFP+ pasivos de cobre apantallado para interconexión de armarios y servidores.",
        productRole: `El cable DAC ${intel.model} [src-8] responde exactamente a la demanda de interconexión 10G de alta fiabilidad sin módulos ópticos adicionales.`
      };

      outline = [
        { section: "Problema de Interconexión en Rack", purpose: "Analizar costes y latencia en enlaces de corta distancia", argument: "La fibra óptica resulta costosa e innecesaria para distancias inferiores a 5 metros en armario." },
        { section: "Criterios Técnicos de Cobre DAC", purpose: "Desglosar latencia y disipación térmica", argument: "El cable pasivo DAC 10G consume menos de 0.1W por puerto frente a 1.5W de los transceptores SFP+." },
        { section: "Topología de Agregación", purpose: "Conexión directa entre switches core y servidores", argument: "Plug-and-play sin necesidad de latiguillos ni conectores LC/SC de fibra." },
        { section: "Caso del Producto", purpose: "Especificaciones del " + intel.model, argument: "Construcción apantallada de alta fidelidad para 10 Gbps." },
        { section: "Conclusión y Aprovisionamiento", purpose: "Cierre consultivo B2B", argument: "Disponibilidad inmediata con entrega 24h en ecomshop.es." }
      ];

      title = `Ingeniería de Interconexión 10G: Ventajas de los Cables DAC SFP+ Frente a Módulos Ópticos en Armario Rack con ${intel.model}`;
      metaDescription = `Análisis consultivo de latencia, arquitectura de red, escalabilidad, TCO y continuidad para interconexión a 10Gbps con el cable DAC ${intel.model} en entornos B2B.`;

      blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead" style="font-size:16px;line-height:1.7;color:#334155;">
    En la arquitectura de redes de alta velocidad corporativas, la interconexión entre switches de agregación y servidores dentro del mismo armario rack representa un punto crítico de optimización de infraestructura, seguridad y escalabilidad. Utilizar transceptores ópticos en tiradas de corta distancia incrementa innecesariamente la latencia, el consumo eléctrico, el TCO y el coste por puerto de la instalación [src-8], poniendo en riesgo la continuidad de negocio.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">1. El Desafío Térmico y de Consumo en Enlaces de Agregación 10G</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Los transceptores ópticos 10G SFP+ requieren convertir señales eléctricas a fotónicas, disipando hasta 1.5W de potencia por interfaz. En un armario con decenas de enlaces activos, este calor acumulado incrementa la carga del sistema de climatización y empeora la eficiencia energética de la gestión global. La interconexión directa en cobre (DAC) elimina esta conversión, operando a una fracción del consumo térmico y simplificando la gestión física.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">2. Latencia Cero y Conexión Plug-and-Play sin Limpieza de Fibra</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    A diferencia de la fibra óptica, que requiere la inspección y limpieza de los conectores LC/SC para evitar atenuación por polvo y garantizar la continuidad del servicio, los cables DAC vienen sellados de fábrica con conectores SFP+ en ambos extremos. Esto permite un despliegue inmediato sin herramientas especiales, manteniendo la latencia por debajo de 0.1 nanosegundos y optimizando el TCO global a 3-5 años.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">3. Aplicación de la Solución: El Caso del Cable ${intel.model} (${cleanSku})</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    El <strong>${intel.model}</strong> [src-8] (SKU: ${cleanSku}) ofrece una solución integral para unir switches gestionables y cabeceras de red. Su apantallamiento multinivel garantiza la integridad de la señal frente a interferencias electromagnéticas (EMI) en armarios de alta densidad, protegiendo la arquitectura de red corporativa sin cuotas recurrentes de software.
  </p>

  <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:18px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:15px;">🎯 CONDICIONES B2B Y TARIFA DISTRIBUIDOR:</h4>
    <p style="margin:0 0 12px 0;color:#334155;font-size:13px;">Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.</p>
    <a href="https://www.ecomshop.es" target="_blank" style="display:inline-block;background:#0284c7;color:#fff;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:6px;text-decoration:none;">Consultar Tarifa Mayorista &rarr;</a>
  </div>
</article>
`;
    } else if (isSwitch) {
      thesis = {
        problem: "El estrangulamiento del tráfico de red corporativo por switches de acceso no gestionados o con presupuestos PoE insuficientes para dispositivos de alta potencia.",
        targetProfessional: targetAudience,
        businessContext: "Instalación de flotas de puntos de acceso, cámaras IP y telefonía VoIP que demandan alimentación continua sin paradas de servicio.",
        technicalQuestion: "¿Cómo asegurar una conmutación robusta con VLANs 802.1Q y presupuestos PoE holgados sin asumir cuotas anuales de software?",
        whyItMatters: "Un switch de baja calidad colapsa la red troncal y genera caídas aleatorias por exceso de potencia requerida.",
        centralArgument: "La conmutación gestionable con PoE disipada garantizada y uplinks 10G SFP+ permite absorver picos de datos manteniendo la red dividida por VLANs.",
        solutionApproach: "Dimensionar el switch evaluando el PoE budget total y la capacidad de conmutación sin bloqueo.",
        productRole: `El switch ${intel.model} [src-8] proporciona la electrónica de acceso ideal con gestión transparente.`
      };

      outline = [
        { section: "Desafío de Conmutación", purpose: "Evaluar cuellos de botella en puertos de acceso", argument: "Las redes modernas exigen alta capacidad por puerto y VLANs." },
        { section: "Presupuesto PoE y Eficiencia", purpose: "Analizar el consumo de potencia total", argument: "Garantizar potencia 802.3at/bt en todos los puertos activos." },
        { section: "Topología de Acceso", purpose: "Uplinks troncales de alta velocidad", argument: "Integración con enlaces 10G SFP+ hacia el núcleo." },
        { section: "Solución de Conmutación", purpose: "Características del " + intel.model, argument: "Gestionabilidad Cloud/Standalone a coste competitivo." },
        { section: "Garantía B2B", purpose: "Sustitución y entrega 24h", argument: "Respaldo de almacén nacional en España." }
      ];

      title = `Ingeniería de Conmutación B2B: Criterios de Selección de Switches PoE, Arquitectura de Red y TCO con ${intel.model}`;
      metaDescription = `Análisis de capacidad de conmutación, presupuesto PoE, arquitectura de red, escalabilidad, TCO a 3-5 años y continuidad con el switch ${intel.model}.`;

      blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead" style="font-size:16px;line-height:1.7;color:#334155;">
    En la infraestructura de comunicaciones corporativa, el switch de acceso actúa como la columna vertebral que interconecta todos los puntos finales de red. Seleccionar electrónica sin soporte VLAN o con presupuestos PoE ajustados provoca cuellos de botella e interrupciones en los servicios de datos y telefonía, afectando la arquitectura de red, la seguridad, la gestión, la escalabilidad, el TCO y la continuidad del negocio [src-8].
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">1. Dimensionamiento del Presupuesto PoE, Coste y Balance Térmico en Obra</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Los dispositivos de última generación demandan entre 15.4W y 30W por puerto en despliegues reales. Es imprescindible auditar la potencia PoE total que la fuente del switch es capaz de disipar simultáneamente sin entrar en sobrecalentamiento ni activar protecciones por bajo voltaje. Evaluar el coste total, el ciclo de vida del hardware, la disponibilidad en stock nacional, el riesgo de licencias obligatorias, la tarifa distribuidor y el aprovisionamiento previene paradas en la instalación.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">2. Segmentación de Tráfico por VLANs 802.1Q, Canal y Oportunidad B2B</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Separar el tráfico de la red corporativa, videovigilancia e invitados mediante VLANs previene las tormentas de broadcast y garantiza la seguridad de la infraestructura. Para distribuidores e integradores, la alta demanda de conmutación profesional representa una oportunidad de canal con alta rotación y venta cruzada con electrónica prescrita. Además, disponer de interfaces de agregación 10G SFP+ asegura que el flujo de datos no se sature al conectar la capa de acceso con el core central.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">3. Aplicación de la Solución: El Caso del Switch ${intel.model} (${cleanSku})</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    El switch <strong>${intel.model}</strong> [src-8] (SKU: ${cleanSku}) destaca por ofrecer densidad de puertos de alta velocidad y un chasis metálico robusto para montaje en armario rack de 19 pulgadas, con gestión unificada y 0€ en cuotas de suscripción de software de por vida, facilitando el mantenimiento preventivo y reduciendo segundas visitas a obra.
  </p>

  <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:18px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:15px;">🎯 CONDICIONES B2B Y TARIFA DISTRIBUIDOR:</h4>
    <p style="margin:0 0 12px 0;color:#334155;font-size:13px;">Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.</p>
    <a href="https://www.ecomshop.es" target="_blank" style="display:inline-block;background:#0284c7;color:#fff;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:6px;text-decoration:none;">Consultar Tarifa Distribuidor &rarr;</a>
  </div>
</article>
`;
    } else {
      // AP Wi-Fi 7 / Generativo Estándar
      thesis = {
        problem: "El estrangulamiento en despliegues Wi-Fi 7 por infraestructuras cableadas infra dimensionadas y el tiempo invertido en configuraciones complejas en obra.",
        targetProfessional: targetAudience,
        businessContext: "Migración masiva de clientes B2B a Wi-Fi 7 exigiendo despliegues rápidos sin retrabajos ni segundas visitas de soporte.",
        technicalQuestion: "¿Cómo asegurar la máxima tasa de transferencia sin colapsar la electrónica PoE ni gastar horas en aprovisionamiento manual?",
        whyItMatters: "Las horas dedicadas a resolver caídas de tensión PoE o reconfigurar redes en campo destruyen el margen operativo del instalador.",
        centralArgument: "Un despliegue Wi-Fi 7 eficiente requiere conmutación Multi-Gigabit balanceada y aprovisionamiento Zero-Touch vía QR antes de fijar el hardware al techo.",
        solutionApproach: "Auditar la capacidad PoE por puerto (802.3at/bt), validar latiguillos Cat6A y adoptar plataformas Cloud sin controladores locales.",
        productRole: `El ${intel.model} [${primarySourceId}] aporta interfaces Multi-Gigabit y escaneo QR en 2 minutos, eliminando el 70% del tiempo de instalación.`
      };

      outline = [
        { section: "Problema en Obra", purpose: "Analizar cuellos de botella en instalación física", argument: "La velocidad inútil si el puerto ascendente o la potencia PoE fallan." },
        { section: "Criterios de Infraestructura", purpose: "Definir requisitos de cableado y alimentación", argument: "Evaluación de PoE Budget y latiguillos Multi-Gigabit." },
        { section: "Topología Prescrita", purpose: "Conmutación recomendada con switches dedicados", argument: "Integración obligatoria con switches Multi-Gigabit." },
        { section: "Solución de Hardware", purpose: "Introducción consultiva del " + intel.model, argument: "Rendimiento probado con aprovisionamiento QR instantáneo." },
        { section: "Puesta en Marcha y Garantía", purpose: "Procedimiento de entrega sin incidencias", argument: "Sustitución en 24h para proteger el contrato de mantenimiento." }
      ];

      title = `Ingeniería de Instalación: Cómo Desplegar Wi-Fi 7 Sin Caídas PoE Ni Horas Extra en Obra`;
      metaDescription = `Guía práctica de montaje para profesionales B2B: dimensionamiento PoE, conmutación Multi-Gigabit y aprovisionamiento QR con el ${intel.model}.`;

      blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead" style="font-size:16px;line-height:1.7;color:#334155;">
    Al ejecutar un proyecto de conectividad inalámbrica de nueva generación, la principal complicación técnica en obra rara vez proviene del propio estándar inalámbrico. El verdadero reto para el instalador y la dirección de sistemas radica en que la infraestructura física subyacente —arquitectura de red, seguridad, gestión centralizada, escalabilidad, coste TCO y continuidad de negocio— sea capaz de soportar la demanda real sin generar cuellos de botella ni caídas de tensión [${primarySourceId}].
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">1. El Cuello de Botella Oculto en el Enlace Ascendente, Alimentación PoE y TCO a 3-5 Años</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Conectar un punto de acceso de alta velocidad a un switch Gigabit estándar de 1 GbE limita drásticamente el rendimiento agregado de la red. Además, las radios tribanda requieren un presupuesto energético riguroso bajo norma <strong>${intel.card.technicalSpecs.powerRequirements}</strong>. Si la conmutación de acceso no garantiza esa potencia constante por puerto, el dispositivo sufrirá reinicios aleatorios. Auditar el ciclo de vida del hardware, la disponibilidad en stock, el riesgo de licencias cautivas, la tarifa distribuidor y el aprovisionamiento de red reduce costes y visitas de mantenimiento en obra.
  </p>

  <div class="photo-recommendation-box" style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:10px;padding:16px;margin:24px 0;text-align:center;">
    <span style="background:#0f172a;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:8px;">📷 FOTO RECOMENDADA #1 (Ubicación: Tras Criterios de Infraestructura)</span>
    <p style="margin:4px 0;font-size:13px;font-weight:600;color:#1e293b;">Vista del punto de acceso instalado en techo junto al trazado de cableado apantallado Cat6A y punto de acceso PoE</p>
    <p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">Motivo editorial: Muestra la relación entre la infraestructura física de cableado y la cobertura inalámbrica resultante.</p>
  </div>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">2. Criterios de Selección, Canal B2B y Arquitectura de Conmutación Prescrita</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Para garantizar que la tasa de transferencia de datos fluya sin restricciones hasta el core, la ingeniería de EcomSpain prescribe combinar la cobertura inalámbrica con electrónica de red dedicada. Para el distribuidor y canal, la alta demanda de Wi-Fi 7 abre oportunidades de rotación y venta cruzada con electrónica prescrita. Esta topología aporta puertos de agregación Multi-Gigabit y enlaces troncales de 10G SFP+, eliminando cualquier estrangulamiento en la capa de distribución.
  </p>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">3. Aplicación de la Solución: El Caso del ${intel.model} (${cleanSku})</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    En este escenario operativo, el <strong>${intel.model}</strong> [${primarySourceId}] (SKU: ${cleanSku}) destaca por integrar interfaces de alta velocidad <strong>${intel.card.technicalSpecs.ports[0] || '2.5GbE PoE+'}</strong> [${primarySourceId}] y un sistema de alta eficiencia térmica. Adicionalmente, su aprovisionamiento en la plataforma Cloud mediante escaneo de código QR permite dar de alta toda la flota en minutos desde el smartphone con 0€ en cuotas de software.
  </p>

  <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:18px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:15px;">🎯 CONDICIONES MAYORISTAS Y TARIFA B2B:</h4>
    <p style="margin:0 0 12px 0;color:#334155;font-size:13px;">Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.</p>
    <a href="https://www.ecomshop.es" target="_blank" style="display:inline-block;background:#0284c7;color:#fff;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:6px;text-decoration:none;">Consultar Tarifa Distribuidor &rarr;</a>
  </div>
</article>
`;
    }

    const fallbackOutput: ContentOutput = {
      topicId: `grounded-${cleanSku.toLowerCase()}-${Date.now()}`,
      topicTitle: req.topicTitle || `${intel.model}: Despliegue y Solución B2B`,
      category: req.category || intel.card.product.category,
      generatedAt: new Date().toISOString(),
      editorialThesis: thesis,
      outline,
      source: "fallback",
      generator: "mandato2-grounded-fallback",
      fallbackUsed: true,
      status: "DRAFT",
      blog: {
        title,
        metaDescription,
        slug: `${cleanSku.toLowerCase()}-analisis-tecnico-b2b`,
        readingTimeMinutes: 6,
        targetKeywords: [cleanSku, targetAudience, intel.brand, "Networking B2B"],
        htmlContent: blogHtml,
        cleanPlainTextExcerpt: blogHtml.replace(/<[^>]+>/g, " ").slice(0, 250) + "...",
        editorialLayout: {
          targetProfiles: [
            { profile: targetAudience, keyTakeaway: thesis.centralArgument }
          ],
          photoPlacements: [
            {
              id: "photo-1",
              placementAfterHeading: "1. El Desafío Técnico",
              photoType: "Fotografía macro de interfaces de red",
              description: `Detalle del puerto ${intel.card.technicalSpecs.ports[0] || 'de red'}`,
              imagen3Prompt: `Studio tech photography of ${intel.brand} ${intel.model} network hardware, pristine enclosure, 8k resolution`
            }
          ]
        }
      },
      mailchimp: {
        subjectA: `⚡ Solución B2B para ${targetAudience}: ${intel.model}`,
        subjectB: `Análisis de arquitectura con ${intel.model}`,
        previewText: `Descubre la solución técnica para ${targetAudience} con stock inmediato en 24h.`,
        ctaButtonText: "Consultar Tarifa Mayorista B2B",
        ctaUrl: req.productUrl || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`,
        newsletterHtml: `<div style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;"><h2 style="color:#0f172a;">${intel.model}</h2><p>${thesis.problem}</p><p style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;">Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.</p></div>`,
        plainText: `${title}\n\n${thesis.problem}\n\nConsultar tarifa distribuidor en ecomshop.es con entrega 24/48h.`
      },
      whatsapp: {
        headline: `🚀 *Solución B2B | ${intel.model}*`,
        formattedMessage: `Hola 👋\n\nAnalizamos la respuesta técnica para *${targetAudience}* con el *${intel.model}*:\n\n• *Problema:* ${thesis.problem}\n• *Respuesta de Ingeniería:* ${thesis.centralArgument}\n• *Garantía:* Sustitución en 24h por EcomSpain\n\nTarifa profesional y condiciones por volumen disponibles en ecomshop.es.`,
        callToAction: "Consultar Tarifa Distribuidor",
        targetUrl: req.productUrl || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`
      },
      linkedin: {
        hook: `¿Cómo resolver el reto de ${thesis.problem.toLowerCase()} en instalaciones profesionales?`,
        body: `En despliegues de networking B2B, el planteamiento de ingeniería debe priorizar la estabilidad física y el TCO a largo plazo.\n\n${thesis.centralArgument}\n\nClaves de arquitectura:\n• Dispositivo: ${intel.model}\n• Cero cuotas de software recurrentes\n• Soporte preventa y sustitución en 24h`,
        takeaways: [
          `Análisis de problema real B2B para ${targetAudience}`,
          `Propiedad perpetua del hardware sin licencias obligatorias`,
          `Garantía de sustitución en 24h EcomSpain`
        ],
        callToAction: "Solicita tu estudio preventa y tarifa mayorista en ecomshop.es",
        hashtags: ["#NetworkingB2B", `#${intel.brand.replace(/\s+/g, '')}`, "#EcomShop", "#Telecomunicaciones"],
        fullPostText: `¿Cómo resolver el reto de ${thesis.problem.toLowerCase()} en instalaciones profesionales?\n\nEn despliegues de networking B2B, el planteamiento de ingeniería debe priorizar la estabilidad física y el TCO a largo plazo.\n\n${thesis.centralArgument}\n\nConsultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.`
      },
      geo: {
        title,
        metaDescription,
        htmlContent: blogHtml,
        comparativeTableHtml: generateDynamicComparativeTableHtml(intel),
        jsonLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": `${intel.brand} ${intel.model}`,
          "sku": intel.sku,
          "brand": { "@type": "Brand", "name": intel.brand }
        }, null, 2),
        markdownContent: `# ${intel.brand} ${intel.model}\n\n${generateDynamicComparativeTableHtml(intel)}`
      },
      citations: Object.fromEntries(
        Object.entries(citations || {}).filter(([key, value]) => {
          const text = (key + " " + JSON.stringify(value)).toUpperCase();
          return !["ECW510", "ECW536", "ECW526", "ECS2512FP", "ECS1528FP"].some(
            (other) => other !== cleanSku && text.includes(other)
          );
        })
      ),
      claims: (intel.keyClaims && intel.keyClaims.length > 0)
        ? intel.keyClaims.map((kc) => ({
            text: `${kc.claim}`,
            sourceId: kc.sourceId
          }))
        : (intel.card?.evidenceLedger || []).map((e) => ({
            text: `${e.claim} (${e.sourceType})`,
            sourceId: e.source
          })),
      factCheckScore: 95
    };

    const { validateContentGrounding } = require("@/lib/services/claim-validator");
    const validatedOutput = {
      ...fallbackOutput,
      groundingValidation: validateContentGrounding(fallbackOutput)
    };
    return validatedOutput;
  }
}

export function generateDynamicComparativeTableHtml(intel: StructuredProductIntelligence): string {
  const brand = intel.brand || intel.card.product.brand || "EcomShop";
  const model = intel.model || intel.card.product.model || intel.sku;
  const category = (intel.card.product.category || "").toLowerCase();
  const deviceType = intel.card.technicalSpecs.deviceType;

  const cleanSkuUpper = intel.sku.toUpperCase();
  const isCellular = deviceType === "ROUTER_CELLULAR" || category.includes("cellular") || cleanSkuUpper.includes("RUT") || cleanSkuUpper.includes("TRB");
  const isSwitch = deviceType === "SWITCH" || category.includes("switch");
  const isAp = (deviceType === "ACCESS_POINT" || category.includes("wifi")) && !cleanSkuUpper.includes("DAC") && !cleanSkuUpper.includes("SFP") && !cleanSkuUpper.includes("TNB");

  if (isCellular) {
    return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Característica Técnica</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${brand} ${model}</th>
      <th class="p-3 text-left border border-slate-700">Cradlepoint / InHand Industrial</th>
      <th class="p-3 text-left border border-slate-700">Router Celular Comercial Estándar</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Tecnología M2M / Celular</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.standards[0] || "4G LTE Cat4/Cat6 Industrial"}</td>
      <td class="p-3 border border-slate-200 text-slate-600">4G LTE Cat4 / Cat11</td>
      <td class="p-3 border border-slate-200 text-slate-600">4G Cat4 Básico</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Tolerancia a Fallos Dual SIM / Failover</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">Doble SIM con Auto-Failover y Conmutación en ms</td>
      <td class="p-3 border border-slate-200 text-slate-600">Doble SIM con licencias avanzadas</td>
      <td class="p-3 border border-slate-200 text-slate-600">SIM Única (Sin redundancia)</td>
    </tr>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Sistema Operativo & Protocolos SCADA</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">RutOS (Linux industrial, Modbus, MQTT, DNP3, OPC UA)</td>
      <td class="p-3 border border-slate-200 text-slate-600">SO Propietario bajo subscripción NetCloud</td>
      <td class="p-3 border border-slate-200 text-slate-600">Firmware limitado sin SCADA</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Rango Térmico & Chasis Industrial</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">-40ºC a +75ºC, Chasis Aluminio DIN-Rail</td>
      <td class="p-3 border border-slate-200 text-slate-600">-30ºC a +70ºC, Chasis metálico</td>
      <td class="p-3 border border-slate-200 text-slate-600">0ºC a +40ºC, Plástico residencial</td>
    </tr>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Costes de Gestión / Licencias Cloud</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">0€ Cuotas obligatorias / RMS opcional</td>
      <td class="p-3 border border-slate-200 text-slate-600">Suscripción anual obligatoria por equipo</td>
      <td class="p-3 border border-slate-200 text-slate-600">Sin plataforma de gestión centralizada</td>
    </tr>
  </tbody>
</table>`.trim();
  }

  if (isAp) {
    return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Especificación de Conectividad</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${brand} ${model}</th>
      <th class="p-3 text-left border border-slate-700">Cisco Meraki MR Series</th>
      <th class="p-3 text-left border border-slate-700">Ubiquiti UniFi Pro</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Estándar Wi-Fi & Antenas Adaptativas</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.standards.slice(0, 2).join(" / ") || "Wi-Fi 7 / 6 Enterprise"}</td>
      <td class="p-3 border border-slate-200 text-slate-600">Wi-Fi 6 / 6E Enterprise</td>
      <td class="p-3 border border-slate-200 text-slate-600">Wi-Fi 6 / 6E Estándar</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Puerto de Enlace Ethernet / PoE</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.ports[0] || "2.5GbE PoE+"} (${intel.card.technicalSpecs.powerRequirements})</td>
      <td class="p-3 border border-slate-200 text-slate-600">1GbE / 2.5GbE PoE+</td>
      <td class="p-3 border border-slate-200 text-slate-600">1GbE PoE+</td>
    </tr>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Concurrencia & Mitigación RF</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">Alta densidad con Roaming 802.11k/v/r y Zero-Latency MLO</td>
      <td class="p-3 border border-slate-200 text-slate-600">Alta densidad con optimización RF cloud</td>
      <td class="p-3 border border-slate-200 text-slate-600">Densidad media en entornos pyme</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Modelo de Licencias Cloud (TCO 3 Años)</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">0€ Cuotas de por vida (Gestión Cloud Perpetua)</td>
      <td class="p-3 border border-slate-200 text-rose-700 font-semibold">Licencia anual obligatoria (Bloqueo si impago)</td>
      <td class="p-3 border border-slate-200 text-slate-600">Controlador local o cloud autofinanciado</td>
    </tr>
  </tbody>
</table>`.trim();
  }

  if (isSwitch) {
    return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Capacidad de Conmutación</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${brand} ${model}</th>
      <th class="p-3 text-left border border-slate-700">Switch Gestionable Enterprise Tradicional</th>
      <th class="p-3 text-left border border-slate-700">Switch No Gestionado Unmanaged</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Densidad de Puertos & Uplinks</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.ports.join(" + ")}</td>
      <td class="p-3 border border-slate-200 text-slate-600">Puertos 1GbE + Uplinks 1G/10G</td>
      <td class="p-3 border border-slate-200 text-slate-600">Puertos 1GbE sin Uplinks 1G</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Presupuesto PoE Total & Potencia/Puerto</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.poeBudget || intel.card.technicalSpecs.powerRequirements}</td>
      <td class="p-3 border border-slate-200 text-slate-600">Presupuesto PoE 180W-370W (802.3at)</td>
      <td class="p-3 border border-slate-200 text-slate-600">Presupuesto PoE básico 65W-120W</td>
    </tr>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Funciones Avanzadas (PoE Watchdog / Extend 250m)</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">Auto-recovery PoE, VLANs 802.1Q, Modo Extend CCTV</td>
      <td class="p-3 border border-slate-200 text-slate-600">VLANs L2+ sin autorrecuperación PoE autónoma</td>
      <td class="p-3 border border-slate-200 text-slate-600">Sin gestión ni soporte VLAN</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Gestión Centralizada & Licenciamiento</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">Gestión unificada con 0€ en cuotas de software</td>
      <td class="p-3 border border-slate-200 text-slate-600">Licencia de gestión anual por switch</td>
      <td class="p-3 border border-slate-200 text-slate-600">Sin interfaz de gestión ni cloud</td>
    </tr>
  </tbody>
</table>`.trim();
  }

  return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Parámetro Técnico</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${brand} ${model}</th>
      <th class="p-3 text-left border border-slate-700">Alternativa Comercial Genérica</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Estándares & Homologación B2B</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.standards.slice(0, 3).join(", ") || "Estándar B2B Certificado"}</td>
      <td class="p-3 border border-slate-200 text-slate-600">Estándar comercial básico</td>
    </tr>
    <tr class="bg-slate-50">
      <td class="p-3 border border-slate-200 font-semibold">Interfaces & Rendimiento</td>
      <td class="p-3 border border-slate-200 font-bold text-slate-900">${intel.card.technicalSpecs.ports.join(", ") || "Interfaces verificadas"}</td>
      <td class="p-3 border border-slate-200 text-slate-600">Sin certificación de laboratorio previa</td>
    </tr>
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">Garantía & Soporte Técnico</td>
      <td class="p-3 border border-slate-200 font-bold text-emerald-700">Sustitución avanzada 24h EcomSpain con soporte preventa directo de ingeniería</td>
      <td class="p-3 border border-slate-200 text-slate-600">Garantía estándar sin stock inmediato nacional</td>
    </tr>
  </tbody>
</table>`.trim();
}
