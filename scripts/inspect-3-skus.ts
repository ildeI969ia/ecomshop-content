import { ProductTruthService } from "../src/server/domain/product-truth";
import { MarketingIntelligenceService } from "../src/server/domain/marketing-intelligence";
import { MarketingPipelineOrchestrator } from "../src/server/orchestrator/marketing-pipeline";

async function inspect(sku: string) {
  const truth = ProductTruthService.resolveContract(sku);
  const intel = MarketingIntelligenceService.resolve(sku, truth);
  const pkg = await MarketingPipelineOrchestrator.generateDeterministicPackage(sku);
  console.log(`=== SKU: ${sku} ===`);
  console.log(`DeviceType: ${truth.deviceType} | Brand: ${truth.brand}`);
  console.log(`Notebook Source: ${truth.evidence[0]?.sourceId} - ${truth.evidence[0]?.sourceTitle}`);
  console.log(`Verified Claims Count: ${truth.verifiedClaims.length}`);
  console.log(`Primary Persona: ${intel.targetAudience[0]?.role} (${intel.targetAudience[0]?.label})`);
  console.log(`Pain Context: ${intel.targetAudience[0]?.painContext}`);
  console.log(`Why this product: ${intel.positioning.whyThisProduct}`);
  console.log(`Anti-Generic Rationale: ${intel.positioning.antiGenericRationale}`);
  console.log(`Primary Keyword: ${intel.keywordClusters[0]?.primaryKeyword} | Intent: ${intel.keywordClusters[0]?.searchIntent}`);
  console.log(`Recommended CTA: ${intel.targetAudience[0]?.recommendedCta}`);
  console.log(`Quality Score: ${pkg.quality.score} | Status: ${pkg.quality.overallStatus}`);
  console.log("");
}

async function main() {
  await inspect("ECW536");
  await inspect("ESG510");
  await inspect("ECS2512FP");
}

main().catch(err => {
  console.error("Inspector error:", err);
  process.exit(1);
});
