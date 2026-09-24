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
  htmlContent: string;
  wordCount: number;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
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
      return {
        sectionId: section.id,
        title: section.title,
        level: section.level,
        htmlContent: rawHtml,
        wordCount,
        usageMetadata: (response as any).usageMetadata ? {
          promptTokenCount: (response as any).usageMetadata.promptTokenCount,
          candidatesTokenCount: (response as any).usageMetadata.candidatesTokenCount
        } : undefined
      } as WrittenSectionResult;
    }
  } catch (err) {
    console.warn(`[DeepSectionWriter] Error/Timeout redactando sección ${section.id} con IA, aplicando fallback determinista:`, err);
  }

  // Fallback determinista de alta fidelidad para la sección
  return generateDeterministicSectionFallback(section);
}

/**
 * Fallback determinista por sección
 */
function generateDeterministicSectionFallback(section: ArticleOutlineSection): WrittenSectionResult {
  let content = "";
  const tag = section.level.toLowerCase();

  switch (section.contentType) {
    case "COMPARISON_TABLE":
      content = `
<${tag}>${section.title}</${tag}>
<p>Al seleccionar equipamiento para despliegues de alta densidad o entornos corporativos, es imprescindible evaluar los parámetros eléctricos y de conmutación reales frente a especificaciones comerciales teóricas.</p>
<div style="overflow-x:auto; margin:20px 0;">
  <table class="tech-comparison-table" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; font-size:14px; text-align:left;">
    <thead>
      <tr style="background:#f1f5f9; border-bottom:2px solid #94a3b8;">
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">Parámetro / Modelo</th>
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">EnGenius ECW536 (Wi-Fi 7)</th>
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">EnGenius ECW526 (Wi-Fi 7)</th>
        <th style="padding:10px 14px; font-weight:600; color:#1e293b;">Switch ECS2512FP (PoE++)</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 14px; font-weight:600;">Estándar / Modulación</td>
        <td style="padding:10px 14px;">Wi-Fi 7 Tri-Band (4096-QAM)</td>
        <td style="padding:10px 14px;">Wi-Fi 7 Dual-Band (4096-QAM)</td>
        <td style="padding:10px 14px;">L2+ Conmutación 2.5G Wire-speed</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0; background:#f8fafc;">
        <td style="padding:10px 14px; font-weight:600;">Puertos Uplink / Conexión</td>
        <td style="padding:10px 14px;">1x 10GbE RJ45 PoE++</td>
        <td style="padding:10px 14px;">1x 2.5GbE RJ45 PoE+</td>
        <td style="padding:10px 14px;">8x 2.5GbE PoE++ + 4x 10G SFP+</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 14px; font-weight:600;">Requisito de Alimentación</td>
        <td style="padding:10px 14px;">PoE++ 802.3bt (38W pico)</td>
        <td style="padding:10px 14px;">PoE+ 802.3at (21W pico)</td>
        <td style="padding:10px 14px;">Presupuesto PoE 240W</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0; background:#f8fafc;">
        <td style="padding:10px 14px; font-weight:600;">Licencias de Gestión</td>
        <td style="padding:10px 14px; color:#16a34a; font-weight:600;">0 € / Año (EnGenius Cloud)</td>
        <td style="padding:10px 14px; color:#16a34a; font-weight:600;">0 € / Año (EnGenius Cloud)</td>
        <td style="padding:10px 14px; color:#16a34a; font-weight:600;">0 € / Año (EnGenius Cloud)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><em>Conclusión: ${section.keyTakeaway}</em></p>
`;
      break;

    case "INSTALLER_CALLOUT":
      content = `
<${tag}>${section.title}</${tag}>
<p>Durante la puesta en marcha de enlaces inalámbricos de alta velocidad y alimentación centralizada en obra, los errores de cálculo de consumo o caída de tensión en tiradas largas representan más del 65% de los partes de avería en las primeras 48 horas tras la inauguración.</p>
<div class="installer-callout-box" style="background:#fffbeb; border-left:5px solid #d97706; padding:18px; margin:24px 0; border-radius:6px;">
  <h4 style="color:#b45309; margin:0 0 8px 0; font-size:16px;">⚠️ TIP DEL INSTALADOR: Caída de Tensión y Consumo PoE++ 802.3bt</h4>
  <p style="margin:0 0 8px 0; color:#451a03; font-size:14px; line-height:1.5;">
    Al alimentar puntos de acceso Wi-Fi 7 con radios 4x4 concurrentes mediante switches PoE, la potencia demandada en arranque puede superar los 35W. Si utilizas cableado Cat5e de sección reducida (AWG 26 o inferior) o tiradas superiores a 60 metros sin certificar, la resistencia del cobre provocará caídas por debajo del umbral mínimo de 42.5V, induciendo reinicios cíclicos (boot-loops) en el AP bajo picos de tráfico.
  </p>
  <p style="margin:0; color:#78350f; font-size:13px; font-weight:bold;">
    Recomendación de Campo: Emplear cable rígido Cat6A U/UTP de cobre puro (mínimo AWG 23) y reservar un margen del 20% en el PoE Budget del switch ECS2512FP.
  </p>
</div>
<p>${section.keyTakeaway}</p>
`;
      break;

    case "TOPOLOGY_DIAGRAM":
      content = `
<${tag}>${section.title}</${tag}>
<p>La topología troncal debe estructurarse eliminando cuellos de botella entre la conmutación de borde y la salida de datos a Internet o servicios locales:</p>
<pre class="topology-diagram" style="background:#0f172a; color:#38bdf8; padding:18px; border-radius:8px; font-family:monospace; font-size:13px; line-height:1.6; overflow-x:auto;">
[ WAN / Internet ]
        |
 [ Gateway SD-WAN ESG610 ]  (Firewall L7 + VPN WireGuard)
        |  (Uplink 10G SFP+ / 2.5GbE)
 [ Switch Core/Agregación ECS5512FP ]  (Distribución de Fibra Troncal)
        |---------------------------------------|
        |  (Troncal 10G SFP+ Fibra OM4)         |  (Troncal 10G SFP+ Fibra OM4)
 [ Switch PoE++ ECS2512FP ] (Rack Planta 1)   [ Switch PoE+ ECS1528FP ] (Rack Planta 2)
   |-- 2.5GbE PoE++ --> AP Wi-Fi 7 (ECW536)      |-- GbE PoE+ --> Cámaras CCTV IP
   |-- 2.5GbE PoE++ --> AP Wi-Fi 7 (ECW526)      |-- GbE PoE+ --> Telefonía VoIP
   |-- 2.5GbE PoE++ --> Puestos de Trabajo        |-- GbE PoE+ --> Control de Accesos
</pre>
<p>Esta distribución garantiza que los APs Wi-Fi 7 no saturen los canales de subida, canalizando el caudal completo hacia el Core mediante transceptores 10G SFP+ sin pérdidas de paquetes.</p>
`;
      break;

    case "FAQ":
      content = `
<${tag}>${section.title}</${tag}>
<div class="faq-container" style="margin:20px 0;">
  <div style="margin-bottom:16px;">
    <h4 style="color:#0f172a; margin:0 0 4px 0; font-size:15px; font-weight:700;">¿Puedo conectar un AP Wi-Fi 7 a mi switch PoE actual de 1 Gbps?</h4>
    <p style="margin:0; color:#334155; font-size:14px;">Sí, funcionará a nivel de enlace Ethernet, pero actuará como un embudo severo. El punto de acceso limitará su velocidad máxima agregada a 940 Mbps netos. Para aprovechar el estándar 802.11be es indispensable migrar los puertos de conexión a switches PoE Multi-Gigabit de 2.5G o 10G.</p>
  </div>
  <div style="margin-bottom:16px;">
    <h4 style="color:#0f172a; margin:0 0 4px 0; font-size:15px; font-weight:700;">¿EnGenius Cloud cobra licencias anuales por AP o switch?</h4>
    <p style="margin:0; color:#334155; font-size:14px;">No. La gestión en la nube básica y avanzada de EnGenius Cloud está incluida de por vida con la compra del hardware, eliminando renovaciones recurrentes de licencias y reduciendo el TCO hasta un 42% frente a competidores.</p>
  </div>
  <div style="margin-bottom:16px;">
    <h4 style="color:#0f172a; margin:0 0 4px 0; font-size:15px; font-weight:700;">¿Dónde se tramita el soporte técnico y la garantía en España?</h4>
    <p style="margin:0; color:#334155; font-size:14px;">A través del soporte preventa de ingeniería de EcomSpain en Alcalá de Henares, con servicio de sustitución en 24h para minimizar tiempos de parada en instalaciones críticas.</p>
  </div>
</div>
`;
      break;

    default: // TEXT
      content = `
<${tag}>${section.title}</${tag}>
<p>El despliegue de infraestructuras de red en instalaciones profesionales requiere un equilibrio estricto entre velocidad de transmisión, compatibilidad electromagnética y control del gasto operativo. Los instaladores certificados se enfrentan hoy al reto de garantizar coberturas fiables en bandas congestionadas, minimizando los tiempos de instalación en obra y evitando cuellos de botella estructurales.</p>
<p>La adopción de tecnologías como Wi-Fi 7 introduce esquemas de modulación 4096-QAM y canales de 320 MHz, capaces de transferir mayores densidades de información en menor tiempo de ocupación aérea. No obstante, para que estas prestaciones se traduzcan en una experiencia de usuario tangible en entornos de oficina densa o industria, la red troncal debe responder con idéntica solvencia.</p>
<p>En este escenario, contar con equipamiento profesional gestionado centralmente en la nube y respaldado por stock inmediato y asesoramiento directo se convierte en la principal garantía de rentabilidad para el integrador.</p>
<p><em>Punto clave de ingeniería: ${section.keyTakeaway}</em></p>
`;
      break;
  }

  const wordCount = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    sectionId: section.id,
    title: section.title,
    level: section.level,
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
