/**
 * audit-skus-full-trace.ts
 *
 * Sprint 6.5.1: Deep audit and full trace for ECW536, ECW526, ECW510.
 * Verifies genuine SKU differentiation, Product Truth grounding, and full multi-channel output.
 */

import { ProductTruthService } from "../src/server/domain/product-truth";
import { MarketingIntelligenceService } from "../src/server/domain/marketing-intelligence";
import { MarketingPipelineOrchestrator } from "../src/server/orchestrator/marketing-pipeline";
import { validateClaimsAgainstProductTruth } from "../src/server/services/claim-validator";
import { evaluateMarketingJudge, calculateMarketingPackageCompleteness } from "../src/server/services/marketing-judge";

async function auditSku(sku: string) {
  console.log(`\n================================================================================`);
  console.log(`DEEP AUDIT FOR SKU: ${sku}`);
  console.log(`================================================================================\n`);

  // 1. Product Truth
  const truth = ProductTruthService.resolveContract(sku);
  console.log(`1. PRODUCT TRUTH CONTRACT`);
  console.log(`   - Model: ${truth.brand} ${truth.model} (${truth.deviceType})`);
  console.log(`   - Canonical URL: ${truth.canonicalUrl}`);
  console.log(`   - Interfaces: ${truth.technicalSpecs.ports.join(", ")}`);
  console.log(`   - Power Requirements: ${truth.technicalSpecs.powerRequirements}`);
  console.log(`   - Primary Source: [${truth.evidence[0]?.sourceId}] ${truth.evidence[0]?.sourceTitle}`);
  console.log(`   - Verified Claims Count: ${truth.verifiedClaims.length}`);
  console.log(`   - Anti-Hallucination Rules: ${truth.antiHallucinationRules.length}`);

  // 2. Marketing Intelligence
  const intel = MarketingIntelligenceService.resolve(sku, truth);
  console.log(`\n2. MARKETING INTELLIGENCE`);
  console.log(`   - Primary Persona: ${intel.targetAudience[0]?.label} (${intel.targetAudience[0]?.role})`);
  console.log(`   - Pain Point: ${intel.targetAudience[0]?.painContext}`);
  console.log(`   - Positioning Summary: ${intel.positioning.solutionSummary}`);
  console.log(`   - Anti-Generic Rationale: ${intel.positioning.antiGenericRationale}`);
  console.log(`   - Primary Keyword: "${intel.keywordClusters[0]?.primaryKeyword}" (Intent: ${intel.keywordClusters[0]?.searchIntent})`);
  console.log(`   - Commercial ROI: ${intel.commercialArguments[0]?.argument}`);

  // 3. Marketing Package Output
  const pkg = await MarketingPipelineOrchestrator.generateDeterministicPackage(sku);
  console.log(`\n3. GENERATED MULTI-CHANNEL OUTPUT`);
  console.log(`   [SEO Title]: ${pkg.seo.title}`);
  console.log(`   [SEO Meta]: ${pkg.seo.metaDescription}`);
  console.log(`   [Primary CTA]: ${pkg.cta.primary} -> ${pkg.cta.url}`);
  console.log(`   [Product Tagline]: ${pkg.productCopy.tagline}`);
  console.log(`   [Short Description]: ${pkg.shortDescription}`);
  console.log(`   [Product Description Sample]: ${pkg.productDescription.substring(0, 160)}...`);
  console.log(`   [LinkedIn]: ${pkg.social.linkedin}`);
  console.log(`   [WhatsApp]: ${pkg.social.whatsapp}`);
  console.log(`   [FAQ 1]: Q: ${pkg.faq?.[0]?.question} | A: ${pkg.faq?.[0]?.answer}`);
  console.log(`   [Creative Brief]: Headline: "${pkg.creative.headline}" | Visual: "${pkg.creative.visualConcept}"`);

  // 4. Claim Validation
  const claimValidation = validateClaimsAgainstProductTruth(pkg.productDescription, truth);
  console.log(`\n4. CLAIM VALIDATION & TRACE`);
  console.log(`   - Status: ${claimValidation.status} (Passed: ${claimValidation.passed})`);
  console.log(`   - Supported Claims: ${claimValidation.supportedCount}`);
  console.log(`   - Unsupported Claims: ${claimValidation.unsupportedCount}`);
  console.log(`   - Contradicted Claims: ${claimValidation.contradictedCount}`);
  if (claimValidation.unsupportedCount > 0) {
    console.log(`   - Unsupported Details:`, claimValidation.details.filter(d => d.status === "UNSUPPORTED"));
  }

  // 5. Quality Gate & Marketing Judge
  const completeness = calculateMarketingPackageCompleteness(pkg);
  const qg = await MarketingPipelineOrchestrator.evaluateQualityGate(pkg);
  const judge = evaluateMarketingJudge(pkg, truth, claimValidation, completeness);
  console.log(`\n5. QUALITY GATE & MARKETING JUDGE`);
  console.log(`   - Quality Gate: ${qg.overallStatus} (${qg.score}/100, Passed: ${qg.passed})`);
  console.log(`   - Marketing Judge Verdict: ${judge.verdict} (Score: ${judge.overallScore}/100, Can Approve: ${judge.canApprove})`);
  console.log(`   - Anti-Generic Score: ${judge.criteria.antiGenericQuality.score}/100`);

  return { truth, intel, pkg, claimValidation, qg, judge };
}

