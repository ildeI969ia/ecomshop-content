import { sanitizeHtmlStrict } from "@/components/SafeHtml";

export interface ArticleLayoutOptions {
  sku?: string;
  topicTitle?: string;
}

/**
 * Motor de Maquetación Automática Editorial B2B:
 * 1. Convierte texto plano o markdown a bloques HTML semánticos rigurosos (H2, H3, P, UL, LI, BLOCKQUOTE).
 * 2. Detecta y estructura encabezados de sección automáticamente (h2, h3).
 * 3. Enfatiza con negritas (strong) los términos clave de ingeniería, métricas y especificaciones (PoE, GHz, dBi, GbE, etc.).
 * 4. Convierte párrafos de apertura en destacados editoriales (<p class="lead">).
 * 5. Maqueta listas de viñetas, cajas de aviso técnico y tablas de datos.
 * 6. Garantiza tipografía y jerarquía visual impecable para lectura web y blog público.
 */
export function autoFormatAndStyleArticleHtml(
  rawHtmlOrText: string,
  options?: ArticleLayoutOptions
): string {
  if (!rawHtmlOrText || !rawHtmlOrText.trim()) {
    return "";
  }

  let text = rawHtmlOrText.trim();

  // 1. Si no contiene etiquetas HTML básicas de párrafo o encabezado, procesar desde texto plano/markdown
  const hasHtmlTags = /<(?:p|h[2-4]|ul|ol|table|blockquote|div)\b/i.test(text);

  if (!hasHtmlTags) {
    text = convertPlainTextToStructuredHtml(text, options?.sku);
  } else {
    // Si ya tiene HTML, limpiamos estilos inline rotos pero preservamos la estructura
    text = text
      .replace(/ style="[^"]*"/gi, "")
      .replace(/<font[^>]*>/gi, "")
      .replace(/<\/font>/gi, "");
  }

  // 2. Normalizar encabezados principales
  // Asegurar que las secciones clave comiencen con <h2> y subtítulos con <h3>
  text = text.replace(/<h1\b[^>]*>(.*?)<\/h1>/gi, "<h2>$1</h2>");

  // Si hay párrafos que son claramente encabezados (ej: líneas cortas en negrita o con signo de interrogación que abren tema)
  text = text.replace(/<p><strong>(¿[^?]+?\?|[A-ZÁÉÍÓÚ][^<]{10,80}:?)<\/strong><\/p>/gi, (match, title) => {
    const cleanTitle = title.replace(/:$/, "").trim();
    if (cleanTitle.length < 75 && !cleanTitle.includes(".")) {
      return `<h2>${cleanTitle}</h2>`;
    }
    return match;
  });

  // 3. Estructurar el primer párrafo como <p class="lead font-medium"> si no es ya un lead
  if (!text.includes('class="lead')) {
    text = text.replace(
      /(<p\b[^>]*>)([\s\S]*?<\/p>)/i,
      '<p class="lead text-lg text-slate-200 font-medium leading-relaxed border-l-4 border-sky-500 pl-4 my-6 bg-slate-900/40 py-2 rounded-r-xl">$2'
    );
  }

  // 4. Destacar y aplicar negritas técnicas de forma inteligente en métricas y conceptos clave
  // (evita convertir lo que ya esté dentro de tags)
  text = highlightTechnicalKeywords(text);

  // 5. Detectar listas de viñetas no estructuradas en párrafos con guiones o viñetas
  text = structureBulletListsInHtml(text);

  // 6. Detectar y convertir citas o conclusiones en cajas de recomendación técnica B2B
  text = structureCalloutBoxes(text, options?.sku);

  return text.trim();
}

/**
 * Convierte texto plano o con formato markdown ligero en bloques HTML estructurados.
 */
