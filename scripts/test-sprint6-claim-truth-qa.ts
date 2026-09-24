import { ProductTruthService } from "../src/server/domain/product-truth";
import { validateClaimsAgainstProductTruth } from "../src/server/services/claim-validator";
import { calculateMarketingPackageCompleteness, evaluateMarketingJudge } from "../src/server/services/marketing-judge";
import { validateCampaignTransition } from "../src/server/domain/types";
import { ECOMSHOP_FULL_CATALOG } from "../src/lib/data/ecomshop-catalog";

async function runSprint6Tests() {
  console.log("=== SPRINT 6: PRODUCT TRUTH & AUTONOMOUS QA TEST SUITE ===\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Test assertion failed: ${msg}`);
    }
  }

  // TEST 1: ProductTruthContract resolution for 27 SKUs
  console.log("--> Testing ProductTruthContract resolution on canonical catalog...");
  assert(ECOMSHOP_FULL_CATALOG.length === 27, `Canonical catalog has 27 SKUs (found ${ECOMSHOP_FULL_CATALOG.length})`);
  
  for (const item of ECOMSHOP_FULL_CATALOG) {
    const contract = ProductTruthService.resolveContract(item.sku);
    assert(contract.sku === item.sku, `Contract resolved for ${item.sku}`);
    assert(contract.canonicalUrl.startsWith("http"), `Canonical URL present for ${item.sku}`);
    assert(contract.verifiedClaims.length >= 3, `At least 3 verified claims for ${item.sku}`);
    assert(contract.evidence.length >= 1, `Evidence recorded for ${item.sku}`);
  }

  // TEST 2: Claim Validation Anti-Hallucination Rules
  console.log("\n--> Testing Claim-Level Anti-Hallucination Validation...");
  const gwContract = ProductTruthService.resolveContract("ESG510");
  assert(gwContract.deviceType === "GATEWAY", "ESG510 is a GATEWAY");

  // A) Gateway with hallucinated Wi-Fi 7 -> MUST BLOCK
  const hallucinatedDraft = "El gateway EnGenius ESG510 incluye radio Wi-Fi 7 integrada de alta velocidad.";
  const gwSummary = validateClaimsAgainstProductTruth(hallucinatedDraft, gwContract);
  assert(gwSummary.status === "BLOCK", "Gateway with Wi-Fi claim must be BLOCKED");
  assert(!gwSummary.passed, "Gateway with Wi-Fi claim passed is false");
  assert(gwSummary.contradictedCount > 0, "Contradicted count recorded");

  // B) Switch with AP claim -> MUST BLOCK
  const swContract = ProductTruthService.resolveContract("ECS2512FP");
  const swDraft = "El switch ECS2512FP opera como punto de acceso Wi-Fi corporativo.";
  const swSummary = validateClaimsAgainstProductTruth(swDraft, swContract);
  assert(swSummary.status === "BLOCK", "Switch with AP claim must be BLOCKED");

  // C) Verified claims -> MUST PASS
  const validApContract = ProductTruthService.resolveContract("ECW536");
  const validApDraft = "El punto de acceso EnGenius ECW536 cuenta con Wi-Fi 7 tri-banda, puerto 10 GbE PoE++ y gestión Cloud.";
  const validSummary = validateClaimsAgainstProductTruth(validApDraft, validApContract);
  assert(validSummary.status === "PASS", "Valid AP draft must PASS claim validation");
  assert(validSummary.passed, "Valid AP passed is true");

  // TEST 3: Package Completeness Calculation (Deterministic)
  console.log("\n--> Testing Package Completeness Calculation...");
  const incompletePkg = {
    product: { sku: "ECW536", brand: "EnGenius", name: "ECW536" }
    // missing url, seo, content, cta, etc.
  };
  const completenessIncomplete = calculateMarketingPackageCompleteness(incompletePkg as any);
  assert(completenessIncomplete.status === "BLOCKED", "Incomplete package must be BLOCKED");
  assert(completenessIncomplete.criticalMissingCount > 0, "Critical missing count > 0");

  const fullPkg = {
    product: { sku: "ECW536", brand: "EnGenius", model: "ECW536", name: "EnGenius ECW536", url: "https://ecomshop.es/ecw536" },
    positioning: "AP Wi-Fi 7 Enterprise",
    valueProposition: "Rendimiento sin precedentes",
    seo: { title: "EnGenius ECW536", slug: "ecw536", metaDescription: "Meta description para SEO" },
    productDescription: "Descripción técnica exhaustiva para integradores de red B2B con más de cincuenta caracteres.",
    shortDescription: "Resumen técnico para newsletter B2B de más de veinte caracteres.",
    social: { whatsapp: "Mensaje para difusión por WhatsApp oficial.", linkedin: "Post oficial para LinkedIn profesional corporativo." },
    cta: { primary: "Solicitar Presupuesto", url: "https://ecomshop.es/ecw536" },
    creative: { visualConcept: "Modern data center AP ceiling mount" },
    verifiedClaims: [{ id: "c1", claim: "Wi-Fi 7", technicalFact: "802.11be", sourceId: "s1", sourceType: "datasheet", retrievedAt: new Date().toISOString() }],
    sources: [{ sourceId: "s1", title: "Datasheet ECW536", url: "https://ecomshop.es", type: "datasheet" }]
  };
  const completenessFull = calculateMarketingPackageCompleteness(fullPkg as any);
  assert(completenessFull.status === "PASS", "Full package must be PASS");
  assert(completenessFull.score === 100, "Full package score is 100%");

  // TEST 4: Autonomous Marketing Judge
  console.log("\n--> Testing Autonomous Marketing Judge...");
  const judgeVerdict = evaluateMarketingJudge(fullPkg as any, validApContract, validSummary, completenessFull);
  assert(judgeVerdict.verdict === "APPROVED", "Compliant package must be APPROVED by Judge");
  assert(judgeVerdict.canApprove === true, "canApprove is true");

  // Judge must NEVER approve if claim validation blocked
  const failedJudgeVerdict = evaluateMarketingJudge(fullPkg as any, gwContract, gwSummary, completenessFull);
  assert(failedJudgeVerdict.verdict === "REJECTED", "Contradicted package must be REJECTED by Judge");
  assert(failedJudgeVerdict.canApprove === false, "canApprove is strictly false when claims fail");

  // TEST 5: State Machine Illegal Jumps
  console.log("\n--> Testing Campaign Lifecycle State Machine Illegal Jumps...");
  const directJump1 = validateCampaignTransition("DRAFT", "PUBLISHED", { qualityPassed: true, isApproved: true });
  assert(!directJump1.valid, "Direct jump DRAFT -> PUBLISHED must be invalid");

  const unapprovedPub = validateCampaignTransition("REVIEW", "PUBLISHED", { qualityPassed: true, isApproved: false });
  assert(!unapprovedPub.valid, "REVIEW -> PUBLISHED without approval must be invalid");

  const failedQualityApproval = validateCampaignTransition("REVIEW", "APPROVED", { qualityPassed: false, isApproved: false });
  assert(!failedQualityApproval.valid, "REVIEW -> APPROVED with failed quality must be invalid");

  const validPath = validateCampaignTransition("REVIEW", "APPROVED", { qualityPassed: true, isApproved: false });
  assert(validPath.valid, "REVIEW -> APPROVED with passed quality must be valid");

  const validPublish = validateCampaignTransition("APPROVED", "PUBLISHED", { qualityPassed: true, isApproved: true });
  assert(validPublish.valid, "APPROVED -> PUBLISHED must be valid");

  console.log(`\n==================================================`);
  console.log(`ALL SPRINT 6 TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log(`==================================================`);
}

runSprint6Tests().catch((err) => {
  console.error("FATAL in Sprint 6 Tests:", err);
  process.exit(1);
});
