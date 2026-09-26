/**
 * test-real-5-representative.ts
 *
 * Real Antigravity Agent execution over 5 diverse, representative products:
 * 1. ECW536 (Wi-Fi 7 Access Point)
 * 2. ECS2512FP (Multi-Gigabit PoE++ Switch)
 * 3. RUTX50 (Teltonika 5G Cellular Industrial Router)
 * 4. ESG610 (Cloud Security Gateway SD-WAN)
 * 5. AIRCHECK-G3-PRO (NetAlly Network & Wi-Fi Tester)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { AntigravityTsProvider } from "../src/server/orchestrator/antigravity-ts-provider";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";

async function main() {
  console.log("============================================================");
  console.log("REAL ANTIGRAVITY AGENT 5 REPRESENTATIVE PRODUCTS VERIFICATION");
  console.log("============================================================\n");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-real-5-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  process.env.ANTIGRAVITY_SDK_ENABLED = "true";
  const provider = new AntigravityTsProvider();
  const engine = new MarketingPipelineEngine(provider);

  const representativeSkus = [
    { sku: "ECW536", category: "Wi-Fi AP" },
    { sku: "ECS2512FP", category: "Switch" },
    { sku: "RUTX50", category: "Cellular Router" },
    { sku: "ESG610", category: "Gateway" },
    { sku: "AIRCHECK-G3-PRO", category: "Network Tester" }
  ];

  try {
    for (const item of representativeSkus) {
      console.log(`\n▶ [${item.category}] Ejecutando generación real para SKU: ${item.sku}...`);
      const { run, marketingPackage } = await engine.executePipeline(item.sku, {
        workspacePath: tempWorkspace,
        requestedBy: "lead-engineer@ecomspain.com",
        workspaceId: "test-real-5",
        organizationId: "org-ecomspain",
        provider
      });

      console.log(`   ✅ Run ID: ${run.runId}`);
      console.log(`   ✅ Status: ${run.status}`);
      console.log(`   ✅ Quality Gate: ${marketingPackage.quality.overallStatus} (${marketingPackage.quality.score}/100)`);
      console.log(`   ✅ Positioning: "${marketingPackage.positioning.substring(0, 90)}..."`);
      console.log(`   ✅ SEO Title: "${marketingPackage.seo.title}"`);
      console.log(`   ✅ Primary Keyword: "${marketingPackage.seo.primaryKeyword}"`);
      console.log(`   ✅ CTA URL: "${marketingPackage.cta.url}"`);

      // Special anti-hallucination check for Gateways
      if (item.sku === "ESG610") {
        const fullContent = JSON.stringify(marketingPackage).toLowerCase();
        if (fullContent.includes("antena wifi") || fullContent.includes("wi-fi 7 integrado")) {
          throw new Error("ALUCINACIÓN DETECTADA: ESG610 contiene afirmaciones falsas de Wi-Fi");
        }
        console.log("   🛡️ Anti-Hallucination Guardrail verificado en Gateway ESG610: Zero Wi-Fi radios");
      }

      if (!marketingPackage.quality.passed) {
        throw new Error(`Quality Gate rechazó el SKU ${item.sku}: ${marketingPackage.quality.blockReason}`);
      }
    }

    console.log("\n============================================================");
    console.log("5 REPRESENTATIVE REAL PRODUCTS VERIFICATION: 100% SUCCESSFUL");
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
  console.error("❌ Fallo en verificación real de 5 productos representativos:", err);
  process.exit(1);
});