function convertPlainTextToStructuredHtml(plain: string, sku?: string): string {
  const lines = plain.split(/\r?\n/);
  const blocks: string[] = [];
  let currentParagraphLines: string[] = [];
  let currentListItems: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const pText = currentParagraphLines.join(" ").trim();
      if (pText) {
        blocks.push(`<p>${pText}</p>`);
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      blocks.push(`<ul>\n${currentListItems.map(item => `  <li>${item}</li>`).join("\n")}\n</ul>`);
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      flushParagraph();
      flushList();
      continue;
    }

    // Encabezados Markdown ### o ##
    if (rawLine.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${rawLine.replace(/^###\s+/, "")}</h3>`);
      continue;
    }
    if (rawLine.startsWith("## ") || rawLine.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${rawLine.replace(/^#{1,2}\s+/, "")}</h2>`);
      continue;
    }

    // Líneas que parecen encabezados por ser cortas y terminar en dos puntos o interrogación
    const isHeadingCandidate =
      (rawLine.startsWith("¿") && rawLine.endsWith("?")) ||
      (rawLine.length < 80 && rawLine.endsWith(":") && !rawLine.includes(". ") && currentParagraphLines.length === 0);

    if (isHeadingCandidate && currentListItems.length === 0) {
      flushParagraph();
      blocks.push(`<h2>${rawLine.replace(/:$/, "")}</h2>`);
      continue;
    }

    // Elementos de lista (- o * o •)
    if (/^[-*•]\s+/.test(rawLine)) {
      flushParagraph();
      currentListItems.push(rawLine.replace(/^[-*•]\s+/, ""));
      continue;
    }

    // Listas numeradas (1. , 2. )
    if (/^\d+\.\s+/.test(rawLine)) {
      flushParagraph();
      currentListItems.push(rawLine.replace(/^\d+\.\s+/, ""));
      continue;
    }

    // Línea normal de párrafo
    currentParagraphLines.push(rawLine);
  }

  flushParagraph();
  flushList();

  return blocks.join("\n\n");
}

/**
 * Resalta términos de ingeniería clave con <strong> si no están ya formateados.
 */
function highlightTechnicalKeywords(html: string): string {
  // Términos técnicos esenciales en telecomunicaciones y networking B2B
  const technicalRegex = /\b(Wi-Fi\s*[67E]?|PoE\+{0,2}|802\.11[a-z0-9]+|SFP\+|GbE|Multi-Gigabit|QAM|MIMO|MU-MIMO|OFDMA|TCO|VLAN|SSID|BSSID|PtP|PtMP|IP6[78]|dBi|dBm|GHz|MHz|RJ-?45|Cat6A?|QoS|L2\+|L3)\b/g;

  // Solo aplicar dentro de párrafos <p>...</p> o <li>...</li> evitando etiquetas existentes
  return html.replace(/(<(?:p|li)\b[^>]*>)([\s\S]*?)(<\/(?:p|li)>)/gi, (match, open, content, close) => {
    // Si ya contiene la palabra dentro de un <strong> o <b>, no duplicar
    const highlighted = content.replace(technicalRegex, (techWord: string) => {
      return `<strong>${techWord}</strong>`;
    });
    // Limpiar posibles <strong><strong>...</strong></strong>
    const cleaned = highlighted
      .replace(/<strong><strong>(.*?)<\/strong><\/strong>/gi, "<strong>$1</strong>")
      .replace(/<b><strong>(.*?)<\/strong><\/b>/gi, "<strong>$1</strong>");

    return `${open}${cleaned}${close}`;
  });
}

/**
 * Detecta párrafos que contienen listas separadas por guiones o viñetas y las convierte a <ul><li>
 */
function structureBulletListsInHtml(html: string): string {
  return html.replace(/<p>\s*([-*•]\s+[\s\S]+?)<\/p>/gi, (match, listContent) => {
    const rawItems = listContent.split(/\s*[-*•]\s+/).map((s: string) => s.trim()).filter(Boolean);
    if (rawItems.length >= 2) {
      return `<ul>\n${rawItems.map((item: string) => `  <li>${item}</li>`).join("\n")}\n</ul>`;
    }
    return match;
  });
}

/**
 * Convierte secciones de conclusión o recomendación técnica en bloques callout destacados con estilos de ingeniería.
 */
function structureCalloutBoxes(html: string, sku?: string): string {
  return html.replace(
    /<h2>([^<]*(?:decisión profesional|decisión técnica|conclusión|recomendación)[^<]*)<\/h2>\s*<p>([\s\S]*?)<\/p>/gi,
    (match, heading, body) => {
      return `
<h2>${heading}</h2>
<div class="my-6 p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-500/40 text-slate-100 shadow-md">
  <div class="flex items-center gap-2 mb-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
    <span>💡 Veredicto de Ingeniería & Buenas Prácticas</span>
  </div>
  <p class="text-sm sm:text-base leading-relaxed text-slate-200 mb-0 font-normal">
    ${body}
  </p>
</div>`.trim();
    }
  );
}