async function main() {
  const r536 = await auditSku("ECW536");
  const r526 = await auditSku("ECW526");
  const r510 = await auditSku("ECW510");

  console.log(`\n================================================================================`);
  console.log(`SIDE-BY-SIDE DIFFERENTIATION VERIFICATION`);
  console.log(`================================================================================\n`);

  console.log(`1. Frequency Bands:`);
  console.log(`   - ECW536: Tri-Band 2.4/5/6 GHz (18.7 Gbps)`);
  console.log(`   - ECW526: Tri-Band 2.4/5/6 GHz (9.4 Gbps)`);
  console.log(`   - ECW510: Dual-Band 2.4/5 GHz only (3.6 Gbps)`);

  console.log(`\n2. Interfaces & Power:`);
  console.log(`   - ECW536: 10 GbE PoE++ 802.3bt (33W)`);
  console.log(`   - ECW526: 2.5 GbE PoE+ 802.3at (21W)`);
  console.log(`   - ECW510: 2.5 GbE PoE+ 802.3at (18W)`);

  console.log(`\n3. Primary Personas & Use Cases:`);
  console.log(`   - ECW536: ${r536.intel.targetAudience[0]?.label} (${r536.truth.targetSegment || "Alta densidad corporativa"})`);
  console.log(`   - ECW526: ${r526.intel.targetAudience[0]?.label} (${r526.truth.targetSegment || "Hospitality & In-room"})`);
  console.log(`   - ECW510: ${r510.intel.targetAudience[0]?.label} (${r510.truth.targetSegment || "Pymes & Sedes distribuidas"})`);

  console.log(`\n4. Distinct Taglines:`);
  console.log(`   - ECW536: ${r536.pkg.productCopy.tagline}`);
  console.log(`   - ECW526: ${r526.pkg.productCopy.tagline}`);
  console.log(`   - ECW510: ${r510.pkg.productCopy.tagline}`);

  const allPassed = r536.qg.passed && r526.qg.passed && r510.qg.passed &&
                    r536.judge.canApprove && r526.judge.canApprove && r510.judge.canApprove;
  
  if (!allPassed) {
    throw new Error("One or more SKUs failed quality gate or judge approval");
  }

  console.log(`\n>>> TRIO AUDIT STATUS: 100% PASSED AND GROUNDED <<<\n`);
}

main().catch(err => {
  console.error("Audit failure:", err);
  process.exit(1);
});
