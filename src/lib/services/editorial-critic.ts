import { ContentOutput } from "@/lib/schema";
import { EditorialCriticReport, ProductEvidenceMap, EditorialAngle } from "@/lib/types/editorial-intelligence";

/**
 * Editorial Critic: Agente evaluador que analiza la calidad narrativa, rigor técnico e interés profesional
 */
export function auditEditorialQualityWithCritic(
  content: ContentOutput,
  angle: EditorialAngle,
  evidenceMap: ProductEvidenceMap,
  targetAudience = ""
): EditorialCriticReport {
  const blogHtml = content.blog?.htmlContent || content.geo?.htmlContent || "";
  const plainText = blogHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lowerText = plainText.toLowerCase();

  const genericParagraphs: string[] = [];
  const unsupportedClaims: string[] = [];
  const boringSections: { sectionIndex: number; reason: string }[] = [];
  let boringStart: string | undefined = undefined;
  let boringReason: string | undefined = undefined;

  // 1. VALOR PARA EL LECTOR: no introducir aprendizajes técnicos hardcoded.
  // Los aprendizajes deben proceder de la Editorial Decision y del contenido generado.
  const decision = content.editorialDecision && typeof content.editorialDecision === "object"
    ? content.editorialDecision as Record<string, unknown>
    : undefined;
  const decisionLearnings = Array.isArray(decision?.readerLearnings)
    ? decision.readerLearnings.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const readerLearnings = decisionLearnings.slice(0, 7);
  const h2Titles = Array.from(blogHtml.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi))
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // 2. DETECCIÓN DE AFIRMACIONES NO AUTORIZADAS Y LENGUAJE DE RELLENO.
  for (const notAllowed of evidenceMap.claimsNotAllowed) {
    if (notAllowed.includes("precios numéricos") && /\b[1-9]\d*\s*(?:€|euros)\b/i.test(plainText)) {
      unsupportedClaims.push("Se detectaron precios numéricos en euros no autorizados.");
    }
    if (notAllowed.includes("márgenes") && /(margen del\s+\d+%|rentabilidad del\s+\d+)/i.test(plainText)) {
      unsupportedClaims.push("Se detectaron afirmaciones de márgenes comerciales inventados.");
    }
  }

  const forbiddenBoilerplate = [
    "en el mundo actual",
    "en un entorno cada vez más",
    "es importante destacar",
    "sin duda",
    "revolucionario",
    "de última generación",
    "solución definitiva",
    "potente y robusto"
  ];
  for (const phrase of forbiddenBoilerplate) {
    if (lowerText.includes(phrase)) {
      genericParagraphs.push(`Lenguaje editorial genérico detectado: "${phrase}".`);
    }
  }

  if (/alternativa\s+comercial\s+genérica|producto\s+genérico|competencia\s+tradicional/i.test(blogHtml)) {
    unsupportedClaims.push("Queda prohibido crear competidores imaginarios genéricos en comparativas.");
  }

  // 3. DETECCIÓN DE SECCIONES ABURRIDAS / FICHA TÉCNICA.
  const sections = blogHtml.split(/<h2[^>]*>/i).slice(1);
  sections.forEach((sec, idx) => {
    const secText = sec.replace(/<[^>]+>/g, " ").trim().toLowerCase();
    if (secText.startsWith("especificaciones") || secText.startsWith("ficha técnica") || secText.startsWith("características del producto")) {
      boringSections.push({
        sectionIndex: idx + 1,
        reason: `La sección ${idx + 1} empieza como una ficha técnica de producto en lugar de plantear un problema o decisión.`
      });
      if (!boringStart) {
        boringStart = `Sección ${idx + 1}`;
        boringReason = "Comienza a enumerar especificaciones sin relación con la tesis editorial.";
      }
    }
  });

  // 4. EVALUACIÓN EDITORIAL REAL, NO PUNTUACIONES FIJAS.
  const hasThesis = Boolean(content.editorialThesis?.problem && content.editorialThesis?.technicalQuestion);
  const hasPromise = Boolean(angle.readerPromise);
  const hasQuestion = Boolean(
    content.editorialThesis?.technicalQuestion ||
    angle.editorialQuestion ||
    /\?/.test(plainText)
  );
  const hasAnalysis = h2Titles.length >= 5 && /criterios|análisis|evaluar|dimensionar|decisión/i.test(lowerText);
  const hasApplication = /cómo encaja|aplicación|producto|despliegue/i.test(lowerText);
  const hasLimitations = /limitaciones|cuándo encaja|cuándo no|debe comprobarse|antes del despliegue/i.test(lowerText);
  const hasConclusion = /decisión profesional|conclusión|decisión final/i.test(lowerText);
  const sufficientLength = plainText.split(/\s+/).filter(Boolean).length >= 700;
  const noUnsupported = unsupportedClaims.length === 0;
  const natural = genericParagraphs.length <= 1;

  const interest = Math.min(10, (hasQuestion ? 3 : 0) + (hasAnalysis ? 2 : 0) + (hasApplication ? 2 : 0) + (hasLimitations ? 2 : 0) + (hasConclusion ? 1 : 0));
  const originality = Math.max(0, Math.min(10, 10 - Math.min(6, genericParagraphs.length)));
  const technicalDepth = Math.min(10, (hasAnalysis ? 4 : 0) + (readerLearnings.length >= 4 ? 2 : readerLearnings.length >= 2 ? 1 : 0) + (sufficientLength ? 2 : 0) + (hasLimitations ? 2 : 0));
  const audienceRelevance = targetAudience.trim() && lowerText.includes(targetAudience.toLowerCase().slice(0, Math.min(6, targetAudience.length)).trim()) ? 9 : 7;
  const specificity = Math.min(10, (hasThesis ? 3 : 0) + (hasQuestion ? 2 : 0) + (hasApplication ? 3 : 0) + (noUnsupported ? 2 : 0));
  const narrativeQuality = Math.min(10, (hasQuestion ? 2 : 0) + (hasAnalysis ? 2 : 0) + (hasApplication ? 2 : 0) + (hasLimitations ? 2 : 0) + (hasConclusion ? 2 : 0));
  const naturalness = natural ? 9 : 5;
  const evidenceQuality = noUnsupported ? 10 : 5;
  const commercialSubtlety = /<h2[^>]*>[^<]*(comprar|precio|oferta|promoción)[^<]*<\/h2>/i.test(blogHtml) ? 5 : 9;

  const publishability = (
    interest >= 8 &&
    technicalDepth >= 8 &&
    specificity >= 8 &&
    narrativeQuality >= 8 &&
    natural &&
    noUnsupported &&
    boringSections.length === 0
  ) ? 9 : 6;

  const rewriteRequired = publishability < 8 || unsupportedClaims.length > 0 || boringSections.length > 0 || !sufficientLength;

  return {
    interest,
    originality,
    technicalDepth,
    audienceRelevance,
    specificity,
    narrativeQuality,
    naturalness,
    evidenceQuality,
    commercialSubtlety,
    publishability,
    readerLearnings,
    genericParagraphs,
    unsupportedClaims,
    boringSections,
    boringStart,
    boringReason,
    rewriteRequired,
    criticFeedback: rewriteRequired
      ? `Reescritura necesaria: ${[...unsupportedClaims, ...boringSections.map(b => b.reason)].join(" | ")}`
      : "El artículo presenta un alto interés profesional, una pregunta central clara, cumple la promesa al lector y mantiene un rigor técnico sin afirmaciones inventadas."
  };
}
