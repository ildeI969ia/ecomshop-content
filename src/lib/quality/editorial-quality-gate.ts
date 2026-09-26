import { ContentOutput, EditorialThesis } from "@/lib/schema";

export interface EditorialQualityReport {
  passed: boolean;
  score: number;
  factCheck: { passed: boolean; issues: string[] };
  editorialCheck: { passed: boolean; thesisPresent: boolean; issues: string[] };
  audienceCheck: { passed: boolean; audience: string; issues: string[] };
  antiTemplateCheck: { passed: boolean; boilerplateFound: string[]; issues: string[] };
  valueCheck: { passed: boolean; score: number; issues: string[] };
  contaminationCheck?: ContaminationReport;
  acceptanceMessage: string;
}

export interface ContaminationReport {
  passed: boolean;
  requestedSku: string;
  detectedUnrelatedSkus: string[];
  issues: string[];
}

const PROHIBITED_OPENING_PATTERNS = [
  /visión\s+general\s+del\s+producto/i,
  /descripción\s+del\s+producto/i,
  /características\s+del\s+producto/i,
  /especificaciones\s+del\s+producto/i,
  /ficha\s+técnica/i
];

const BOILERPLATE_CLICHES = [
  "en el mundo actual",
  "en un entorno cada vez más",
  "en este contexto",
  "es importante destacar",
  "sin duda",
  "en conclusión",
  "revolucionario",
  "impresionante",
  "de última generación",
  "solución definitiva",
  "máximo rendimiento",
  "sin precedentes"
];

/**
 * Comprobación estricta de Contaminación de Producto (Sección 11)
 */
export function checkProductContamination(
  content: ContentOutput,
  requestedSku: string
): ContaminationReport {
  const reqSkuClean = (requestedSku || "").trim().toUpperCase();
  if (!reqSkuClean) {
    return { passed: true, requestedSku: "", detectedUnrelatedSkus: [], issues: [] };
  }

  const fullText = JSON.stringify(content).toUpperCase();
  const knownSkus = ["ECW510", "ECW536", "ECW526", "ECS2512FP", "ECS1528FP", "DAC-10G-3M", "RUTX11", "TRB140"];
  const unrelatedSkus = knownSkus.filter(s => s !== reqSkuClean);

  const detectedUnrelatedSkus: string[] = [];
  for (const otherSku of unrelatedSkus) {
    if (fullText.includes(otherSku)) {
      // Excepción solo si el producto es un switch prescripto para un AP (ej. ECS2512FP para ECW510)
      const isPrescribedSwitch = (reqSkuClean.startsWith("ECW") && otherSku.startsWith("ECS"));
      if (!isPrescribedSwitch) {
        detectedUnrelatedSkus.push(otherSku);
      }
    }
  }

  const passed = detectedUnrelatedSkus.length === 0;
  const issues = passed ? [] : [`Contaminación de producto detectada: El contenido solicitado para ${reqSkuClean} menciona erróneamente ${detectedUnrelatedSkus.join(", ")}`].filter(Boolean);

  return {
    passed,
    requestedSku: reqSkuClean,
    detectedUnrelatedSkus,
    issues
  };
}

/**
 * Audit del Motor Editorial B2B (Mandato 2 + Mandato Urgente)
 */
