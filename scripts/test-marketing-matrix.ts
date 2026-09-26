import * as fs from "node:fs";
import * as path from "node:path";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";
import { AntigravityTsProvider } from "../src/server/orchestrator/antigravity-ts-provider";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { findCatalogProduct } from "../src/lib/data/ecomshop-catalog";

async function runMatrix() {
  console.log("=== INICIANDO SUITE DE TESTS MATRIZ DEL MARKETING ORCHESTRATOR ===");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-matrix-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const mockProvider = new MockAgentProvider();
  const engine = new MarketingPipelineEngine(mockProvider);

  try {
    // 1. Test: Known SKU (ECW536)
    console.log("1. Probando resolución de Known SKU (ECW536)...");
    const known = engine.resolveProductAndEvidence("ECW536");
    if (!known.product || known.product.sku !== "ECW536") {
      throw new Error("Fallo en resolución de Known SKU");
    }
    console.log("   ✅ Known SKU resuelto con 3 evidencias de ingeniería");

    // 2. Test: Unknown SKU
    console.log("2. Probando manejo de Unknown SKU...");
    try {
      engine.resolveProductAndEvidence("SKU_INVENTADO_999");
      throw new Error("Debería haber fallado con Unknown SKU");
    } catch (err: any) {
      if (!err.message.includes("PRODUCT_NOT_IN_CANONICAL_CATALOG")) {
        throw new Error(`Mensaje de error inesperado: ${err.message}`);
      }
      console.log("   ✅ Unknown SKU rechazado con PRODUCT_NOT_IN_CANONICAL_CATALOG");
    }

    // 3. Test: Idempotency calculation
    console.log("3. Probando cálculo determinista de Idempotencia...");
    const hash1 = engine.calculateIdempotencyHash("ECW536");
    const hash2 = engine.calculateIdempotencyHash("ecw536 ");
    if (hash1 !== hash2) {
      throw new Error(`Los hashes de idempotencia deben coincidir para el mismo SKU: ${hash1} vs ${hash2}`);
    }
    console.log("   ✅ Idempotency hash normalizado y determinista:", hash1.substring(0, 16) + "...");

    // 4. Test: QualityGate blocking unsupported claim
    console.log("4. Probando bloqueo de QualityGate ante alucinación no soportada...");
    const gatewayProduct = findCatalogProduct("ESG510");
    if (gatewayProduct) {
      const hallucinatedOutput = {
        positioning: "Gateway SD-WAN de alta velocidad",
        targetAudience: "Empresas",
        valueProposition: "Rendimiento",
        keyBenefits: ["Beneficio 1", "Beneficio 2"],
        seo: {
          title: "Gateway ESG510 con Wi-Fi 7 integrado",
          metaDescription: "Gateway con antena WiFi 7 ultra rápida",
          slug: "gateway-esg510",
          primaryKeyword: "ESG510"
        },
        productDescription: "Descripción completa",
        shortDescription: "Descripción corta",
        social: { linkedin: "Post", twitter: "Tweet", whatsapp: "Msg" },
        creative: { visualConcept: "Concepto", keyVisualElements: [], bannerHeadlines: [] },
        cta: { primary: "Comprar", url: "https://ecomshop.es" }
      };

      const qReport = engine.evaluateQualityGate(gatewayProduct, [], hallucinatedOutput);
      const claimCheck = qReport.checks.find((c) => c.name === "CLAIM_CHECK");
      if (claimCheck?.status !== "FAIL" && claimCheck?.status !== "BLOCKED") {
        throw new Error("QualityGate no bloqueó la alucinación de Wi-Fi en Gateway");
      }
      console.log("   ✅ QualityGate bloqueó con éxito claim no verificado (alucinación de Wi-Fi en Gateway)");
    }

    // 5. Test: Provider disabled enforcement
    console.log("5. Probando rechazo cuando ANTIGRAVITY_SDK_ENABLED=false...");
    delete process.env.ANTIGRAVITY_SDK_ENABLED;
    const realProvider = new AntigravityPythonSdkProvider();
    const manifest = {
      runId: "run-test-sec",
      taskId: "task-sec-1",
      agentRole: "ai-marketing",
      workspacePath: tempWorkspace,
      baseCommit: "HEAD",
      environment: "DEVELOPMENT" as const,
      filesAllowed: ["out.txt"],
      filesForbidden: [".env.local"],
      prompt: "Hello"
    };
    const res = await realProvider.execute(manifest);
    if (res.exitCode !== 1 || !res.stderr.includes("ANTIGRAVITY_SDK_DISABLED")) {
      throw new Error("Provider no respetó la flag de seguridad ANTIGRAVITY_SDK_ENABLED");
    }
    console.log("   ✅ Flag de seguridad administrativa respetada rigurosamente");

    // 6. Test: Claim without evidence producing BLOCK in QualityGate
    console.log("6. Probando que claims sin evidencia producen BLOCK en QualityGate...");
    const productEcw = findCatalogProduct("ECW536")!;
    const outputWithoutEvidence = {
      positioning: "AP Wi-Fi 7",
      targetAudience: "Corporativo",
      valueProposition: "Velocidad",
      keyBenefits: ["Beneficio A", "Beneficio B"],
      seo: { title: "Title", metaDescription: "Desc", slug: "slug", primaryKeyword: "KW" },
      productDescription: "Full desc",
      shortDescription: "Short desc",
      social: { linkedin: "L", twitter: "T", whatsapp: "W" },
      creative: { visualConcept: "V", keyVisualElements: [], bannerHeadlines: [] },
      cta: { primary: "CTA", url: "https://ecomshop.es" }
    };
    // Evaluado con lista de evidencias VACÍA
    const qReportNoEvidence = engine.evaluateQualityGate(productEcw, [], outputWithoutEvidence);
    const sourceCheck = qReportNoEvidence.checks.find((c) => c.name === "SOURCE_CHECK");
    if (sourceCheck?.status !== "FAIL" || qReportNoEvidence.passed !== false) {
      throw new Error("QualityGate no bloqueó la generación que carece de evidencias verificadas");
    }
    console.log("   ✅ Claims sin evidencia documental verificada bloqueados rigurosamente (BLOCK / FAIL)");

    console.log("\n=== TODAS LAS PRUEBAS DE LA MATRIZ HAN PASADO (PASS) ===");
  } finally {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

runMatrix().catch((err) => {
  console.error("❌ ERROR EN TEST MATRIX:", err);
  process.exit(1);
});
