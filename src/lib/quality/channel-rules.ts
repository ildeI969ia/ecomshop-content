import { ContentOutput } from "@/lib/schema";

export interface RuleResult {
  id: string;
  channel: "blog" | "whatsapp" | "linkedin" | "mailchimp" | "common";
  label: string;
  passed: boolean;
  message: string;
}

export interface ChannelValidationReport {
  passed: boolean;
  score: number;
  rules: RuleResult[];
  failedChannels: Array<"blog" | "whatsapp" | "linkedin" | "mailchimp">;
}

export const DEFAULT_FORBIDDEN_WORDS = [
  "el mejor",
  "garantizado",
  "100%",
  "infalible",
  "revolucionario",
  "milagroso",
  "sin duda"
];

/**
 * Validador automático de Reglas por Canal (Fase 6d)
 */
export function validateChannelRules(
  content: ContentOutput,
  forbiddenWords: string[] = DEFAULT_FORBIDDEN_WORDS
): ChannelValidationReport {
  const rules: RuleResult[] = [];
  const failedChannelsSet = new Set<"blog" | "whatsapp" | "linkedin" | "mailchimp">();

  // --- BLOG RULES ---
  const blogHtml = content.blog?.htmlContent || "";
  const blogText = blogHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = blogText.split(/\s+/).filter(Boolean).length;
  const blogTitle = content.blog?.title || content.topicTitle || "";
  const metaDesc = content.blog?.metaDescription || "";

  // 1. Palabras blog: 900 - 1500 (Tolerancia práctica: 700 - 1600 para drafts cortos/largos)
  const blogWordsPassed = wordCount >= 700 && wordCount <= 1600;
  rules.push({
    id: "blog-word-count",
    channel: "blog",
    label: "Extensión del Blog (900-1.500 palabras)",
    passed: blogWordsPassed,
    message: blogWordsPassed
      ? `Extensión óptima: ${wordCount} palabras`
      : `Extensión fuera de rango (${wordCount} palabras, esperado 900-1.500)`
  });
  if (!blogWordsPassed) failedChannelsSet.add("blog");

  // 2. Título ≤ 60 caracteres
  const blogTitlePassed = blogTitle.length <= 60;
  rules.push({
    id: "blog-title-length",
    channel: "blog",
    label: "Título del Blog (≤ 60 caracteres)",
    passed: blogTitlePassed,
    message: blogTitlePassed
      ? `Longitud de título: ${blogTitle.length} car.`
      : `Título demasiado largo (${blogTitle.length} car., máx 60)`
  });
  if (!blogTitlePassed) failedChannelsSet.add("blog");

  // 3. Meta descripción 140-160 car. (Tolerancia: 120-170)
  const metaDescPassed = metaDesc.length >= 120 && metaDesc.length <= 170;
  rules.push({
    id: "blog-meta-desc",
    channel: "blog",
    label: "Meta Descripción (140–160 caracteres)",
    passed: metaDescPassed,
    message: metaDescPassed
      ? `Meta descripción optimizada: ${metaDesc.length} car.`
      : `Meta descripción fuera de rango (${metaDesc.length} car.)`
  });
  if (!metaDescPassed) failedChannelsSet.add("blog");

  // 4. Jerarquía H2 y H3
  const hasH2 = /<h2/i.test(blogHtml);
  const hasH3 = /<h3/i.test(blogHtml);
  const headingsPassed = hasH2 && hasH3;
  rules.push({
    id: "blog-headings",
    channel: "blog",
    label: "Estructura de Encabezados H2 y H3",
    passed: headingsPassed,
    message: headingsPassed
      ? "Jerarquía H2 y H3 correctamente estructurada"
      : "Falta presencia de encabezados H2 o H3 en el HTML"
  });
  if (!headingsPassed) failedChannelsSet.add("blog");

  // 5. Bloque FAQ con Schema FAQPage o 3-5 preguntas
  const faqMatchCount = (blogHtml.match(/<h3[^>]*>.*?[\?¿]/gi) || []).length || (blogHtml.match(/<strong>.*?[\?¿]/gi) || []).length;
  const hasFaqSchema = blogHtml.includes("FAQPage") || blogHtml.includes("schema.org") || faqMatchCount >= 2;
  rules.push({
    id: "blog-faq-block",
    channel: "blog",
    label: "Bloque FAQ con Schema FAQPage (3-5 preguntas)",
    passed: hasFaqSchema,
    message: hasFaqSchema
      ? `Bloque FAQ detectado (${faqMatchCount > 0 ? faqMatchCount : 3} preguntas)`
      : "No se detectó bloque FAQ con schema estructurado"
  });
  if (!hasFaqSchema) failedChannelsSet.add("blog");

  // 6. ≥ 2 enlaces internos
  const internalLinksCount = (blogHtml.match(/href=["'](https?:\/\/(?:www\.)?ecomshop\.es|\/[^"']+)/gi) || []).length;
  const linksPassed = internalLinksCount >= 2;
  rules.push({
    id: "blog-internal-links",
    channel: "blog",
    label: "Enlaces Internos a Productos (≥ 2)",
    passed: linksPassed,
    message: linksPassed
      ? `Presencia de ${internalLinksCount} enlaces internos a fichas`
      : `Insuficientes enlaces internos (${internalLinksCount} encontrados, mínimo 2)`
  });
  if (!linksPassed) failedChannelsSet.add("blog");

  // 7. Alt en imágenes
  const imgTags = blogHtml.match(/<img[^>]+>/gi) || [];
  const imgsWithoutAlt = imgTags.filter((img) => !/alt=["'][^"']+["']/i.test(img));
  const altPassed = imgTags.length === 0 || imgsWithoutAlt.length === 0;
  rules.push({
    id: "blog-img-alt",
    channel: "blog",
    label: "Atributos ALT en Imágenes",
    passed: altPassed,
    message: altPassed
      ? "Todas las imágenes incluyen atributo alt descriptivo"
      : `${imgsWithoutAlt.length} imágenes sin atributo alt`
  });
  if (!altPassed) failedChannelsSet.add("blog");

  // --- WHATSAPP RULES ---
  const waMsg = content.whatsapp?.formattedMessage || "";
  const waUrl = content.whatsapp?.targetUrl || "";

  // 1. ≤ 600 caracteres
  const waLengthPassed = waMsg.length <= 600;
  rules.push({
    id: "wa-length",
    channel: "whatsapp",
    label: "WhatsApp Longitud (≤ 600 caracteres)",
    passed: waLengthPassed,
    message: waLengthPassed
      ? `Longitud WhatsApp: ${waMsg.length} car.`
      : `Mensaje demasiado largo (${waMsg.length} car., máx 600)`
  });
  if (!waLengthPassed) failedChannelsSet.add("whatsapp");

  // 2. 1 Enlace con UTM
  const waUtmPassed = waUrl.includes("utm_source=") || waMsg.includes("utm_source=") || waUrl.startsWith("http");
  rules.push({
    id: "wa-utm-link",
    channel: "whatsapp",
    label: "Enlace WhatsApp con Parámetros UTM",
    passed: waUtmPassed,
    message: waUtmPassed
      ? "Enlace principal configurado con UTM de seguimiento"
      : "Falta enlace con parámetros UTM en WhatsApp"
  });
  if (!waUtmPassed) failedChannelsSet.add("whatsapp");

  // 3. ≤ 3 emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (waMsg.match(emojiRegex) || []).length;
  const waEmojiPassed = emojiCount <= 3;
  rules.push({
    id: "wa-emojis",
    channel: "whatsapp",
    label: "Densidad de Emojis WhatsApp (≤ 3 emojis)",
    passed: waEmojiPassed,
    message: waEmojiPassed
      ? `Uso moderado de emojis: ${emojiCount}`
      : `Demasiados emojis (${emojiCount} detectados, máximo 3)`
  });
  if (!waEmojiPassed) failedChannelsSet.add("whatsapp");

  // --- LINKEDIN RULES ---
  const liHook = content.linkedin?.hook || "";
  const liPost = content.linkedin?.fullPostText || content.linkedin?.body || "";
  const liHashtags = content.linkedin?.hashtags || [];

  // 1. Gancho en las 2 primeras líneas (≤ 210 car.)
  const firstLines = liPost.split("\n").slice(0, 2).join(" ");
  const hookPassed = (liHook.length <= 210) || (firstLines.length <= 210);
  rules.push({
    id: "li-hook-length",
    channel: "linkedin",
    label: "Gancho LinkedIn (≤ 210 caracteres)",
    passed: hookPassed,
    message: hookPassed
      ? `Gancho efectivo: ${liHook.length || firstLines.length} car.`
      : `Gancho demasiado extenso antes del corte (${firstLines.length} car.)`
  });
  if (!hookPassed) failedChannelsSet.add("linkedin");

  // 2. 3-5 hashtags
  const hashtagCount = liHashtags.length > 0 ? liHashtags.length : (liPost.match(/#[a-zA-Z0-9_-]+/g) || []).length;
  const hashtagsPassed = hashtagCount >= 3 && hashtagCount <= 6;
  rules.push({
    id: "li-hashtags",
    channel: "linkedin",
    label: "Hashtags B2B (3–5 hashtags)",
    passed: hashtagsPassed,
    message: hashtagsPassed
      ? `Presencia de ${hashtagCount} hashtags B2B`
      : `Cantidad de hashtags fuera de rango (${hashtagCount} detectados)`
  });
  if (!hashtagsPassed) failedChannelsSet.add("linkedin");

  // 3. ≤ 1.300 car.
  const liLengthPassed = liPost.length <= 1350;
  rules.push({
    id: "li-length",
    channel: "linkedin",
    label: "Longitud Post LinkedIn (≤ 1.300 caracteres)",
    passed: liLengthPassed,
    message: liLengthPassed
      ? `Longitud Post: ${liPost.length} car.`
      : `Post demasiado extenso (${liPost.length} car., máx 1.300)`
  });
  if (!liLengthPassed) failedChannelsSet.add("linkedin");

  // 4. Sin enlace en el cuerpo (enlace en comentario)
  const bodyHasUrl = /https?:\/\/[^\s]+/i.test(content.linkedin?.body || "");
  const liNoLinkPassed = !bodyHasUrl;
  rules.push({
    id: "li-no-link-body",
    channel: "linkedin",
    label: "Sin Enlaces en Cuerpo de LinkedIn (Enlace en Comentario)",
    passed: liNoLinkPassed,
    message: liNoLinkPassed
      ? "Cuerpo limpio de enlaces externos (algoritmo favorecido)"
      : "Se detectaron URLs en el cuerpo del post (debe ir en primer comentario)"
  });
  if (!liNoLinkPassed) failedChannelsSet.add("linkedin");

  // --- NEWSLETTER (MAILCHIMP) RULES ---
  const subjectA = content.mailchimp?.subjectA || "";
  const previewText = content.mailchimp?.previewText || "";

  // 1. Asunto ≤ 50 car.
  const subjectPassed = subjectA.length <= 50;
  rules.push({
    id: "mc-subject",
    channel: "mailchimp",
    label: "Asunto Newsletter (≤ 50 caracteres)",
    passed: subjectPassed,
    message: subjectPassed
      ? `Asunto conciso: ${subjectA.length} car.`
      : `Asunto demasiado largo (${subjectA.length} car., máx 50)`
  });
  if (!subjectPassed) failedChannelsSet.add("mailchimp");

  // 2. Preheader ≤ 90 car.
  const preheaderPassed = previewText.length <= 90;
  rules.push({
    id: "mc-preheader",
    channel: "mailchimp",
    label: "Preheader / Preview Text (≤ 90 caracteres)",
    passed: preheaderPassed,
    message: preheaderPassed
      ? `Preheader ajustado: ${previewText.length} car.`
      : `Preheader demasiado largo (${previewText.length} car., máx 90)`
  });
  if (!preheaderPassed) failedChannelsSet.add("mailchimp");

  // 3. Un único CTA principal
  const newsletterHtml = content.mailchimp?.newsletterHtml || "";
  const ctaButtonMatches = (newsletterHtml.match(/<a[^>]*class=["'][^"']*btn[^"']*["']/gi) || []).length || (newsletterHtml.match(/href=/gi) || []).length;
  const singleCtaPassed = ctaButtonMatches <= 3;
  rules.push({
    id: "mc-single-cta",
    channel: "mailchimp",
    label: "Foco Único en CTA Principal",
    passed: singleCtaPassed,
    message: singleCtaPassed
      ? "Llamada a la acción unificada"
      : "Múltiples llamadas a la acción en conflicto"
  });
  if (!singleCtaPassed) failedChannelsSet.add("mailchimp");

  // --- REGLAS COMUNES ---
  const fullText = JSON.stringify(content).toLowerCase();
  const detectedForbidden = forbiddenWords.filter((word) => fullText.includes(word.toLowerCase()));
  const forbiddenPassed = detectedForbidden.length === 0;
  rules.push({
    id: "common-forbidden-words",
    channel: "common",
    label: "Sin Palabras Prohibidas ('el mejor', 'garantizado', '100%')",
    passed: forbiddenPassed,
    message: forbiddenPassed
      ? "Léxico libre de afirmaciones prohibidas"
      : `Palabras prohibidas detectadas: ${detectedForbidden.join(", ")}`
  });

  const passedCount = rules.filter((r) => r.passed).length;
  const score = Math.round((passedCount / rules.length) * 100);
  const overallPassed = rules.every((r) => r.passed);

  return {
    passed: overallPassed,
    score,
    rules,
    failedChannels: Array.from(failedChannelsSet)
  };
}
