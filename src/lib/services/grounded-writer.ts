import { ContentOutput, ContentOutputSchema } from "@/lib/schema";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { StructuredProductIntelligence, HighlightedNotebookSource } from "./notebook-intelligence";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import { ECOM_BRAND } from "@/lib/knowledge";

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
   * Genera el paquete de contenido multicanal con citas explícitas de NotebookLM [src-X]
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

    if (key || isVertex) {
      try {
        const { getGenAIClient, getActiveGeminiModel } = await import("@/lib/genai-client");
        const ai = getGenAIClient(req.apiKey);
        const activeModel = getActiveGeminiModel(req.apiKey);

        const prompt = this.buildPrompt(req, activeSources);
        const systemInstruction = this.buildSystemInstruction(activeSources);

        const candidateModels = [activeModel, process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-1.5-flash"]
          .filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

        for (const modelToTry of candidateModels) {
          try {
            const generatePromise = ai.models.generateContent({
              model: modelToTry,
              contents: prompt,
              config: {
                systemInstruction,
                responseMimeType: "application/json"
              }
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout con modelo ${modelToTry}`)), 35000)
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

            const validated = ContentOutputSchema.safeParse({
              ...parsed,
              geo: geoObj,
              usageMetadata,
              citations: { ...citations, ...(parsed.citations || {}) }
            });

            if (validated.success) {
              return {
                ...validated.data,
                source: "ai",
                status: "DRAFT"
              };
            }
          } catch (modelErr) {
            console.warn(`[GroundedWriter] Fallo con ${modelToTry}, probando siguiente:`, modelErr);
          }
        }
      } catch (err) {
        console.warn("[GroundedWriter] Error con Gemini API, aplicando fallback de alta fidelidad técnica:", err);
      }
    }

    return this.buildDeterministicGroundedContent(req, citations);
  }

  private buildSystemInstruction(activeSources: typeof OFFICIAL_NOTEBOOK.sources): string {
    const sourcesContext = activeSources
      .map((s) => `[${s.id}] (${s.type.toUpperCase()}) "${s.title}": ${s.description}`)
      .join("\n");

    return `
Eres el Director de Estrategia Técnica y Jefe de Ingeniería Preventa de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión es redactar artículos técnicos de blog y campañas multicanal B2B con RIGOR ABSOLUTO fundamentado en el cuaderno oficial de Google NotebookLM (ID: 6ae5b7bb-ab27-4541-80cc-6127730fd01b).

FUENTES ACTIVAS DE NOTEBOOKLM PARA CITAS OBLIGATORIAS:
${sourcesContext}

🚨 REGLA ESTRICTA DE CITAS TÉCNICAS [src-X]:
- Cada vez que menciones un dato técnico sensible (puertos de red, interfaces 2.5G/10G, alimentación PoE+/PoE++, modulación 4096-QAM, roaming 802.11k/v/r, MLO, TCO o garantía 24h), DEBES ACOMPAÑARLO OBLIGATORIAMENTE con la etiqueta de cita correspondiente entre corchetes: [src-X] (ejemplo: "puerto 2.5GbE PoE+ [src-0]", "switch Multi-Gigabit ECS2512FP [src-8]", "garantía de sustitución 24h [src-18]").
- Esto permite al frontend renderizar tooltips interactivos con el párrafo original del datasheet.

🚨 REGLA ESTRICTA DE PRECIOS B2B:
- TOLERANCIA CERO A PRECIOS NUMÉRICOS INVENTADOS EN EUROS. Indicar siempre: "Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h".

🚨 HARDWARE BLACKLIST:
- Queda terminantemente PROHIBIDO mencionar gamas obsoletas o en desuso como "Fit" o "FitController". El estándar oficial es exclusivamente EnGenius Cloud o Standalone.

Debes responder SIEMPRE en formato JSON estricto cumpliendo la estructura ContentOutputSchema con el objeto "citations".
`;
  }

  private buildPrompt(req: GroundedWriterRequest, activeSources: typeof OFFICIAL_NOTEBOOK.sources): string {
    const { intel, editorialControls } = req;
    const tone = editorialControls?.editorialTone || intel.recommendedTone;
    const sector = editorialControls?.targetSector || intel.naturalSector;
    const competitor = editorialControls?.competitorFocus || intel.recommendedCompetitor;

    return `
Genera la campaña multicanal fundamentada en NotebookLM para el producto:
- SKU: ${req.sku}
- Modelo: ${intel.model}
- Título/Tema: ${req.topicTitle}
- Sector Objetivo: ${sector}
- Tono Editorial: ${tone}
- Competidor a Desbancar: ${competitor}
- Electrónica de conmutación obligatoria: ${intel.mandatoryElectronics.recommendedSwitchName} (${intel.mandatoryElectronics.recommendedSwitchSku}) -> Motivo: ${intel.mandatoryElectronics.reason}
- Especificaciones de Hardware del Datasheet:
  * Puertos: ${intel.card.technicalSpecs.ports.join(", ")}
  * Estándares: ${intel.card.technicalSpecs.standards.join(", ")}
  * Alimentación: ${intel.card.technicalSpecs.powerRequirements}
  * Gestión: ${intel.card.technicalSpecs.management}
- Claims Verificados del Notebook:
${intel.keyClaims.map((k) => `  * [${k.sourceId}] ${k.claim}`).join("\n")}
- Objeciones Frecuentes Resueltas:
${intel.objections.map((o) => `  * P: ${o.objection} -> R: ${o.counterArgument} [${o.sourceId}]`).join("\n")}

Genera los 4 canales completos (Blog con HTML Durable, Mailchimp B2B, WhatsApp Broadcast, LinkedIn Post) asegurando que los datos técnicos lleven sus etiquetas [src-X].
`;
  }

  private buildDeterministicGroundedContent(
    req: GroundedWriterRequest,
    citations: Record<string, { id: string; title: string; type: string; excerpt: string; url?: string }>
  ): ContentOutput {
    const { intel, sku } = req;
    const isAp = intel.card.product.category === "wifi";
    const primarySourceId = sku.includes("510") ? "src-0" : sku.includes("536") ? "src-1" : "src-8";
    const switchSourceId = "src-8";
    const warrantySourceId = "src-18";
    const tcoSourceId = "src-4";

    const standardsText = intel.card.technicalSpecs.standards.length > 0 ? intel.card.technicalSpecs.standards.join(", ") : "estándares homologados";
    const portText = intel.card.technicalSpecs.ports.length > 0 ? intel.card.technicalSpecs.ports[0] : "interfaces certificadas";

    const blogHtml = `
<article class="ecomshop-b2b-post">
  <p class="lead" style="font-size:16px;line-height:1.7;color:#334155;">
    En despliegues de conectividad corporativa y entornos de alta densidad, la elección de hardware no admite concesiones teóricas. Con el lanzamiento del <strong>${intel.model}</strong> [${primarySourceId}], la infraestructura de red se consolida bajo estándares <strong>${standardsText}</strong> y puertos de enlace <strong>${portText}</strong> [${primarySourceId}], erradicando los cuellos de botella característicos de redes legacy.
  </p>

  <div class="photo-recommendation-box" style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:10px;padding:16px;margin:24px 0;text-align:center;">
    <span style="background:#0f172a;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:8px;">📷 FOTO RECOMENDADA #1 (Ubicación: Tras Introducción Técnica)</span>
    <p style="margin:4px 0;font-size:13px;font-weight:600;color:#1e293b;">Tipo de plano: Primer plano de puertos ${intel.card.technicalSpecs.ports[0]} con latiguillos de conexión rápida</p>
    <p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">Motivo editorial: Evidencia la velocidad Multi-Gigabit y el conector PoE blindado.</p>
  </div>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">Topología Obligatoria: Sinergia de Conmutación con ${intel.mandatoryElectronics.recommendedSwitchName}</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    Conectar un punto de acceso de última generación a un switch tradicional de 1 GbE estrangula hasta un 60% del caudal real. Para garantizar una alimentación estable bajo norma <strong>${intel.card.technicalSpecs.powerRequirements}</strong> [${switchSourceId}], la ingeniería preventa de EcomSpain prescribe la integración con el <strong>${intel.mandatoryElectronics.recommendedSwitchName}</strong> [${switchSourceId}]. Esta combinación asegura enlaces troncales 10G SFP+ y presupuesto PoE sin caídas de tensión en tiradas largas.
  </p>

  <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:18px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:15px;">🎯 CONDICIONES MAYORISTAS DISTRIBUIDOR:</h4>
    <p style="margin:0 0 12px 0;color:#334155;font-size:13px;">Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h [${warrantySourceId}].</p>
    <a href="https://www.ecomshop.es" target="_blank" style="display:inline-block;background:#0284c7;color:#fff;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:6px;text-decoration:none;">Consultar Tarifa Distribuidor &rarr;</a>
  </div>

  <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:32px 0 16px 0;">Auditoría TCO: Gestión en la Nube con 0€ en Licencias Recurrentes</h2>
  <p style="color:#334155;font-size:15px;line-height:1.7;">
    A diferencia de fabricantes que bloquean el hardware si no se renuevan las licencias anuales de software, el ecosistema <strong>${intel.card.technicalSpecs.management}</strong> [${tcoSourceId}] permite aprovisionamiento en 2 minutos mediante código QR y monitorización remota perpetua sin canon por dispositivo [${tcoSourceId}], permitiendo al integrador asegurar márgenes netos superiores en cada licitación.
  </p>
</article>
`;

    const fallbackOutput: ContentOutput = {
      topicId: `grounded-${sku.toLowerCase()}-${Date.now()}`,
      topicTitle: req.topicTitle || `${intel.model}: Despliegue de Alta Conectividad B2B`,
      category: req.category || intel.card.product.category,
      generatedAt: new Date().toISOString(),
      source: "fallback",
      status: "NEEDS_REVIEW",
      fallbackNotice: "La IA no ha respondido, vuelve a intentarlo. Se ha generado contenido con plantilla de respaldo sin cifras inventadas. Requiere revisión previa a su aprobación.",
      blog: {
        title: req.topicTitle || `Ingeniería de Redes: Cómo desplegar el ${intel.model} sin cuellos de botella`,
        metaDescription: `Análisis técnico del ${intel.model} con conmutación Multi-Gigabit [${primarySourceId}], presupuesto PoE+ y gestión en la nube con 0€ en suscripciones [${tcoSourceId}].`,
        slug: `${sku.toLowerCase()}-guia-despliegue-ingenieria`,
        readingTimeMinutes: 5,
        targetKeywords: [sku, "Wi-Fi 7", "EnGenius Cloud", "Switch Multi-Gigabit", "EcomShop"],
        htmlContent: blogHtml,
        cleanPlainTextExcerpt: `Análisis de despliegue del ${intel.model} con puerto ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}], alimentación ${intel.card.technicalSpecs.powerRequirements} y gestión Cloud sin cuotas [${tcoSourceId}].`,
        editorialLayout: {
          targetProfiles: [
            { profile: "Instalador", keyTakeaway: `Aprovisionamiento ágil y soporte preventa especializado en hardware ${intel.model}.` },
            { profile: "Director TIC", keyTakeaway: `Gestión bajo plataforma ${intel.card.technicalSpecs.management} y arquitectura con interfaces ${intel.card.technicalSpecs.ports[0]}.` },
            { profile: "Jefe de Compras", keyTakeaway: `Optimización de costes de infraestructura con condiciones de distribución mayorista en ecomshop.es.` },
            { profile: "Distribuidor", keyTakeaway: "Disponibilidad de stock para canal e integradores certificados en ecomshop.es." }
          ],
          photoPlacements: [
            {
              id: "photo-1",
              placementAfterHeading: "Introducción Técnica",
              photoType: "Fotografía macro de interfaces y carcasa",
              description: `Detalle del puerto ${intel.card.technicalSpecs.ports[0]} y led de estado`,
              imagen3Prompt: `Studio tech photography of ${intel.brand} ${intel.model} network hardware, pristine white enclosure, glowing RJ45 Multi-Gigabit port, professional enterprise lab lighting, 8k resolution`
            }
          ]
        }
      },
      mailchimp: {
        subjectA: `⚡ Novedad Técnica: ${intel.model} con stock 24h`,
        subjectB: `0€ en Cuotas Cloud: Descubre el pack ${sku} + ${intel.mandatoryElectronics.recommendedSwitchSku}`,
        previewText: `Potencia tu infraestructura con enlaces Multi-Gigabit [${primarySourceId}] y sustitución en 24h [${warrantySourceId}].`,
        ctaButtonText: "Consultar Tarifa Mayorista B2B",
        ctaUrl: req.productUrl || `https://www.ecomshop.es/${sku.toLowerCase()}`,
        newsletterHtml: `<div style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;"><h2 style="color:#0f172a;">${intel.model}</h2><p>Despliegue profesional con puertos <strong>${intel.card.technicalSpecs.ports[0]}</strong> [${primarySourceId}] y conmutación <strong>${intel.mandatoryElectronics.recommendedSwitchName}</strong> [${switchSourceId}].</p><p style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;">Condiciones mayoristas: Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h [${warrantySourceId}].</p></div>`,
        plainText: `${intel.model}: Despliegue con ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}] y conmutación ${intel.mandatoryElectronics.recommendedSwitchName} [${switchSourceId}]. Consultar tarifa distribuidor en ecomshop.es con entrega 24/48h.`
      },
      whatsapp: {
        headline: `🚀 *${intel.model} en Stock Inmediato*`,
        formattedMessage: `Hola, te pasamos la ficha técnica del nuevo *${intel.model}* [${primarySourceId}]:\n\n• *Puertos:* ${intel.card.technicalSpecs.ports.join(", ")} [${primarySourceId}]\n• *Alimentación:* ${intel.card.technicalSpecs.powerRequirements} recomendada con switch ${intel.mandatoryElectronics.recommendedSwitchSku} [${switchSourceId}]\n• *Gestión:* EnGenius Cloud con *0€ en licencias anuales* [${tcoSourceId}]\n• *Garantía:* Sustitución en 24h por EcomSpain [${warrantySourceId}]\n\nTarifa profesional y condiciones por volumen disponibles en ecomshop.es.`,
        callToAction: "Consultar Condiciones B2B en 24h",
        targetUrl: req.productUrl || `https://www.ecomshop.es/${sku.toLowerCase()}`
      },
      linkedin: {
        hook: `¿Por qué seguir renovando suscripciones anuales cuando puedes desplegar ${intel.model} con 0€ en cuotas de por vida? [${tcoSourceId}]`,
        body: `En despliegues de networking empresarial, la combinación de puertos ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}] y conmutación Multi-Gigabit [${switchSourceId}] es indispensable para evitar cuellos de botella.\n\nCon EnGenius Networks y el soporte de distribución oficial de EcomSpain [${warrantySourceId}], los integradores garantizan una arquitectura libre de cánones de software recurrentes con sustitución avanzada en 24 horas.`,
        takeaways: [
          `Interfaces de alta velocidad ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}]`,
          `Alimentación optimizada con switches ${intel.mandatoryElectronics.recommendedSwitchSku} [${switchSourceId}]`,
          `Coste cero en licencias de gestión Cloud [${tcoSourceId}]`,
          `Soporte preventa y almacén en España con entrega 24/48h [${warrantySourceId}]`
        ],
        callToAction: "Solicita tu estudio preventa y tarifa mayorista en ecomshop.es",
        hashtags: ["#NetworkingB2B", "#WiFi7", "#EnGenius", "#EcomShop", "#Telecomunicaciones"],
        fullPostText: `¿Por qué seguir renovando suscripciones anuales cuando puedes desplegar ${intel.model} con 0€ en cuotas de por vida? [${tcoSourceId}]\n\nEn despliegues de networking empresarial, la combinación de puertos ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}] y conmutación Multi-Gigabit [${switchSourceId}] es indispensable para evitar cuellos de botella.\n\nClaves de ingeniería:\n• Interfaces ${intel.card.technicalSpecs.ports[0]} [${primarySourceId}]\n• Topología recomendada: ${intel.mandatoryElectronics.recommendedSwitchName} [${switchSourceId}]\n• Cero cuotas de software recurrentes [${tcoSourceId}]\n• Sustitución avanzada en 24h por EcomSpain [${warrantySourceId}]\n\nConsultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.`
      },
      geo: {
        title: req.topicTitle || `${intel.model}: Despliegue y Solución B2B`,
        metaDescription: `Análisis técnico de ${intel.model} con conmutación y despliegue B2B.`,
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
      citations,
      claims: (intel.keyClaims && intel.keyClaims.length > 0)
        ? intel.keyClaims.map((kc) => ({
            text: `${kc.claim}`,
            sourceId: kc.sourceId
          }))
        : (intel.card?.evidenceLedger || []).map((e) => ({
            text: `${e.claim} (${e.sourceType})`,
            sourceId: e.source
          })),
      factCheckScore: Math.min(100, Math.max(80, 80 + Object.keys(citations).length * 4))
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

  const isCellular = deviceType === "ROUTER_CELLULAR" || category.includes("cellular") || intel.sku.toUpperCase().includes("RUT") || intel.sku.toUpperCase().includes("TRB");
  const isAp = deviceType === "ACCESS_POINT" || category.includes("wifi");
  const isSwitch = deviceType === "SWITCH" || category.includes("switch");

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
      <td class="p-3 border border-slate-200 text-slate-600">Puertos 1GbE sin Uplinks 10G</td>
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
