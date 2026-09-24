/**
 * test-real-batch-trio.ts
 *
 * Real Antigravity Agent execution over 3 representative products:
 * 1. ECW536 (EnGenius Wi-Fi 7 Access Point)
 * 2. ECS2512FP (EnGenius Multi-Gigabit PoE++ Switch)
 * 3. RUTX50 (Teltonika 5G Cellular Industrial Router - Non-EnGenius product)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { AntigravityPythonSdkProvider } from "../src/server/orchestrator/antigravity-python-provider";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";

async function main() {
  console.log("============================================================");
  console.log("REAL ANTIGRAVITY AGENT BATCH TRIO VERIFICATION");
  console.log("============================================================\n");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-real-trio-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  process.env.ANTIGRAVITY_SDK_ENABLED = "true";
  const provider = new AntigravityPythonSdkProvider();
  const engine = new MarketingPipelineEngine(provider);

  const trioSkus = ["ECW536", "ECS2512FP", "RUTX50"];

  try {
    for (const sku of trioSkus) {
      console.log(`\n▶ Ejecutando generación real para SKU: ${sku}...`);
      const { run, marketingPackage } = await engine.executePipeline(sku, {
        workspacePath: tempWorkspace,
        requestedBy: "lead-engineer@ecomspain.com",
        workspaceId: "test-real-trio",
        organizationId: "org-ecomspain",
        provider
      });

      console.log(`   ✅ Run ID: ${run.runId}`);
      console.log(`   ✅ Status: ${run.status}`);
      console.log(`   ✅ Quality Gate: ${marketingPackage.quality.overallStatus} (${marketingPackage.quality.score}/100)`);
      console.log(`   ✅ Positioning: "${marketingPackage.positioning.substring(0, 100)}..."`);
      console.log(`   ✅ SEO Title: "${marketingPackage.seo.title}"`);
      console.log(`   ✅ CTA URL: "${marketingPackage.cta.url}"`);

      if (!marketingPackage.quality.passed) {
        throw new Error(`Quality Gate rechazó el SKU ${sku}: ${marketingPackage.quality.blockReason}`);
      }
    }

    console.log("\n============================================================");
    console.log("REAL BATCH TRIO VERIFICATION: 100% SUCCESSFUL");
    console.log("============================================================\n");
  } finally {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch {
      // Ignorar limpieza
    }
  }
}

main().catch((err) => {
  console.error("❌ Fallo en test real de trío representativo:", err);
  process.exit(1);
});
