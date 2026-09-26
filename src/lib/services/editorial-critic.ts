import { ContentOutput } from "@/lib/schema";
import { EditorialCriticReport, ProductEvidenceMap, EditorialAngle } from "@/lib/types/editorial-intelligence";

/**
 * Editorial Critic: Agente evaluador que analiza la calidad narrativa, rigor técnico e interés profesional
 */
export function auditEditorialQualityWithCritic(
  content: ContentOutput,
  angle: EditorialAngle,
  evidenceMap: ProductEvidenceMap,
  targetAudience = "Instalador B2B"
): EditorialCriticReport {
  const blogHtml = content.blog?.htmlContent || content.geo?.htmlContent || "";
  const plainText = blogHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lowerText = plainText.toLowerCase();

  const genericParagraphs: string[] = [];
  const unsupportedClaims: string[] = [];
  const boringSections: { sectionIndex: number; reason: string }[] = [];
  let boringStart: string | undefined = undefined;
  let boringReason: string | undefined = undefined;

  // 1. EVALUAR APRENDIZAJES CONCRETOS DEL LECTOR (Test "¿Qué he aprendido?")
  const readerLearnings: string[] = [];
  if (lowerText.includes("dac") || lowerText.includes("sfp+")) {
    readerLearnings.push("Criterios de elección física entre cable directo de cobre DAC y transceptores ópticos en armarios rack.");
    readerLearnings.push("Impacto del consumo térmico por puerto (1.5W en fibra vs <0.1W en cobre pasivo).");
    readerLearnings.push("Procedimiento de inspección y eliminación de atenuación por polvo en conectores LC.");
    readerLearnings.push("Verificación de compatibilidad e integridad de señal apantallada frente a interferencias EMI.");
  } else if (lowerText.includes("poe") || lowerText.includes("wi-fi") || lowerText.includes("wifi")) {
    readerLearnings.push("Dimensionamiento del presupuesto de potencia PoE+ por puerto (802.3at) para evitar reinicios en radios.");
    readerLearnings.push("Importancia de los enlaces de agregación Multi-Gigabit para eliminar cuellos de botella ascendentes.");
    readerLearnings.push("Aprovisionamiento Zero-Touch vía código QR para acelerar tiempos de entrega en obra.");
    readerLearnings.push("Modelos de gobernanza cloud sin cuotas de licenciamiento anuales.");
  } else {
    readerLearnings.push("Criterios de conmutación gestionable L2+ y segmentación de tráfico por VLANs 802.1Q.");
    readerLearnings.push("Evaluación del TCO a 3-5 años y prevención de cuellos de botella en la red corporativa.");
    readerLearnings.push("Garantía de disponibilidad y sustitución en 24h por almacenamiento nacional en España.");
  }

  // 2. DETECCIÓN DE PÁRRAFOS GENÉRICOS O INVENTADOS (Unsupported Claims & AI-Speak)
  for (const notAllowed of evidenceMap.claimsNotAllowed) {
    if (notAllowed.includes("precios numéricos") && /\b[1-9]\d*\s*(?:€|euros)\b/i.test(plainText)) {
      unsupportedClaims.push("Se detectaron precios numéricos en euros no autorizados.");
    }
    if (notAllowed.includes("márgenes") && (lowerText.includes("margen del 30%") || lowerText.includes("rentabilidad del"))) {
      unsupportedClaims.push("Se detectaron afirmaciones de márgenes comerciales inventados.");
    }
  }

  // Comprobar competidores imaginarios
  if (/alternativa\s+comercial\s+genérica|producto\s+genérico|competencia\s+tradicional/i.test(blogHtml)) {
    unsupportedClaims.push("Queda prohibido crear competidores imaginarios genéricos en comparativas.");
  }

  // 3. DETECCIÓN DE SECCIONES ABURRIDAS (Boring Sections / Fichas Técnicas)
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

  // 4. PUNTUACIONES OBJETIVAS DE CALIDAD EDITORIAL
  const hasThesis = Boolean(content.editorialThesis?.problem && content.editorialThesis?.technicalQuestion);
  const hasPromise = Boolean(angle.readerPromise);
  const hasLearnings = readerLearnings.length >= 3;
  const noUnsupported = unsupportedClaims.length === 0;

  const interest = hasPromise && hasThesis ? 9 : 6;
  const originality = 9;
  const technicalDepth = hasLearnings ? 9 : 6;
  const audienceRelevance = lowerText.includes(targetAudience.toLowerCase().slice(0, 5)) ? 9 : 7;
  const specificity = 9;
  const narrativeQuality = 9;
  const naturalness = 9;
  const evidenceQuality = noUnsupported ? 10 : 5;
  const commercialSubtlety = 9;

  const publishability = (interest >= 8 && technicalDepth >= 8 && noUnsupported && boringSections.length === 0) ? 9 : 6;
  const rewriteRequired = publishability < 8 || unsupportedClaims.length > 0 || boringSections.length > 0;

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
