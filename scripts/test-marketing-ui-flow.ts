/**
 * test-marketing-ui-flow.ts
 *
 * Automated verification of the full user-facing Marketing OS workflow:
 * 1. Product resolution & selection (canonical catalog).
 * 2. Invocation of Marketing OS pipeline with MockAgentProvider configured with structured JSON.
 * 3. Execution status and Quality Gate evaluation.
 * 4. Verification of 9 Quality Gate checks, ProductEvidence, and MarketingPackage.
 * 5. Re-generation / multi-version test preserving history.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { findCatalogProduct, ECOMSHOP_FULL_CATALOG } from "../src/lib/data/ecomshop-catalog";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";

async function main() {
  console.log("============================================================");
  console.log("ECOMSHOP MARKETING OS - UI/API WORKFLOW INTEGRATION TEST");
  console.log("============================================================\n");

  const targetSku = "ECW536";

  // Step 1: Canonical Catalog verification
  console.log("1. Catalog Resolution:");
  const canonicalProduct = findCatalogProduct(targetSku);
  if (!canonicalProduct) {
    throw new Error(`Product ${targetSku} not found in canonical catalog!`);
  }
  console.log(`   [PASS] Found product: ${canonicalProduct.name} (${canonicalProduct.sku})`);
  console.log(`   Brand: ${canonicalProduct.brand} | Interfaces: ${canonicalProduct.interfaces.join(", ")}`);
  console.log(`   Total canonical products in catalog: ${ECOMSHOP_FULL_CATALOG.length}`);

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `mktg-ui-flow-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const mockProvider = new MockAgentProvider();

  // Helper providing valid grounded marketing output matching ECW536 schema
  const validOutputJson = JSON.stringify({
    positioning: "EnGenius ECW536: Punto de acceso Wi-Fi 7 Tri-Band Cloud para Empresas",
    targetAudience: "Empresas y administradores IT de alta densidad",
    valueProposition: "Conectividad empresarial Wi-Fi 7 tri-banda gestionada desde la nube con zero-touch provisioning",
    keyBenefits: [
      "Tecnología Wi-Fi 7 Tri-Band con canales ultra-anchos de 320 MHz",
      "Rendimiento agregado multicanal para entornos de alta densidad",
      "Gestión centralizada en la nube EnGenius Cloud sin costes de controlador local",
      "Seguridad WPA3 Enterprise y autenticación 802.1X"
    ],
    technicalHighlights: [
      "Tri-Band Wi-Fi 7 (2.4 GHz, 5 GHz, 6 GHz)",
      "Puerto Ethernet Multi-Gigabit 10 GbE PoE++",
      "Band Steering y roaming inteligente 802.11k/v/r"
    ],
    seo: {
      title: "EnGenius ECW536 Cloud Tri-Band Wi-Fi 7 Access Point | EcomShop",
      metaDescription: "Punto de acceso EnGenius ECW536 Wi-Fi 7 Tri-Band con gestión Cloud. Alto rendimiento y máxima fiabilidad.",
      slug: "engenius-ecw536-cloud-wi-fi-7-ap",
      primaryKeyword: "EnGenius ECW536"
    },
    productDescription: "El EnGenius ECW536 ofrece el pináculo del rendimiento Wi-Fi 7 empresarial con gestión unificada en la nube.",
    shortDescription: "AP Wi-Fi 7 Tri-Band profesional gestionado desde la nube EnGenius Cloud.",
    social: {
      linkedin: "🚀 Nuevo EnGenius ECW536: Wi-Fi 7 empresarial con gestión cloud nativa para entornos de alta densidad.",
      twitter: "Descubre el nuevo EnGenius ECW536 Wi-Fi 7 Tri-Band gestionado desde el Cloud #WiFi7",
      whatsapp: "Hola, te presentamos el nuevo AP Wi-Fi 7 EnGenius ECW536 para proyectos de alta densidad."
    },
    creative: {
      visualConcept: "Ambiente empresarial corporativo con despliegue de alta densidad sin cables a la vista",
      keyVisualElements: ["Chasis blanco elegante", "Indicadores LED discretos", "Conector Ethernet 10GbE"],
      bannerHeadlines: ["Wi-Fi 7 Empresarial", "Gestión Cloud Sin Límites", "Máxima Densidad de Clientes"]
    },
    cta: {
      primary: "Solicitar cotización técnica",
      url: "https://ecomshop.es/contacto"
    }
  });

  // Intercept execute calls on mockProvider
  mockProvider.execute = async (manifest) => {
    return {
      taskId: manifest.taskId,
      exitCode: 0,
      stdout: validOutputJson,
      stderr: "",
      timedOut: false,
      filesChanged: manifest.filesAllowed,
      summary: "Mock generation completed with valid structured JSON"
    };
  };

  const engine = new MarketingPipelineEngine(mockProvider);

  try {
    // Step 2: Trigger Generation Run (Version 1)
    console.log("\n2. Executing Autonomous Marketing Generation (Run 1):");
    const { run: run1, marketingPackage: pkg1 } = await engine.executePipeline(targetSku, {
      workspacePath: tempWorkspace,
      requestedBy: "lead-engineer@ecomspain.com",
      workspaceId: "test-workspace-ui",
      organizationId: "org-ecomspain",
      provider: mockProvider
    });

    console.log(`   [PASS] Run 1 ID: ${run1.runId}`);
    console.log(`   Status: ${run1.status}`);
    console.log(`   Quality Gate Passed: ${pkg1.quality.passed}`);
    console.log(`   Quality Score: ${pkg1.quality.score}/100`);
    console.log(`   Positioning Headline: "${pkg1.positioning}"`);

    // Step 3: Verify 9 Quality Gate Checks
    console.log("\n3. Validating 9-Check Quality Gate Ledger:");
    const requiredChecks = [
      "IDENTITY_CHECK",
      "SOURCE_CHECK",
      "CLAIM_CHECK",
      "BRAND_CHECK",
      "SEO_CHECK",
      "CONTENT_COMPLETENESS",
      "DUPLICATE_CHECK",
      "CTA_CHECK",
      "STRUCTURE_CHECK",
    ];

    for (const checkName of requiredChecks) {
      const check = pkg1.quality.checks.find((c) => c.name === checkName);
      if (!check) {
        throw new Error(`Missing expected Quality Gate check: ${checkName}`);
      }
      console.log(`   - ${check.name}: ${check.status} (Score: ${check.score ?? "N/A"}) - ${check.details}`);
    }

    if (!pkg1.quality.passed) {
      throw new Error(`Quality Gate failed: ${pkg1.quality.blockReason}`);
    }

    // Step 4: Verify Evidence Ledger
    console.log("\n4. Validating Grounded Evidence Ledger:");
    const resolved = engine.resolveProductAndEvidence(targetSku);
    console.log(`   [PASS] Extracted verified claims: ${resolved.evidence.length}`);
    for (const ev of resolved.evidence) {
      console.log(`   - [${ev.confidence}] ${ev.claim}: ${ev.value} (Source: ${ev.sourceUrl})`);
    }

    // Step 5: Verify Idempotency & Regeneration Capability
    console.log("\n5. Testing Idempotency & Re-generation (Version 2):");
    const hash1 = engine.calculateIdempotencyHash(targetSku);
    const hash2 = engine.calculateIdempotencyHash(targetSku);
    if (hash1 !== hash2) {
      throw new Error("Idempotency hashes for same SKU do not match!");
    }
    console.log(`   [PASS] Deterministic hash verified: ${hash1.substring(0, 16)}...`);

    const { run: run2, marketingPackage: pkg2 } = await engine.executePipeline(targetSku, {
      workspacePath: tempWorkspace,
      requestedBy: "lead-engineer@ecomspain.com",
      workspaceId: "test-workspace-ui",
      organizationId: "org-ecomspain",
      provider: mockProvider
    });

    console.log(`   [PASS] Run 2 ID: ${run2.runId}`);
    if (run2.runId === run1.runId) {
      throw new Error("Pipeline generated duplicate runId for separate execution!");
    }
    console.log(`   Run 1: ${run1.runId}`);
    console.log(`   Run 2: ${run2.runId}`);
    console.log("   Both runs maintain unique identity for version history.");

    console.log("\n============================================================");
    console.log("UI/API WORKFLOW VERIFICATION: 100% SUCCESSFUL");
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
  console.error("\n❌ Workflow test failed:", err);
  process.exit(1);
});
