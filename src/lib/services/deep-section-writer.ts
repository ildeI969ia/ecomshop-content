import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import {
  ArticleOutline,
  ArticleOutlineSection
} from "@/lib/types/article-outline";
import { injectInternalLinks } from "./internal-linking-engine";

export interface WrittenSectionResult {
  sectionId: string;
  title: string;
  level: "H2" | "H3";
  contentType?: string;
  htmlContent: string;
  wordCount: number;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface FullArticleResult {
  title: string;
  slug: string;
  metaDescription: string;
  targetAudience: string;
  sections: WrittenSectionResult[];
  combinedHtml: string;
  totalWords: number;
  internalLinksCount: number;
}

/**
 * Redactor Especializado Sección por Sección (Deep Section Writer - Junia Engine)
 * Redacta cada sección manteniendo memoria contextual de las secciones anteriores
 * para evitar redundancias, inyectar callouts de obra, tablas técnicas y enlaces a EcomShop.
 */
export async function writeArticleSection(
  section: ArticleOutlineSection,
  outline: ArticleOutline,
  previousSectionsSummary = "",
  apiKeyOverride?: string
): Promise<WrittenSectionResult> {
  const client = getGenAIClient(apiKeyOverride);
  const model = getActiveGeminiModel(apiKeyOverride);

  const prompt = `
Eres un Ingeniero Senior de Telecomunicaciones de Campo y Especialista de Preventa en EcomShop (EcomSpain).
Tu tarea es redactar EXCLUSIVAMENTE la siguiente sección para un artículo técnico de profundidad sobre: "${outline.title}".

DATOS DE LA SECCIÓN A REDACTAR:
- Nivel: ${section.level}
- Título: "${section.title}"
- Tipo de Contenido: ${section.contentType}
- Palabras Clave Obligatorias: ${section.focusKeywords.join(", ") || "networking profesional, telecomunicaciones"}
- Conclusión Clave (Key Takeaway): "${section.keyTakeaway}"
- Enlace / Producto Sugerido: ${section.suggestedProductLink || "Ninguno"}

CONTEXTO ACUMULADO PREVIO (Para evitar repetir explicaciones ya dadas):
${previousSectionsSummary ? `Resumen de secciones ya redactadas:\n${previousSectionsSummary}` : "Esta es la primera sección del artículo."}

DIRECTRICES DE FORMATO Y ESTILO SEGÚN EL TIPO DE CONTENIDO:
1. SI ES 'TEXT':
   - Redacta de 3 a 5 párrafos técnicos extensos, detallados y fundamentados con especificaciones exactas (estándares IEEE 802.11be, 802.3bt, modulación 4096-QAM, atenuación, latencia, etc.).
   - Utiliza subtítulos semánticos, negritas técnicas y listas ordenadas si procede.
   - Si se mencionó un producto sugerido (${section.suggestedProductLink || ""}), analízalo con rigor de laboratorio.

2. SI ES 'COMPARISON_TABLE':
   - Incluye una tabla HTML semántica y profesional con cabeceras <table class="tech-comparison-table" style="width:100%; border-collapse:collapse; margin:20px 0; border:1px solid #cbd5e1;">...</table>.
   - Compara al menos 3 modelos (ej: ECW536 vs ECW526 vs Alternativa de mercado, o ECS2512FP vs ECS1528FP).
   - Analiza parámetros como: Rendimiento Máximo, Puertos Uplink, Presupuesto PoE / Consumo, Modo de Gestión y TCO / Licencias.

3. SI ES 'INSTALLER_CALLOUT':
   - Genera una caja destacada con el formato HTML:
     <div class="installer-callout-box" style="background:#fffbeb; border-left:5px solid #d97706; padding:18px; margin:24px 0; border-radius:6px;">
       <h4 style="color:#b45309; margin:0 0 8px 0; font-size:16px;">⚠️ TIP DEL INSTALADOR (Advertencia de Obra):</h4>
       <p style="margin:0; color:#451a03; font-size:14px; line-height:1.5;">[Explicación de un error común en obra, cálculo de caída de tensión PoE, saturación de canal DFS o mala conectorización y cómo prevenirlo]</p>
     </div>

4. SI ES 'TOPOLOGY_DIAGRAM':
   - Explica la arquitectura de red y provee un diagrama claro en bloque <pre class="topology-diagram" style="background:#0f172a; color:#38bdf8; padding:16px; border-radius:8px; font-family:monospace; overflow-x:auto;">...</pre> representando Capa Core / Distribución / Acceso con detalles de puertos (ej: 10G SFP+, 2.5GbE PoE++).

5. SI ES 'FAQ':
   - Incluye de 3 a 4 preguntas técnicas y respuestas directas sin rodeos con formato <h3> o <strong>.

REGLA ABSOLUTA DE HARDWARE DESCATALOGADO:
- PROHIBIDO mencionar gamas obsoletas ("Fit", "FitController", controladores heredados). Solo "EnGenius Cloud" o Standalone.

RESPONDE ÚNICAMENTE CON EL FRAGMENTO HTML LIMPIO DE LA SECCIÓN (comenzando con <${section.level.toLowerCase()}> y los párrafos correspondientes). NO incluyas bloques markdown \`\`\`html.
`;

  try {
    const generatePromise = client.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.3
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[DeepSectionWriter] Timeout superado (12s)")), 12000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const rawHtml = (response.text || "")
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .trim();

    if (rawHtml.length > 50) {
      const wordCount = rawHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      const usageMetadata = response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
        totalTokenCount: response.usageMetadata.totalTokenCount
      } : undefined;

      return {
        sectionId: section.id,
        title: section.title,
        level: section.level,
        contentType: section.contentType,
        htmlContent: rawHtml,
        wordCount,
        usageMetadata
      };
    }
  } catch (err) {
    console.warn(`[DeepSectionWriter] Error/Timeout redactando sección ${section.id} con IA, aplicando fallback determinista:`, err);
  }

