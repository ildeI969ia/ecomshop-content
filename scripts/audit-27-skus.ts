/**
 * scripts/audit-27-skus.ts
 *
 * Comprehensive Product Readiness Audit across all 27 Canonical SKUs:
 * 1. Catalog Identity (SKU, brand, model, category, deviceType, price, stock, specs)
 * 2. Evidence Coverage (sourceId, sourceUrl, confidence level)
 * 3. Knowledge Coverage (NotebookLM source, datasheets, verified claims)
 * 4. Verified Claims (hardware, interfaces, power requirements, key advantages)
 * 5. SEO Readiness (URL slug, search intent, keywords, anti-hallucination guardrails)
 * 6. Creative Readiness (creative angles, target persona, physical aesthetics)
 * 7. Marketing Blockers / Remediation Queue (critical vs warning gaps)
 */

import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "../src/lib/data/ecomshop-catalog";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";

export interface SkuAuditReport {
  sku: string;
  brand: string;
  name: string;
  deviceType: string;
  category: string;
  catalogIdentity: {
    passed: boolean;
    hasSpecs: boolean;
    hasInterfaces: boolean;
    hasPower: boolean;
    hasUrl: boolean;
    issues: string[];
  };
  evidenceCoverage: {
    passed: boolean;
    sourceId: string;
    sourceType: string;
    hasOfficialUrl: boolean;
    evidenceCount: number;
    issues: string[];
  };
  knowledgeCoverage: {
    passed: boolean;
    hasNotebookGrounding: boolean;
    groundingTitle: string;
    hasAntiHallucinationNotes: boolean;
    antiHallucinationCount: number;
  };
  verifiedClaims: {
    passed: boolean;
    claimCount: number;
    claims: string[];
  };
  seoReadiness: {
    passed: boolean;
    hasTargetKeywords: boolean;
    canonicalSlug: string;
  };
  creativeReadiness: {
    passed: boolean;
    hasCommercialAngles: boolean;
    hasKeyAdvantages: boolean;
  };
  status: "MARKETING_READY" | "REMEDIATION_REQUIRED" | "BLOCKED";
  blockers: string[];
  warnings: string[];
}