export function validateEditorialQuality(
  content: ContentOutput,
  requestedAudience = "Instalador B2B",
  requestedSku?: string
): EditorialQualityReport {
  const factIssues: string[] = [];
  const editorialIssues: string[] = [];
  const audienceIssues: string[] = [];
  const antiTemplateIssues: string[] = [];
  const boilerplateFound: string[] = [];
  const valueIssues: string[] = [];

  const blogHtml = content.blog?.htmlContent || content.geo?.htmlContent || "";
  const plainText = blogHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // 1. EDITORIAL THESIS CHECK
  const thesis = content.editorialThesis;
  const thesisPresent = Boolean(
    thesis &&
    thesis.problem &&
    thesis.targetProfessional &&
    thesis.businessContext &&
    thesis.technicalQuestion &&
    thesis.whyItMatters &&
    thesis.centralArgument &&
    thesis.solutionApproach &&
    thesis.productRole
  );

  if (!thesisPresent) {
    editorialIssues.push("Falta la Tesis Editorial (editorialThesis) previa a la escritura del artículo.");
  }

  const outlinePresent = Array.isArray(content.outline) && content.outline.length >= 4;
  if (!outlinePresent) {
    editorialIssues.push("Falta la estructura lógica previa (outline) de al menos 4 secciones.");
  }

  // Comprobar que el producto NO sea el protagonista absoluto desde el inicio
  const first20Pct = plainText.slice(0, Math.floor(plainText.length * 0.25)).toLowerCase();
  const productMentionsInFirst20Pct = (first20Pct.match(/ecw510|ecw536|ecs2512fp|dac-10g-3m|engenius/g) || []).length;
  if (productMentionsInFirst20Pct > 5) {
    editorialIssues.push("El primer 20-30% del artículo menciona excesivamente el producto en lugar de centrarse en el problema profesional B2B.");
  }

  const editorialPassed = thesisPresent && outlinePresent && editorialIssues.length === 0;

  // 2. FACT CHECK
  // Verificar sin precios numéricos inventados (permitiendo la expresión canónica B2B '0€ en licencias/cuotas')
  const inventedPricesMatch = plainText.match(/\b[1-9]\d*\s*(?:€|euros)\b/gi) || plainText.match(/pvp\s*\d+/gi);
  if (inventedPricesMatch && inventedPricesMatch.length > 0) {
    factIssues.push(`Se detectaron precios numéricos inventados en euros (${inventedPricesMatch.join(", ")}).`);
  }
  const factPassed = factIssues.length === 0;

  // 3. AUDIENCE CHECK
  const lowerText = plainText.toLowerCase();
  const targetAudienceClean = requestedAudience.toLowerCase();

  let requiredAudienceKeywords: string[] = [];
  if (targetAudienceClean.includes("instalad") || targetAudienceClean.includes("téc")) {
    requiredAudienceKeywords = ["instalad", "obra", "poe", "despliegue", "cable", "mantenimiento"];
  } else if (targetAudienceClean.includes("director") || targetAudienceClean.includes("tic") || targetAudienceClean.includes("sistemas")) {
    requiredAudienceKeywords = ["arquitectura", "seguridad", "gesti", "escalabilidad", "tco", "continuidad"];
  } else if (targetAudienceClean.includes("compra") || targetAudienceClean.includes("tco")) {
    requiredAudienceKeywords = ["coste", "ciclo de vida", "disponibilidad", "riesgo", "tarifa", "aprovisionamiento"];
  } else if (targetAudienceClean.includes("distribuid") || targetAudienceClean.includes("canal") || targetAudienceClean.includes("mayor")) {
    requiredAudienceKeywords = ["demanda", "rotaci", "venta cruzada", "canal", "oportunidad", "distribuidor"];
  }

  const missingKeywords = requiredAudienceKeywords.filter(kw => !lowerText.includes(kw));
  if (missingKeywords.length > 3) {
    audienceIssues.push(`El lenguaje no está suficientemente adaptado a la audiencia ${requestedAudience}. Faltan conceptos clave: ${missingKeywords.join(", ")}`);
  }
  const audiencePassed = audienceIssues.length === 0;

  // 4. ANTI-TEMPLATE CHECK
  for (const pattern of PROHIBITED_OPENING_PATTERNS) {
    const firstH2Match = blogHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const firstHeading = firstH2Match ? firstH2Match[1] : "";
    if (pattern.test(firstHeading)) {
      antiTemplateIssues.push(`Prohibido empezar con el encabezado '${firstHeading}' (parece ficha de producto).`);
    }
  }

  for (const cliche of BOILERPLATE_CLICHES) {
    if (lowerText.includes(cliche)) {
      boilerplateFound.push(cliche);
    }
  }

  if (boilerplateFound.length > 3) {
    antiTemplateIssues.push(`Se detectaron múltiples frases vacías o clichés repetitivos (${boilerplateFound.join(", ")}).`);
  }

  const antiTemplatePassed = antiTemplateIssues.length === 0;

  // 5. VALUE CHECK (Prueba de eliminación del producto)
  const textWithoutProduct = plainText.replace(/ecw\d+|ecs\d+|dac-[a-z0-9-]+|rutx\d+|trb\d+|engenius|stonet|tachyon|cisco|meraki|ubiquiti/gi, "SOLUCIÓN");
  const valueWordCount = textWithoutProduct.split(/\s+/).filter(Boolean).length;
  const hasTechnicalConcepts = /multi-gigabit|poe|vlan|roaming|mlo|4096-qam|uplink|sfp\+|latencia|ancho de banda|presupuesto|chasis|dac|latiguillo|fibra/i.test(textWithoutProduct);

  let valueScore = 100;
  if (!hasTechnicalConcepts) {
    valueScore -= 40;
    valueIssues.push("Al eliminar el producto no se observan conceptos técnicos de ingeniería independientes.");
  }
  if (valueWordCount < 300) {
    valueScore -= 30;
    valueIssues.push("El contenido es demasiado breve para aportar valor consultivo independiente.");
  }

  const valuePassed = valueScore >= 70;

  // 6. PRODUCT CONTAMINATION CHECK
  const contaminationReport = requestedSku ? checkProductContamination(content, requestedSku) : undefined;
  const contaminationPassed = contaminationReport ? contaminationReport.passed : true;

  // ACEPTACIÓN FINAL
  const allPassed = factPassed && editorialPassed && audiencePassed && antiTemplatePassed && valuePassed && contaminationPassed;
  const score = Math.round(
    ((factPassed ? 20 : 0) +
      (editorialPassed ? 25 : 0) +
      (audiencePassed ? 20 : 0) +
      (antiTemplatePassed ? 15 : 0) +
      (valuePassed ? 20 : 0))
  );

  const contaminationIssuesText = contaminationReport && !contaminationReport.passed ? contaminationReport.issues.join(" | ") : "";

  const acceptanceMessage = allPassed
    ? "La generación contiene una tesis editorial clara, desarrolla un problema B2B real, aporta análisis técnico, utiliza evidencia verificable, adapta el razonamiento a la audiencia y utiliza el producto como solución concreta."
    : `Generación rechazada por Quality Gate: ${[...factIssues, ...editorialIssues, ...audienceIssues, ...antiTemplateIssues, ...valueIssues, contaminationIssuesText].filter(Boolean).join(" | ")}`;

  return {
    passed: allPassed,
    score,
    factCheck: { passed: factPassed, issues: factIssues },
    editorialCheck: { passed: editorialPassed, thesisPresent, issues: editorialIssues },
    audienceCheck: { passed: audiencePassed, audience: requestedAudience, issues: audienceIssues },
    antiTemplateCheck: { passed: antiTemplatePassed, boilerplateFound, issues: antiTemplateIssues },
    valueCheck: { passed: valuePassed, score: valueScore, issues: valueIssues },
    contaminationCheck: contaminationReport,
    acceptanceMessage
  };
}
