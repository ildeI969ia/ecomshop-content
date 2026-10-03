import { ContentOutput, EditorialThesis } from "@/lib/schema";

export interface EditorialQualityReport {
  passed: boolean;
  score: number;
  factCheck: { passed: boolean; issues: string[] };
  editorialCheck: { passed: boolean; thesisPresent: boolean; issues: string[] };
  audienceCheck: { passed: boolean; audience: string; issues: string[] };
  antiTemplateCheck: { passed: boolean; boilerplateFound: string[]; issues: string[] };
  valueCheck: { passed: boolean; score: number; issues: string[] };
  diversityCheck: { passed: boolean; score: number; issues: string[] };
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

const PROMPT_LEAK_PATTERNS = [
  /editorial\\s+decision/i,
  /editorial\\s+brief/i,
  /reader\\s+learnings/i,
  /reader\\s+promise/i,
  /seg[uú]n\\s+el\\s+outline/i,
  /la\\s+tensi[oó]n\\s+es/i,
  /la\\s+tesis\\s+es/i,
  /el\\s+lector\\s+debe/i,
  /qué\\s+hay\\s+que\\s+entender\\s+antes\\s+de\\s+elegir/i,
  /criterios\\s+t[eé]cnicos\\s+que\\s+cambian\\s+la\\s+decisi[oó]n/i
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
  const requestedProductTruth =
    content.editorialDecision &&
    typeof content.editorialDecision === "object" &&
    typeof (content.editorialDecision as Record<string, unknown>).productTruthLock === "object" &&
    (content.editorialDecision as Record<string, unknown>).productTruthLock !== null
      ? (content.editorialDecision as Record<string, unknown>).productTruthLock as Record<string, unknown>
      : undefined;

  const canonicalModel = typeof requestedProductTruth?.model === "string"
    ? requestedProductTruth.model.toUpperCase()
    : reqSkuClean;

  // Detecta SKUs/modelos reales y frecuentes del catálogo, incluidos productos
  // que sólo existen en el feed dinámico y no en ECOMSHOP_FULL_CATALOG.
  const skuPatterns = [
    /\\bECW\\d+[A-Z0-9-]*\\b/g,
    /\\bECS\\d+[A-Z0-9-]*\\b/g,
    /\\bST\\d{3,6}[A-Z0-9-]*\\b/g,
    /\\bEAP\\d+[A-Z0-9-]*\\b/g,
    /\\bRUT[A-Z0-9-]*\\b/g,
    /\\bTRB[A-Z0-9-]*\\b/g,
    /\\bDAC[-A-Z0-9]+\\b/g,
    /\\bSFP[-A-Z0-9]+\\b/g,
    /\\bPOE\\d+[A-Z0-9-]*\\b/g
  ];

  const detected = new Set<string>();
  for (const pattern of skuPatterns) {
    for (const match of fullText.matchAll(pattern)) {
      const value = match[0].toUpperCase();
      if (value !== reqSkuClean && value !== canonicalModel) {
        detected.add(value);
      }
    }
  }

  const knownBrands = ["ENGENIUS", "STONET", "TELTONIKA", "WI-TEK", "VIVOTEK", "NETIS", "ECOM"];
  const requestedBrand = typeof requestedProductTruth?.brand === "string"
    ? requestedProductTruth.brand.toUpperCase()
    : "";
  for (const brand of knownBrands) {
    if (brand !== requestedBrand && brand !== "ECOM" && fullText.includes(brand)) {
      detected.add(brand);
    }
  }

  const detectedUnrelatedSkus = Array.from(detected);
  const passed = detectedUnrelatedSkus.length === 0;
  const issues = passed
    ? []
    : [
        `Contaminación de producto detectada: la campaña solicita ${reqSkuClean}, pero el contenido contiene otros SKUs/modelos: ${detectedUnrelatedSkus.join(", ")}.`
      ];

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
  requestedAudience = "",
  requestedSku?: string
): EditorialQualityReport {
  const factIssues: string[] = [];
  const editorialIssues: string[] = [];
  const audienceIssues: string[] = [];
  const antiTemplateIssues: string[] = [];
  const boilerplateFound: string[] = [];
  const promptLeakIssues: string[] = [];
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
  const decisionAudience =
    content.editorialDecision &&
    typeof content.editorialDecision === "object" &&
    typeof (content.editorialDecision as Record<string, unknown>).selectedAngle === "object" &&
    (content.editorialDecision as Record<string, unknown>).selectedAngle !== null &&
    typeof ((content.editorialDecision as Record<string, unknown>).selectedAngle as Record<string, unknown>).targetAudience === "string"
      ? String(((content.editorialDecision as Record<string, unknown>).selectedAngle as Record<string, unknown>).targetAudience)
      : "";
  const effectiveAudience = requestedAudience.trim() || decisionAudience.trim();
  const targetAudienceClean = effectiveAudience.toLowerCase();

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

  if (!effectiveAudience) {
    audienceIssues.push("No existe una audiencia editorial explícita; la generación no puede pasar el Quality Gate.");
  }
  const missingKeywords = requiredAudienceKeywords.filter(kw => !lowerText.includes(kw));
  if (missingKeywords.length > 3) {
    audienceIssues.push(`El lenguaje no está suficientemente adaptado a la audiencia ${effectiveAudience}. Faltan conceptos clave: ${missingKeywords.join(", ")}`);
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

  const allEditorialOutputs = [
    content.blog?.htmlContent || "",
    content.geo?.htmlContent || "",
    content.mailchimp?.newsletterHtml || "",
    content.mailchimp?.plainText || "",
    content.whatsapp?.formattedMessage || "",
    content.linkedin?.fullPostText || "",
    content.ecomshop?.argumentario || "",
    content.ecomshop?.cmsHtml || ""
  ].join("\\n");

  for (const pattern of PROMPT_LEAK_PATTERNS) {
    if (pattern.test(allEditorialOutputs)) {
      promptLeakIssues.push(`Se detectó lenguaje interno del sistema en contenido editorial: ${pattern.source}`);
    }
  }

  if (promptLeakIssues.length > 0) {
    antiTemplateIssues.push(...promptLeakIssues);
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

  // El artículo debe seguir siendo útil después de retirar la capa comercial/producto.
  if (!hasTechnicalConcepts) {
    valueScore -= 35;
    valueIssues.push("Al eliminar el producto no se observan conceptos técnicos de ingeniería independientes.");
  }
  if (valueWordCount < 700) {
    valueScore -= 30;
    valueIssues.push("El artículo es demasiado breve para desarrollar análisis, criterios de decisión y aplicación profesional.");
  }

  const h2Count = (blogHtml.match(/<h2\b/gi) || []).length;
  if (h2Count < 5) {
    valueScore -= 15;
    valueIssues.push("La estructura editorial no desarrolla suficientes bloques de análisis.");
  }

  const hasDecisionCriteria =
    /criterios|cómo elegir|cómo evaluar|qué comprobar|qué revisar|dimensionar|validar/i.test(plainText);
  if (!hasDecisionCriteria) {
    valueScore -= 15;
    valueIssues.push("Faltan criterios explícitos que permitan al lector tomar una decisión profesional.");
  }

  const hasLimitations =
    /limitaciones|cuándo encaja|cuándo no|antes del despliegue|debe comprobarse|no se debe asumir/i.test(plainText);
  if (!hasLimitations) {
    valueScore -= 15;
    valueIssues.push("Falta una sección de límites, condiciones o verificaciones antes del despliegue.");
  }

  const hasReaderQuestion =
    /\?|pregunta central|decisión profesional/i.test(plainText) ||
    Boolean(thesis?.technicalQuestion);
  if (!hasReaderQuestion) {
    valueScore -= 15;
    valueIssues.push("El artículo no demuestra que esté respondiendo a una pregunta o decisión concreta del lector.");
  }

  const hasConclusion =
    /<h2[^>]*>[^<]*(conclusión|decisión profesional|decisión final|qué hacer)[^<]*<\/h2>/i.test(blogHtml);
  if (!hasConclusion) {
    valueScore -= 10;
    valueIssues.push("Falta una conclusión editorial que responda a la pregunta inicial.");
  }

  valueScore = Math.max(0, valueScore);
  const valuePassed = valueScore >= 70;

  // 6. PRODUCT CONTAMINATION CHECK
  const contaminationReport = requestedSku ? checkProductContamination(content, requestedSku) : undefined;
  const contaminationPassed = contaminationReport ? contaminationReport.passed : true;
  const decision = content.editorialDecision && typeof content.editorialDecision === "object" ? content.editorialDecision : undefined;
  const diversityReport = decision && typeof decision.diversityReport === "object" && decision.diversityReport !== null
    ? decision.diversityReport as Record<string, unknown>
    : undefined;
  const diversityIssues: string[] = [];
  if (!decision) diversityIssues.push("No existe Editorial Decision del Orchestrator; no se puede demostrar diversidad.");
  else if (diversityReport?.collisionDetected === true) diversityIssues.push("El Orchestrator no encontró un ángulo libre de colisiones con publicaciones previas.");
  const diversityPassed = diversityIssues.length === 0;
  const diversityScore = diversityPassed ? 100 : 0;



  // ACEPTACIÓN FINAL
  const allPassed = factPassed && editorialPassed && audiencePassed && antiTemplatePassed && valuePassed && contaminationPassed && diversityPassed;
  const score = Math.round((factPassed ? 20 : 0) + (editorialPassed ? 20 : 0) + (audiencePassed ? 15 : 0) + (antiTemplatePassed ? 10 : 0) + (valuePassed ? 20 : 0) + (diversityPassed ? 15 : 0));

  const contaminationIssuesText = contaminationReport && !contaminationReport.passed ? contaminationReport.issues.join(" | ") : "";

  const acceptanceMessage = allPassed
    ? "La generación contiene una tesis editorial clara, desarrolla un problema B2B real, aporta análisis técnico, utiliza evidencia verificable, adapta el razonamiento a la audiencia y utiliza el producto como solución concreta."
    : `Generación rechazada por Quality Gate: ${[...factIssues, ...editorialIssues, ...audienceIssues, ...antiTemplateIssues, ...valueIssues, ...diversityIssues, contaminationIssuesText].filter(Boolean).join(" | ")}`;

  return {
    passed: allPassed,
    score,
    factCheck: { passed: factPassed, issues: factIssues },
    editorialCheck: { passed: editorialPassed, thesisPresent, issues: editorialIssues },
    audienceCheck: { passed: audiencePassed, audience: effectiveAudience, issues: audienceIssues },
    antiTemplateCheck: { passed: antiTemplatePassed, boilerplateFound, issues: antiTemplateIssues },
    valueCheck: { passed: valuePassed, score: valueScore, issues: valueIssues },
    diversityCheck: { passed: diversityPassed, score: diversityScore, issues: diversityIssues },
    contaminationCheck: contaminationReport,
    acceptanceMessage
  };
}