  // Fallback determinista de alta fidelidad para la sección
  return generateDeterministicSectionFallback(section);
}

/**
 * Fallback determinista por sección (basado estrictamente en Product Truth, sin hardcodear marcas)
 */
function generateDeterministicSectionFallback(section: ArticleOutlineSection): WrittenSectionResult {
  let content = "";
  const tag = section.level.toLowerCase();

  switch (section.contentType) {
    case "COMPARISON_TABLE":
      content = `
<${tag}>${section.title}</${tag}>
<p>Al seleccionar equipamiento para despliegues corporativos y redes de alto rendimiento, es fundamental comparar las especificaciones clave de hardware y conmutación:</p>
<div style="overflow-x:auto; margin:20px 0;">
  <table class="tech-comparison-table" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; font-size:14px; text-align:left;">
    <thead>
      <tr style="background:#f1f5f9; border-bottom:2px solid #94a3b8;">
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">Parámetro Técnico</th>
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">Modelo Principal</th>
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">Alternativa / Modelo Estándar</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 14px; font-weight:600;">Estándar & Modulación</td>
        <td style="padding:10px 14px;">Alta Densidad Multi-Gigabit</td>
        <td style="padding:10px 14px;">Estándar Gigabit Concurrente</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0; background:#f8fafc;">
        <td style="padding:10px 14px; font-weight:600;">Conectividad / Uplinks</td>
        <td style="padding:10px 14px;">Multi-Gigabit / 10G SFP+</td>
        <td style="padding:10px 14px;">1G RJ45 / PoE+</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 14px; font-weight:600;">Gestión & Licenciamiento</td>
        <td style="padding:10px 14px; color:#16a34a; font-weight:600;">Nube Centralizada sin Cuotas</td>
        <td style="padding:10px 14px;">Standalone / Cloud Basico</td>
      </tr>
    </tbody>
  </table>
</div>
<p><em>Conclusión Técnica: ${section.keyTakeaway}</em></p>
`;
      break;

    case "INSTALLER_CALLOUT":
      content = `
<${tag}>${section.title}</${tag}>
<p>Durante la instalación en obra y despliegue de infraestructura, la correcta certificación del cableado y el cálculo preciso de consumos evitan incidencias técnicas tras la puesta en marcha.</p>
<div class="installer-callout-box" style="background:#fffbeb; border-left:5px solid #d97706; padding:18px; margin:24px 0; border-radius:6px;">
  <h4 style="color:#b45309; margin:0 0 8px 0; font-size:16px;">⚠️ RECOMENDACIÓN DE CAMPO PARA INSTALADORES:</h4>
  <p style="margin:0 0 8px 0; color:#451a03; font-size:14px; line-height:1.5;">
    En tiradas de red de larga distancia alimentadas por PoE/PoE++, verifica siempre la sección del conductor de cobre y el presupuesto energético (PoE Budget) total disponible en el switch antes de conectar equipos de alto consumo.
  </p>
  <p style="margin:0; color:#78350f; font-size:13px; font-weight:bold;">
    Clave de Garantía: Utilizar cable rígido certificado Cat6A o superior de cobre puro y reservar un margen de seguridad del 20% en el consumo energético.
  </p>
</div>
<p>${section.keyTakeaway}</p>
`;
      break;

    case "TOPOLOGY_DIAGRAM":
      content = `
<${tag}>${section.title}</${tag}>
<p>Topología recomendada para garantizar máxima disponibilidad y eliminación de cuellos de botella:</p>
<pre class="topology-diagram" style="background:#0f172a; color:#38bdf8; padding:18px; border-radius:8px; font-family:monospace; font-size:13px; line-height:1.6; overflow-x:auto;">
[ Gateway / Firewall SD-WAN ]
        | (Uplink 10G / 2.5G)
 [ Switch Core / Distribución ]
        |
        |---------------------------------------|
 [ Switch Acceso PoE / Borde ]           [ Switch Acceso PoE / Planta ]
   |-- Conexión APs Inalámbricos           |-- Equipos IoT & Cámaras IP
   |-- Puestos de Trabajo                  |-- Control de Accesos
</pre>
<p>Esta arquitectura garantiza la óptima canalización del tráfico sin pérdidas de paquetes.</p>
`;
      break;

    case "FAQ":
      content = `
<${tag}>${section.title}</${tag}>
<div class="faq-container" style="margin:20px 0;">
  <div style="margin-bottom:16px;">
    <h4 style="color:#0f172a; margin:0 0 4px 0; font-size:15px; font-weight:700;">¿Cuál es la ventaja de utilizar equipos gestionados en la nube?</h4>
    <p style="margin:0; color:#334155; font-size:14px;">Permite la monitorización remota en tiempo real, diagnósticos centralizados y despliegues sin necesidad de desplazamientos físicos a la instalación.</p>
  </div>
  <div style="margin-bottom:16px;">
    <h4 style="color:#0f172a; margin:0 0 4px 0; font-size:15px; font-weight:700;">¿Cómo tramitar el soporte y garantía oficial?</h4>
    <p style="margin:0; color:#334155; font-size:14px;">A través del canal oficial de EcomSpain, disponiendo de asesoramiento preventa de ingeniería y sustitución de equipamiento.</p>
  </div>
</div>
`;
      break;

    default: // TEXT
      content = `
<${tag}>${section.title}</${tag}>
<p>El despliegue de infraestructuras de red profesionales exige combinar componentes de alta calidad, topologías optimizadas y monitorización continua. Los profesionales de integración priorizan la fiabilidad, la escalabilidad y el control del coste total de propiedad (TCO).</p>
<p>Contar con equipamiento respaldado por stock local, garantía directa y soporte de ingeniería es la clave para asegurar el éxito en cada proyecto.</p>
<p><em>Punto clave de ingeniería: ${section.keyTakeaway}</em></p>
`;
      break;
  }

  const wordCount = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    sectionId: section.id,
    title: section.title,
    level: section.level,
    contentType: section.contentType,
    htmlContent: content.trim(),
    wordCount
  };
}

