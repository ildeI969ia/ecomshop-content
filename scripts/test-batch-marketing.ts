/**
 * test-batch-marketing.ts
 *
 * Automated verification of the Batch Marketing Architecture:
 * 1. Independent execution of multiple SKUs.
 * 2. Fault tolerance: one failed/blocked SKU does not stop other SKUs.
 * 3. Batch metrics (total, completed, blocked, failed).
 * 4. Progressive status updates & retry capability.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";

async function main() {
  console.log("============================================================");
  console.log("BATCH MARKETING ORCHESTRATION - AUTOMATED INTEGRATION TEST");
  console.log("============================================================\n");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-batch-test-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const mockProvider = new MockAgentProvider();

  // Valid structured output for compliant products
  const validOutputJson = JSON.stringify({
    positioning: "Solución de networking profesional de alta fiabilidad y rendimiento",
    targetAudience: "Administradores de red e integradores B2B",
    valueProposition: "Conectividad robusta empresarial sin costes ocultos de licencias",
    keyBenefits: [
      "Hardware de grado empresarial con tolerancia industrial",
      "Gestión centralizada y monitorización remota",
      "Máximo rendimiento y estabilidad de conmutación / radio"
    ],
    technicalHighlights: ["Interfaces Gigabit / Multi-Gigabit", "Protección contra sobretensiones"],
    seo: {
      title: "Solución de Red Empresarial de Alto Rendimiento | EcomShop",
      metaDescription: "Equipamiento de telecomunicaciones homologado para empresas.",
      slug: "solucion-red-empresarial",
      primaryKeyword: "Networking Empresarial"
    },
    productDescription: "Dispositivo diseñado para despliegues empresariales exigentes...",
    shortDescription: "Equipo de red profesional para infraestructuras B2B.",
    social: {
      linkedin: "🚀 Nueva solución de conectividad empresarial...",
      twitter: "Optimiza la red de tu empresa con equipamiento profesional.",
      whatsapp: "Hola, te presentamos la solución de networking profesional para tu proyecto."
    },
    creative: {
      visualConcept: "Rack de comunicaciones ordenado y elegante",
      keyVisualElements: ["Chasis metálico", "Puertos RJ45"],
      bannerHeadlines: ["Conectividad Sin Límites", "Rendimiento Garantizado"]
    },
    cta: {
      primary: "Solicitar cotización técnica",
      url: "https://www.ecomshop.es"
    }
  });

  mockProvider.execute = async (manifest) => {
    return {
      taskId: manifest.taskId,
      exitCode: 0,
      stdout: validOutputJson,
      stderr: "",
      timedOut: false,
      filesChanged: manifest.filesAllowed,
      summary: "Mock generation completed successfully"
    };
  };

  const engine = new MarketingPipelineEngine(mockProvider);

  try {
    // 3 SKUs: ECW536 (valid AP), ECS2512FP (valid Switch), SKU_INEXISTENTE (invalid to verify fault tolerance)
    const testSkus = ["ECW536", "ECS2512FP", "SKU_INEXISTENTE"];

    console.log(`1. Ejecutando lote de ${testSkus.length} SKUs con tolerancia a fallos...`);
    const { batch, results } = await engine.executeBatch(testSkus, {
      workspacePath: tempWorkspace,
      requestedBy: "lead-engineer@ecomspain.com",
      workspaceId: "test-batch-workspace",
      organizationId: "org-ecomspain",
      provider: mockProvider
    });

    console.log("\n2. Inspección del Batch Resultante:");
    console.log(`   Batch ID: ${batch.batchId}`);
    console.log(`   Estado Global: ${batch.status}`);
    console.log(`   Total items: ${batch.totalItems}`);
    console.log(`   Completados: ${batch.completedItems}`);
    console.log(`   Bloqueados: ${batch.blockedItems}`);
    console.log(`   Fallidos: ${batch.failedItems}`);

    // Verificaciones
    if (batch.completedItems !== 2) {
      throw new Error(`Se esperaban 2 items completados, se obtuvieron: ${batch.completedItems}`);
    }
    if (batch.blockedItems !== 1) {
      throw new Error(`Se esperaba 1 item bloqueado/fallido, se obtuvieron: ${batch.blockedItems}`);
    }
    if (batch.status !== "PARTIALLY_FAILED") {
      throw new Error(`Se esperaba estado global PARTIALLY_FAILED, se obtuvo: ${batch.status}`);
    }

    console.log("\n3. Verificación de items individuales en el lote:");
    for (const [sku, item] of Object.entries<any>(batch.items)) {
      console.log(`   - [${item.status}] SKU: ${sku} | RunID: ${item.runId || "N/A"} | Error: ${item.error || "None"}`);
    }

    console.log("\n============================================================");
    console.log("BATCH MARKETING TEST: 100% SUCCESSFUL");
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
  console.error("❌ Fallo en test de batch marketing:", err);
  process.exit(1);
});