export function auditAllSkus(): {
  summary: {
    totalSkus: number;
    readyCount: number;
    remediationCount: number;
    blockedCount: number;
    readinessRate: string;
  };
  reports: SkuAuditReport[];
} {
  const engine = new MarketingPipelineEngine(new MockAgentProvider());

  const reports: SkuAuditReport[] = ECOMSHOP_FULL_CATALOG.map((product: CatalogProduct) => {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Catalog Identity Audit
    const hasSpecs = Array.isArray(product.specs) && product.specs.length > 0;
    const hasInterfaces = Array.isArray(product.interfaces) && product.interfaces.length > 0;
    const hasPower = Boolean(product.powerRequirements && product.powerRequirements.trim() !== "");
    const hasUrl = Boolean(product.url && product.url.startsWith("http"));
    const identityIssues: string[] = [];

    if (!hasSpecs) identityIssues.push("Sin especificaciones técnicas (specs)");
    if (!hasInterfaces) identityIssues.push("Sin especificación de interfaces físicas");
    if (!hasPower) identityIssues.push("Sin especificación de requerimientos de alimentación");
    if (!hasUrl) identityIssues.push("Sin URL canónica oficial");

    if (!hasSpecs || !hasInterfaces || !hasPower) {
      blockers.push(...identityIssues);
    }

    // 2. Evidence Coverage Audit
    let evidenceCount = 0;
    const evidenceIssues: string[] = [];
    const sourceId = product.notebookSource?.sourceId || "";
    const sourceType = product.notebookSource?.type || "";
    const hasOfficialUrl = Boolean(product.notebookSource?.url && product.notebookSource.url.startsWith("http"));

    if (!sourceId) evidenceIssues.push("Falta sourceId documental");
    if (!hasOfficialUrl) warnings.push("Falta URL pública en notebookSource");

    let extractedEvidence: any[] = [];
    try {
      const resolved = engine.resolveProductAndEvidence(product.sku);
      extractedEvidence = resolved.evidence;
      evidenceCount = extractedEvidence.length;
    } catch (err: any) {
      blockers.push(`Fallo al resolver evidencias: ${err.message}`);
    }

    if (evidenceCount < 3) {
      blockers.push(`Evidencias insuficientes (${evidenceCount} < 3 requeridas)`);
    }

    // 3. Knowledge Coverage Audit
    const hasNotebookGrounding = Boolean(product.notebookSource && product.notebookSource.sourceId);
    const antiHallucinationCount = Array.isArray(product.antiHallucinationNotes) ? product.antiHallucinationNotes.length : 0;
    const hasAntiHallucinationNotes = antiHallucinationCount > 0;

    if (!hasAntiHallucinationNotes) {
      warnings.push("Sin notas explícitas anti-alucinación");
    }

    // 4. Verified Claims Audit
    const claims = extractedEvidence.map((e) => `${e.claim}: ${e.value}`);
    const verifiedClaimsPassed = claims.length >= 3;

    // 5. SEO Readiness
    const hasTargetKeywords = Array.isArray(product.seoKeywords) && product.seoKeywords.length > 0;
    const canonicalSlug = product.sku.toLowerCase();
    if (!hasTargetKeywords) {
      warnings.push("Sin keywords SEO preconfiguradas");
    }

    // 6. Creative Readiness
    const hasCommercialAngles = Boolean(product.commercialAngles && product.commercialAngles.executiveRoi);
    const hasKeyAdvantages = Array.isArray(product.keyAdvantages) && product.keyAdvantages.length > 0;
    if (!hasKeyAdvantages) {
      warnings.push("Sin ventajas clave comerciales explícitas");
    }

    // Final Status Determination
    let status: "MARKETING_READY" | "REMEDIATION_REQUIRED" | "BLOCKED" = "MARKETING_READY";
    if (blockers.length > 0) {
      status = "BLOCKED";
    } else if (warnings.length > 0) {
      status = "REMEDIATION_REQUIRED";
    }

    return {
      sku: product.sku,
      brand: product.brand,
      name: product.name,
      deviceType: product.deviceType,
      category: product.category,
      catalogIdentity: {
        passed: identityIssues.length === 0,
        hasSpecs,
        hasInterfaces,
        hasPower,
        hasUrl,
        issues: identityIssues
      },
      evidenceCoverage: {
        passed: evidenceCount >= 3 && Boolean(sourceId),
        sourceId,
        sourceType,
        hasOfficialUrl,
        evidenceCount,
        issues: evidenceIssues
      },
      knowledgeCoverage: {
        passed: hasNotebookGrounding,
        hasNotebookGrounding,
        groundingTitle: product.notebookSource?.title || "N/A",
        hasAntiHallucinationNotes,
        antiHallucinationCount
      },
      verifiedClaims: {
        passed: verifiedClaimsPassed,
        claimCount: claims.length,
        claims
      },
      seoReadiness: {
        passed: hasTargetKeywords,
        hasTargetKeywords,
        canonicalSlug
      },
      creativeReadiness: {
        passed: hasCommercialAngles && hasKeyAdvantages,
        hasCommercialAngles,
        hasKeyAdvantages
      },
      status,
      blockers,
      warnings
    };
  });

  const readyCount = reports.filter((r) => r.status === "MARKETING_READY").length;
  const remediationCount = reports.filter((r) => r.status === "REMEDIATION_REQUIRED").length;
  const blockedCount = reports.filter((r) => r.status === "BLOCKED").length;

  return {
    summary: {
      totalSkus: reports.length,
      readyCount,
      remediationCount,
      blockedCount,
      readinessRate: `${Math.round(((readyCount + remediationCount) / reports.length) * 100)}%`
    },
    reports
  };
}

// Run audit
const audit = auditAllSkus();
console.log("============================================================");
console.log("ECOMSHOP MARKETING OS — 27 SKUs PRODUCT READINESS AUDIT");
console.log("============================================================\n");
console.log(`Total SKUs: ${audit.summary.totalSkus}`);
console.log(`Ready: ${audit.summary.readyCount}`);
console.log(`Remediation Required (Warnings only): ${audit.summary.remediationCount}`);
console.log(`Blocked: ${audit.summary.blockedCount}`);
console.log(`Operational Coverage Rate: ${audit.summary.readinessRate}\n`);

console.log("============================================================");
console.log("DETAILED AUDIT PER SKU");
console.log("============================================================");
for (const rep of audit.reports) {
  const icon = rep.status === "MARKETING_READY" ? "🟢" : rep.status === "REMEDIATION_REQUIRED" ? "🟡" : "🔴";
  console.log(`${icon} [${rep.status}] ${rep.sku} | ${rep.brand} | ${rep.deviceType} | ${rep.name}`);
  console.log(`   - Evidence: ${rep.evidenceCoverage.evidenceCount} verified claims | Source: ${rep.knowledgeCoverage.groundingTitle}`);
  if (rep.blockers.length > 0) {
    console.log(`   ⛔ BLOCKERS: ${rep.blockers.join(" | ")}`);
  }
  if (rep.warnings.length > 0) {
    console.log(`   ⚠️ WARNINGS: ${rep.warnings.join(" | ")}`);
  }
}