/**
 * Orquestador Completo: Redacta todas las secciones del Outline secuencialmente,
 * acumulando memoria contextual y aplicando el motor de enlazado interno a EcomShop.
 */
export async function writeFullArticleFromOutline(
  outline: ArticleOutline,
  onSectionProgress?: (current: number, total: number, section: WrittenSectionResult) => void,
  apiKeyOverride?: string
): Promise<FullArticleResult> {
  const writtenSections: WrittenSectionResult[] = [];
  let accumulatedSummary = "";

  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    const written = await writeArticleSection(section, outline, accumulatedSummary, apiKeyOverride);
    writtenSections.push(written);

    accumulatedSummary += `\n- [${section.level}] ${section.title}: ${section.keyTakeaway}`;

    if (onSectionProgress) {
      onSectionProgress(i + 1, outline.sections.length, written);
    }
  }

  return finalizeArticleFromSections(outline, writtenSections);
}

/**
 * Combina un conjunto de secciones ya redactadas, inyecta el catálogo oficial de enlaces
 * internos hacia ecomshop.es y genera los metadatos finales.
 */
export function finalizeArticleFromSections(
  outline: ArticleOutline,
  writtenSections: WrittenSectionResult[]
): FullArticleResult {
  // Combinar el HTML de todas las secciones
  const rawCombinedHtml = `
<article class="ecom-technical-deep-article prose lg:prose-xl max-w-none">
  <h1>${outline.title}</h1>
  ${writtenSections.map((s) => s.htmlContent).join("\n\n")}
</article>
  `.trim();

  // Inyectar enlazado interno automático hacia ecomshop.es
  const linkingResult = injectInternalLinks(rawCombinedHtml, 8);
  const totalWords = writtenSections.reduce((acc, s) => acc + s.wordCount, 0);

  return {
    title: outline.title,
    slug: outline.slug,
    metaDescription: outline.metaDescription,
    targetAudience: outline.targetAudience,
    sections: writtenSections,
    combinedHtml: linkingResult.enrichedHtml,
    totalWords,
    internalLinksCount: linkingResult.linksCount
  };
}
