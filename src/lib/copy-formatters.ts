/**
 * Utilidades de formateo para publicación y copia a 1 clic.
 * Todos los textos visibles están en español.
 */

export interface CopyFormatOptions {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  baseUrl?: string;
}

/**
 * Formatea contenido para WhatsApp:
 * - Convierte markdown bold (**texto** o __texto__) a formato nativo de WhatsApp (*texto*).
 * - Mantiene saltos de línea optimizados para lectura móvil.
 * - Asegura enlaces limpios con parámetros UTM opcionales.
 */
export function formatForWhatsApp(text: string, options?: CopyFormatOptions): string {
  if (!text) return "";

  let formatted = text;

  // Reemplazar encabezados markdown ### o ## por negritas con viñetas o mayúsculas
  formatted = formatted.replace(/^###?\s+(.+)$/gm, "*$1*");

  // Reemplazar **texto** o __texto__ con *texto* para WhatsApp
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "*$1*");
  formatted = formatted.replace(/__(.*?)__/g, "*$1*");

  // Normalizar múltiples saltos de línea consecutivas a máximo 2 para lectura ágil en móvil
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  // Añadir/limpiar UTM en URLs si se especifican
  if (options?.utmSource || options?.utmMedium || options?.utmCampaign) {
    formatted = applyUtmToUrls(formatted, {
      utmSource: options.utmSource || "whatsapp",
      utmMedium: options.utmMedium || "social",
      utmCampaign: options.utmCampaign || "ecomshop_campaign",
    });
  }

  return formatted.trim();
}

/**
 * Formatea contenido para LinkedIn:
 * - Asegura un gancho antes de los 210 caracteres (límite aproximado del "Ver más" de LinkedIn).
 * - Mantiene doble espacio entre párrafos.
 * - Coloca los hashtags al final del texto.
 */
export function formatForLinkedIn(text: string, options?: CopyFormatOptions): string {
  if (!text) return "";

  let lines = text.split("\n").map((line) => line.trim());
  let hashtags: string[] = [];

  // Extraer hashtags si están intercalados o al final
  const cleanedLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^(#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+\s*)+$/)) {
      const found = line.match(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g);
      if (found) hashtags.push(...found);
    } else {
      cleanedLines.push(line);
    }
  }

  let bodyText = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n");

  // Asegurar gancho atractivo antes de los 210 caracteres
  if (bodyText.length > 210 && !bodyText.substring(0, 210).includes("\n")) {
    const firstPeriod = bodyText.indexOf(". ", 50);
    if (firstPeriod !== -1 && firstPeriod < 210) {
      bodyText = bodyText.substring(0, firstPeriod + 1) + "\n\n" + bodyText.substring(firstPeriod + 2);
    }
  }

  // Aplicar UTMs si aplica
  if (options?.utmSource || options?.utmMedium || options?.utmCampaign) {
    bodyText = applyUtmToUrls(bodyText, {
      utmSource: options.utmSource || "linkedin",
      utmMedium: options.utmMedium || "social",
      utmCampaign: options.utmCampaign || "ecomshop_campaign",
    });
  }

  // Deduplicar hashtags y formatear al pie
  const uniqueHashtags = Array.from(new Set(hashtags));
  const hashtagsFooter = uniqueHashtags.length > 0 ? "\n\n" + uniqueHashtags.join(" ") : "";

  return (bodyText.trim() + hashtagsFooter).trim();
}

/**
 * Formatea contenido a HTML limpio para Blog:
 * - Garantiza solo etiquetas semánticas puras (<h2>, <h3>, <p>, <ul>, <li>).
 * - Elimina etiquetas <span>, <div>, atributos style o classes inline.
 * - Incluye bloque de esquema JSON-LD para FAQPage si hay sección de preguntas frecuentes.
 */
export function formatForCleanBlogHtml(text: string, faqs?: Array<{ question: string; answer: string }>): string {
  if (!text) return "";

  let html = text;

  // Si viene en markdown, realizar conversión básica a HTML semántico limpio
  if (!html.includes("<p>") && !html.includes("<h2>")) {
    html = markdownToCleanHtml(text);
  }

  // Limpiar cualquier etiqueta span, style, class u otras no deseadas
  html = html
    .replace(/<span[^>]*>/gi, "")
    .replace(/<\/span>/gi, "")
    .replace(/ style="[^"]*"/gi, "")
    .replace(/ class="[^"]*"/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "");

  // Generar bloque JSON-LD FAQPage si existen FAQs
  let jsonLdScript = "";
  if (faqs && faqs.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    };

    jsonLdScript = `\n<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`;
  }

  return (html.trim() + jsonLdScript).trim();
}

/**
 * Auxiliar: Convierte markdown simple a HTML semántico sin estilos.
 */
function markdownToCleanHtml(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let inList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h3>${line.replace(/^###\s+/, "")}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h2>${line.replace(/^##\s+/, "")}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h2>${line.replace(/^#\s+/, "")}</h2>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`  <li>${line.replace(/^[-*]\s+/, "")}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<p>${line}</p>`);
    }
  }

  if (inList) {
    result.push("</ul>");
  }

  return result.join("\n");
}

/**
 * Auxiliar: Inyecta o reemplaza parámetros UTM en las URLs del texto.
 */
function applyUtmToUrls(text: string, utms: { utmSource: string; utmMedium: string; utmCampaign: string }): string {
  const urlRegex = /(https?:\/\/[^\s<"']+)/g;
  return text.replace(urlRegex, (url) => {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("utm_source", utms.utmSource);
      parsed.searchParams.set("utm_medium", utms.utmMedium);
      parsed.searchParams.set("utm_campaign", utms.utmCampaign);
      return parsed.toString();
    } catch {
      return url;
    }
  });
}
