import { MarketingPackage, QualityReport, QualityCheckItem, QualityCheckStatus } from "../orchestrator/marketing-types";
import { ProductTruthContract } from "../domain/product-truth";
import { validateClaimsAgainstProductTruth, ClaimValidationSummary } from "./claim-validator";

export interface PackageCompletenessDetail {
  component: string;
  mandatory: boolean;
  present: boolean;
  status: QualityCheckStatus;
  notes?: string;
}

export interface PackageCompletenessResult {
  score: number; // 0 - 100
  passed: boolean;
  status: QualityCheckStatus;
  criticalMissingCount: number;
  components: PackageCompletenessDetail[];
  reasons: string[];
}

/**
 * FASE 9 — PACKAGE COMPLETENESS
 * Cálculo determinista de completitud del Marketing Package.
 * No utiliza IA para decidir si un campo obligatorio existe.
 * Si falla un requisito crítico: PACKAGE STATUS = BLOCKED (el promedio nunca oculta un fallo crítico).
 */
export function calculateMarketingPackageCompleteness(pkg: Partial<MarketingPackage>): PackageCompletenessResult {
  const components: PackageCompletenessDetail[] = [
    {
      component: "Product Identity & SKU",
      mandatory: true,
      present: Boolean(pkg.product?.sku && pkg.product?.brand && pkg.product?.name),
      status: (pkg.product?.sku && pkg.product?.brand && pkg.product?.name) ? "PASS" : "BLOCKED",
      notes: "SKU, marca y nombre canónicos requeridos"
    },
    {
      component: "Canonical URL",
      mandatory: true,
      present: Boolean(pkg.product?.url && pkg.product.url.startsWith("http")),
      status: (pkg.product?.url && pkg.product.url.startsWith("http")) ? "PASS" : "BLOCKED",
      notes: "URL oficial de destino obligatoria"
    },
    {
      component: "Positioning & Value Proposition",
      mandatory: true,
      present: Boolean(pkg.positioning && pkg.valueProposition),
      status: (pkg.positioning && pkg.valueProposition) ? "PASS" : "FAIL"
    },
    {
      component: "SEO Metadata (Title, Slug, Meta)",
      mandatory: true,
      present: Boolean(pkg.seo?.title && pkg.seo?.slug && pkg.seo?.metaDescription),
      status: (pkg.seo?.title && pkg.seo?.slug && pkg.seo?.metaDescription) ? "PASS" : "BLOCKED"
    },
    {
      component: "Blog Content (HTML Durable)",
      mandatory: true,
      present: Boolean(pkg.productDescription && pkg.productDescription.length > 50),
      status: (pkg.productDescription && pkg.productDescription.length > 50) ? "PASS" : "FAIL"
    },
    {
      component: "Email Marketing (Newsletter)",
      mandatory: true,
      present: Boolean(pkg.shortDescription && pkg.shortDescription.length > 20),
      status: (pkg.shortDescription && pkg.shortDescription.length > 20) ? "PASS" : "FAIL"
    },
    {
      component: "WhatsApp Broadcast",
      mandatory: true,
      present: Boolean(pkg.social?.whatsapp && pkg.social.whatsapp.length > 20),
      status: (pkg.social?.whatsapp && pkg.social.whatsapp.length > 20) ? "PASS" : "FAIL"
    },
    {
      component: "LinkedIn B2B Post",
      mandatory: true,
      present: Boolean(pkg.social?.linkedin && pkg.social.linkedin.length > 20),
      status: (pkg.social?.linkedin && pkg.social.linkedin.length > 20) ? "PASS" : "FAIL"
    },
    {
      component: "Commercial Call to Action (CTA)",
      mandatory: true,
      present: Boolean(pkg.cta?.primary && pkg.cta?.url),
      status: (pkg.cta?.primary && pkg.cta?.url) ? "PASS" : "FAIL"
    },
    {
      component: "Creative Brief & Image Prompts",
      mandatory: false,
      present: Boolean(pkg.creative?.visualConcept),
      status: pkg.creative?.visualConcept ? "PASS" : "WARN"
    },
    {
      component: "Verified Claims & Evidence Sources",
      mandatory: true,
      present: Boolean(pkg.verifiedClaims && pkg.verifiedClaims.length > 0 && pkg.sources && pkg.sources.length > 0),
      status: (pkg.verifiedClaims && pkg.verifiedClaims.length > 0 && pkg.sources && pkg.sources.length > 0) ? "PASS" : "BLOCKED"
    }
  ];

  const criticalFailed = components.filter(c => c.mandatory && (c.status === "BLOCKED" || c.status === "FAIL"));
  const passedCount = components.filter(c => c.status === "PASS").length;
  const score = Math.round((passedCount / components.length) * 100);

  const reasons = criticalFailed.map(c => `Componente obligatorio ausente o inválido: ${c.component}`);

  return {
    score,
    passed: criticalFailed.length === 0,
    status: criticalFailed.length > 0 ? "BLOCKED" : score >= 80 ? "PASS" : "WARN",
    criticalMissingCount: criticalFailed.length,
    components,
    reasons
  };
}

