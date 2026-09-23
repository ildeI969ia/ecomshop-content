import * as fs from "node:fs";
import * as path from "node:path";
import { AntigravityPythonSdkProvider } from "../src/server/orchestrator/antigravity-python-provider";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";

async function runRealProductE2E() {
  console.log("=== INICIANDO REAL PRODUCT E2E (SKU: ECW536) ===");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-e2e-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  process.env.ANTIGRAVITY_SDK_ENABLED = "true";
  const provider = new AntigravityPythonSdkProvider();
  const engine = new MarketingPipelineEngine(provider);

  try {
    console.log("1. Resolviendo SKU ECW536 en catálogo canónico y extrayendo evidencias...");
    const resolved = engine.resolveProductAndEvidence("ECW536");
    console.log(`✅ Producto resuelto: ${resolved.product.name} (Lifecycle: ${resolved.lifecycle})`);
    console.log(`✅ Evidencias documentales encontradas: ${resolved.evidence.length}`);

    console.log("2. Ejecutando pipeline completo contra Antigravity Agent (Vertex AI / gemini-2.5-flash)...");
    const { run, marketingPackage } = await engine.executePipeline("ECW536", {
      workspacePath: tempWorkspace,
      requestedBy: "lead-engineer@ecomspain.com",
      provider
    });

    console.log("3. Inspeccionando MarketingRun resultante:");
    console.log({
      runId: run.runId,
      status: run.status,
      currentStep: run.currentStep,
      idempotencyHash: run.idempotencyHash.substring(0, 16) + "...",
      provider: run.provider,
      model: run.model
    });

    console.log("4. Inspeccionando QualityReport de QualityGate:");
    console.log({
      overallStatus: marketingPackage.quality.overallStatus,
      score: marketingPackage.quality.score,
      passed: marketingPackage.quality.passed,
      checksCount: marketingPackage.quality.checks.length
    });
    for (const check of marketingPackage.quality.checks) {
      console.log(`   - [${check.status}] ${check.name}: ${check.details}`);
    }

    if (!marketingPackage.quality.passed) {
      throw new Error(`Quality Gate falló: ${marketingPackage.quality.blockReason}`);
    }

    console.log("5. Inspeccionando MarketingPackage Canónico generado:");
    console.log("   - Positioning:", marketingPackage.positioning);
    console.log("   - SEO Title:", marketingPackage.seo.title);
    console.log("   - SEO Primary Keyword:", marketingPackage.seo.primaryKeyword);
    console.log("   - Key Benefits:", marketingPackage.keyBenefits);
    console.log("   - Social Copy (LinkedIn):", marketingPackage.social.linkedin.substring(0, 100) + "...");
    console.log("   - CTA:", marketingPackage.cta);

    console.log("\n=== REAL PRODUCT E2E COMPLETADO CON ÉXITO ===");
  } finally {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch {
      // Ignorar limpieza
    }
  }
}

runRealProductE2E().catch((err) => {
  console.error("❌ ERROR EN REAL PRODUCT E2E:", err);
  process.exit(1);
});
