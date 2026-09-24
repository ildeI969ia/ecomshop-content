import * as fs from "node:fs";
import * as path from "node:path";
import { getEcomshopOnlyDevices, CatalogProduct } from "../src/lib/data/ecomshop-catalog";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { FirestoreOrchestrationStore } from "../src/server/orchestrator/firestore-store";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";
import { MarketingPackage, MarketingRun } from "../src/server/orchestrator/marketing-types";
import { OrchestrationPlan } from "../src/server/orchestrator/types";

/**
 * Concurrency Pool Helper to run async tasks with a limit of maxConcurrent.
 */
async function asyncPool<T, R>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T, array: T[]) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Promise<any>[] = [];

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

async function run92HomologatedBatch() {
  console.log("============================================================");
  console.log("EXECUTION ENGINE: BATCH PROCESSOR FOR 92 ECOMPAIN HOMOLOGATED SKUs");
  console.log("============================================================\n");

  const catalog92 = getEcomshopOnlyDevices();
  console.log(`[1/5] Loaded ${catalog92.length} EcomSpain homologated devices.`);
  if (catalog92.length !== 92) {
    console.warn(`⚠️ Warning: Expected 92 EcomSpain devices, found ${catalog92.length}`);
  }

  const workspacePath = path.resolve(process.env.TEMP || "C:\\temp", `mktg-92-batch-${Date.now()}`);
  fs.mkdirSync(workspacePath, { recursive: true });

  const firestoreStore = new FirestoreOrchestrationStore();
  const mockProvider = new MockAgentProvider();

  // Configure Provider to produce realistic grounded marketing output per SKU
  mockProvider.execute = async (manifest) => {
    const skuMatch = manifest.taskId.replace("task-mktg-", "").toUpperCase();
    const product = catalog92.find((p) => p.sku.toUpperCase() === skuMatch);

    const validOutputJson = JSON.stringify({
      positioning: `Solución profesional homologada para ${product?.brand || "Brand"} ${product?.name || skuMatch}`,
      targetAudience: "Administradores IT, Integradores B2B y Operadores de Red",
      valueProposition: "Conectividad robusta empresarial, alta disponibilidad y soporte técnico en España",
      keyBenefits: product?.keyAdvantages || [
        "Hardware de calidad industrial",
        "Gestión centralizada y monitoreo continuo",
        "Garantía oficial EcomSpain"
      ],
      technicalHighlights: [
        product?.interfaces ? `Interfaces: ${product.interfaces.join(", ")}` : "Interfaces Gigabit / Multi-Gigabit",
        product?.powerRequirements ? `Alimentación: ${product.powerRequirements}` : "Alimentación PoE / DC"
      ],
      seo: {
        title: `${product?.brand || "Brand"} ${product?.name || skuMatch} | EcomShop`,
        metaDescription: `Ficha técnica oficial y solución comercial B2B para ${product?.name || skuMatch}.`,
        slug: `${(product?.brand || "brand").toLowerCase()}-${skuMatch.toLowerCase()}`,
        primaryKeyword: skuMatch,
        secondaryKeywords: ["networking profesional", "equipamiento b2b", "ecomshop"],
        searchIntent: "Investigación comercial B2B y especificaciones técnicas",
        semanticEntities: [product?.brand || "Brand", skuMatch, product?.deviceType || "Hardware"],
        faqCandidates: [
          { question: "¿Qué garantía incluye?", answer: "Garantía oficial EcomSpain con soporte técnico directo." }
        ],
        internalLinkSuggestions: ["/catalogo", "/soporte-tecnico"]
      },
      productDescription: `Dispositivo profesional ${skuMatch} optimizado para despliegues de alto rendimiento.`,
      shortDescription: `Solución corporativa ${skuMatch} para infraestructuras B2B.`,
      social: {
        linkedin: `🚀 Descubra el nuevo ${skuMatch}: alta fiabilidad y rendimiento para redes corporativas.`,
        twitter: `Optimice su infraestructura con el ${skuMatch}. Disponible en EcomShop. #NetworkingB2B`,
        whatsapp: `Hola, le compartimos detalles y cotización técnica del ${skuMatch}.`
      },
      creative: {
        visualConcept: "Chasis metálico industrial sobre rack corporativo",
        keyVisualElements: ["Indicadores LED", "Puertos Ethernet", "Badge EcomSpain"],
        bannerHeadlines: ["Rendimiento Garantizado", "Conectividad Profesional"]
      },
      cta: {
        primary: "Solicitar cotización B2B",
        secondary: "Descargar ficha técnica",
        url: product?.url || "https://www.ecomshop.es"
      }
    });

    return {
      taskId: manifest.taskId,
      exitCode: 0,
      stdout: validOutputJson,
      stderr: "",
      timedOut: false,
      filesChanged: manifest.filesAllowed,
      summary: `Generación completada para ${manifest.taskId}`
    };
  };

  const engine = new MarketingPipelineEngine(mockProvider);

  console.log(`[2/5] Initializing bounded batch execution (Concurrency limit: 2 workers)...`);

  const results: Array<{
    sku: string;
    brand: string;
    model: string;
    status: "PASS" | "BLOCKED" | "FAILED";
    qualityScore?: number;
    error?: string;
  }> = [];

  const workspaceId = "ws-ecomspain-homologated";
  const batchId = `batch-92-homologated-${Date.now()}`;

  let processedCount = 0;

  // Bounded worker pool processing 2 items at a time
  await asyncPool(2, catalog92, async (product: CatalogProduct) => {
    const sku = product.sku;
    const currentIdx = ++processedCount;
    const logPrefix = `[Worker Pool] [${currentIdx}/${catalog92.length}] SKU: ${sku}`;

    try {
      // 1. Generate marketing package via deterministic or pipeline execution
      const pkg = await MarketingPipelineEngine.generateDeterministicPackage(sku);

      // 2. Build OrchestrationPlan & MarketingRun for Firestore persistence
      const runId = `run-mktg-${sku.toLowerCase()}-${Date.now()}`;

      const run: MarketingRun = {
        runId,
        productId: product.id,
        sku: product.sku,
        status: pkg.quality.passed ? "GENERATED" : "BLOCKED",
        qualityScore: pkg.quality.score,
        stepRecords: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      const plan: OrchestrationPlan = {
        runId,
        id: runId,
        taskId: `task-mktg-${sku.toLowerCase()}`,
        sku: product.sku,
        status: pkg.quality.passed ? "COMPLETED" : "BLOCKED",
        tasks: [
          {
            id: `task-gen-${sku.toLowerCase()}`,
            name: `Generate Marketing Package for ${sku}`,
            status: pkg.quality.passed ? "COMPLETED" : "BLOCKED",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          }
        ],
        artifacts: [
          {
            id: pkg.packageId,
            type: "MARKETING_PACKAGE",
            path: `/artifacts/marketing/${sku.toLowerCase()}.json`,
            createdAt: new Date().toISOString()
          }
        ]
      };

      // 3. Persist transactionally in Firestore (`orchestrationRuns`)
      await firestoreStore.save(plan, workspaceId);

      const status = pkg.quality.passed ? "PASS" : "BLOCKED";
      results.push({
        sku,
        brand: product.brand,
        model: product.model,
        status,
        qualityScore: pkg.quality.score
      });

      console.log(`${logPrefix} -> ${status} (Score: ${pkg.quality.score}/100)`);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isBlocked = errMsg.includes("QUALITY_GATE_BLOCKED") || errMsg.includes("PRODUCT_NOT_IN_CANONICAL_CATALOG");
      const status = isBlocked ? "BLOCKED" : "FAILED";

      results.push({
        sku,
        brand: product.brand,
        model: product.model,
        status,
        error: errMsg
      });

      console.error(`${logPrefix} -> ${status} (Error: ${errMsg})`);
    }
  });

  console.log("\n============================================================");
  console.log("EXECUTIVE BATCH SUMMARY (92 HOMOLOGATED SKUS)");
  console.log("============================================================\n");

  const total = results.length;
  const passCount = results.filter((r) => r.status === "PASS").length;
  const blockedCount = results.filter((r) => r.status === "BLOCKED").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  console.log(`Total SKUs Processed : ${total}`);
  console.log(`Passed (PASS)        : ${passCount} (${((passCount / total) * 100).toFixed(1)}%)`);
  console.log(`Blocked (BLOCKED)    : ${blockedCount}`);
  console.log(`Failed (FAILED)      : ${failedCount}\n`);

  console.log("| SKU | Brand | Model | Status | Quality Score | Error / Note |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    console.log(
      `| ${r.sku} | ${r.brand} | ${r.model} | ${r.status} | ${r.qualityScore ?? "N/A"} | ${r.error || "OK"} |`
    );
  }

  if (failedCount > 0) {
    throw new Error(`Batch execution finished with ${failedCount} unexpected errors.`);
  }

  console.log("\n✅ Batch execution and Firestore persistence successfully completed.");
}

run92HomologatedBatch().catch((err) => {
  console.error("❌ Fatal Error in Batch Processor:", err);
  process.exit(1);
});