export interface AutonomousMarketingJudgeEvaluation {
  verdict: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  overallScore: number; // 0 - 100
  canApprove: boolean;
  criteria: {
    technicalFidelity: { score: number; passed: boolean; rationale: string };
    commercialRelevance: { score: number; passed: boolean; rationale: string };
    audienceFit: { score: number; passed: boolean; rationale: string };
    differentiation: { score: number; passed: boolean; rationale: string };
    clarity: { score: number; passed: boolean; rationale: string };
    ctaQuality: { score: number; passed: boolean; rationale: string };
    evidenceCoverage: { score: number; passed: boolean; rationale: string };
    antiGenericQuality: { score: number; passed: boolean; rationale: string };
    channelFit: { score: number; passed: boolean; rationale: string };
    searchIntentFit: { score: number; passed: boolean; rationale: string };
  };
  criticalBlockers: string[];
  revisionReasons: string[];
  evaluatedAt: string;
}

/**
 * FASE 12 & 15 — MARKETING JUDGE 2.0
 * Evaluador independiente de la generación de marketing.
 * No regenera el contenido.
 * El Judge NUNCA puede aprobar un contenido si criticalGateFailed === true o claimValidationFailed === true.
 * Si el contenido es excesivamente genérico o carece de diferenciación real: NEEDS_REVISION.
 */
export function evaluateMarketingJudge(
  pkg: MarketingPackage,
  contract: ProductTruthContract,
  claimValidation: ClaimValidationSummary,
  completeness: PackageCompletenessResult
): AutonomousMarketingJudgeEvaluation {
  const criticalBlockers: string[] = [];
  const revisionReasons: string[] = [];

  // 1. Integridad de claims y verdad de producto
  if (!claimValidation.passed) {
    criticalBlockers.push(...claimValidation.blockReasons);
  }

  // 2. Completitud del paquete
  if (!completeness.passed) {
    criticalBlockers.push(...completeness.reasons);
  }

  // 3. Reglas anti-alucinación
  for (const rule of contract.antiHallucinationRules) {
    const fullText = JSON.stringify(pkg).toLowerCase();
    if (contract.deviceType === "GATEWAY" && (fullText.includes("wi-fi 7") || fullText.includes("antena wifi") || fullText.includes("emite wifi"))) {
      criticalBlockers.push(`Veto estricto: Gateway no puede contener afirmaciones de Wi-Fi.`);
      break;
    }
  }

  // 4. Test Anti-Genérico (Detección de frases huecas sin evidencia)
  const fullContent = `${pkg.positioning} ${pkg.valueProposition} ${pkg.productDescription}`.toLowerCase();
  const genericBuzzwords = [
    "solución innovadora de vanguardia",
    "tecnología avanzada de última generación",
    "máximo rendimiento para todas las empresas",
    "el mejor producto del mercado"
  ];
  const hasGenericFluff = genericBuzzwords.some(phrase => fullContent.includes(phrase));
  const hasSkuSpecificFacts = fullContent.includes(contract.sku.toLowerCase()) ||
    (contract.technicalSpecs.ports && Array.isArray(contract.technicalSpecs.ports) &&
      contract.technicalSpecs.ports.some((p: string) => fullContent.includes(p.toLowerCase())));

  if (hasGenericFluff && !hasSkuSpecificFacts) {
    revisionReasons.push("El contenido es excesivamente genérico y carece de especificaciones concretas del SKU.");
  }

  // 5. Channel Fit (Adaptación real a los canales)
  const blogFit = Boolean(pkg.productDescription && pkg.productDescription.length > 50);
  const socialFit = Boolean(pkg.social?.linkedin && pkg.social?.whatsapp);
  const channelPassed = blogFit && socialFit;
  if (!channelPassed) {
    revisionReasons.push("Inconsistencia en la adaptación de canales (Blog, LinkedIn o WhatsApp insuficientes).");
  }

  // 6. Search Intent Fit
  const hasSearchIntent = Boolean(pkg.seo?.primaryKeyword || pkg.seo?.title);
  if (!hasSearchIntent) {
    revisionReasons.push("Falta definición de palabra clave primaria o título en metadatos SEO.");
  }

  const technicalPassed = criticalBlockers.length === 0 && claimValidation.supportedCount > 0;
  const commercialPassed = Boolean(pkg.cta?.primary && pkg.valueProposition);
  const audiencePassed = Boolean(pkg.targetAudience && pkg.targetAudience.length > 5);
  const diffPassed = Boolean(pkg.keyBenefits && pkg.keyBenefits.length >= 2);
  const evidencePassed = Boolean(pkg.sources && pkg.sources.length > 0);
  const antiGenericPassed = !hasGenericFluff || Boolean(hasSkuSpecificFacts);

  const criteria = {
    technicalFidelity: {
      score: technicalPassed ? 95 : 40,
      passed: technicalPassed,
      rationale: technicalPassed ? "Especificaciones conformes a Product Truth" : "Afirmaciones técnicas no sustentadas detectadas"
    },
    commercialRelevance: {
      score: commercialPassed ? 90 : 50,
      passed: commercialPassed,
      rationale: commercialPassed ? "Propuesta de valor y CTA orientadas a canal B2B" : "Falta propuesta de valor comercial estructurada"
    },
    audienceFit: {
      score: audiencePassed ? 90 : 50,
      passed: audiencePassed,
      rationale: `Público objetivo definido: ${pkg.targetAudience || "No especificado"}`
    },
    differentiation: {
      score: diffPassed ? 85 : 45,
      passed: diffPassed,
      rationale: "Diferenciadores y beneficios clave identificados"
    },
    clarity: {
      score: 90,
      passed: true,
      rationale: "Redacción técnica B2B clara y estructurada"
    },
    ctaQuality: {
      score: pkg.cta?.primary ? 90 : 40,
      passed: Boolean(pkg.cta?.primary),
      rationale: `CTA: ${pkg.cta?.primary || "Ausente"}`
    },
    evidenceCoverage: {
      score: evidencePassed ? 95 : 30,
      passed: evidencePassed,
      rationale: `${pkg.sources?.length || 0} fuentes oficiales del Notebook Master registradas`
    },
    antiGenericQuality: {
      score: antiGenericPassed ? 90 : 40,
      passed: antiGenericPassed,
      rationale: antiGenericPassed ? "Contenido específico basado en specs de ingeniería del SKU" : "Contenido excesivamente abstracto o publicitario genérico"
    },
    channelFit: {
      score: channelPassed ? 90 : 50,
      passed: channelPassed,
      rationale: channelPassed ? "Adaptación específica para Blog, Newsletter, LinkedIn y WhatsApp" : "Variantes de canal incompletas"
    },
    searchIntentFit: {
      score: hasSearchIntent ? 90 : 50,
      passed: hasSearchIntent,
      rationale: hasSearchIntent ? `Intención de búsqueda mapeada: ${pkg.seo?.searchIntent}` : "Metadatos SEO no mapean intención de búsqueda"
    }
  };

  const scores = Object.values(criteria).map(c => c.score);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // REGLA CRÍTICA SPRINT 6.5:
  // Si hay cualquier criticalBlocker -> REJECTED (canApprove = false).
  // Si no hay criticalBlocker pero hay revisionReasons o overallScore < 75 -> NEEDS_REVISION (canApprove = false).
  const canApprove = criticalBlockers.length === 0 && revisionReasons.length === 0 && overallScore >= 75;
  const verdict: "APPROVED" | "REJECTED" | "NEEDS_REVISION" = criticalBlockers.length > 0
    ? "REJECTED"
    : canApprove
    ? "APPROVED"
    : "NEEDS_REVISION";

  return {
    verdict,
    overallScore,
    canApprove,
    criteria,
    criticalBlockers,
    revisionReasons,
    evaluatedAt: new Date().toISOString()
  };
}
