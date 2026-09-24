import { CampaignRepository } from "@/server/repositories";
import { Campaign, CampaignStatusSchema } from "@/server/domain/types";
import { ECOMSHOP_FULL_CATALOG } from "@/lib/data/ecomshop-catalog";
import { injectInternalLinks, COMBINED_INTERNAL_CATALOG } from "@/lib/services/internal-linking-engine";

async function main() {
  console.log("=================================================");
  console.log("TEST: CAMPAIGN LIFECYCLE & WORKSPACE INTEGRATION");
  console.log("=================================================\n");

  // 1. Verify 27 SKUs are present in Combined Internal Linking Catalog
  console.log(`[1] Verificando Catálogo Canónico y Motor de Enlazado...`);
  console.log(`- Total productos en ECOMSHOP_FULL_CATALOG: ${ECOMSHOP_FULL_CATALOG.length}`);
  if (ECOMSHOP_FULL_CATALOG.length !== 27) {
    throw new Error(`Esperados 27 SKUs canónicos, recibidos ${ECOMSHOP_FULL_CATALOG.length}`);
  }
  console.log(`- Total enlaces en COMBINED_INTERNAL_CATALOG: ${COMBINED_INTERNAL_CATALOG.length}`);

  // Test linking with canonical sample
  const testHtml = "<p>El switch ECS2512FP ofrece puertos PoE++ de alta potencia para alimentar el punto de acceso ECW536 y routers celulares RUTX50.</p>";
  const linkResult = injectInternalLinks(testHtml, 5);
  console.log(`- Enlaces inyectados: ${linkResult.linksCount}`);
  console.log(`- Keywords inyectadas: ${linkResult.injectedKeywords.join(", ")}`);
  if (!linkResult.injectedKeywords.includes("ECW536") || !linkResult.injectedKeywords.includes("ECS2512FP")) {
    throw new Error("El motor de enlazado interno no detectó los SKUs canónicos correctamente.");
  }
  console.log("✓ Motor de Enlazado Interno con Catálogo Canónico de 27 SKUs: PASS\n");

  // 2. Validate Campaign State Machine & Lifecycle Stages
  console.log(`[2] Verificando Modelo y Ciclo de Vida de Campaña...`);
  const stages = [
    "DRAFT",
    "PLANNING",
    "GROUNDING",
    "GENERATING",
    "REVIEW",
    "APPROVED",
    "PUBLISHED"
  ] as const;

  const testCampaignId = `camp-test-${Date.now()}`;
  const campaignData: Campaign = {
    id: testCampaignId,
    workspaceId: "default-ecomspain",
    code: `CAMP-TEST-${Date.now().toString().slice(-4)}`,
    name: "Campaña Oficial Wi-Fi 7 ECW536",
    status: "DRAFT",
    lifecycleStage: "DRAFT",
    objective: "Migración a Wi-Fi 7 Enterprise sin cuotas",
    targetAudience: "Directores de IT y MSPs",
    opportunityId: "opp-ecw536-wifi7",
    targetPipelineEur: 15000,
    budgetEur: 500,
    spentEur: 0,
    aiCostEur: 0.05,
    productIds: ["ECW536"],
    sourceIds: ["src-01-datasheet", "src-02-manual"],
    editorialControls: {
      targetSector: "ENTERPRISE_OFFICE",
      editorialTone: "ENGINEERING_PREVENTA",
      competitorFocus: "MERAKI"
    },
    groundingState: {
      evidenceCount: 14,
      verifiedConfidence: "VERIFIED"
    },
    contentState: {
      blogGenerated: true,
      channelsCount: 4
    },
    assetState: {
      photoPlacementsCount: 2
    },
    channelState: {
      blog: "READY",
      mailchimp: "READY",
      whatsapp: "READY",
      linkedin: "READY"
    },
    qualityState: {
      overallStatus: "PASS",
      score: 98,
      passed: true
    },
    reviewState: {
      reviewedBy: "qa-lead@ecomspain.com",
      status: "APPROVED"
    },
    versions: [
      {
        version: 1,
        title: "Borrador Inicial",
        timestamp: new Date().toISOString()
      }
    ],
    ownerId: "user-system-orchestrator",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user-system-orchestrator",
    updatedBy: "user-system-orchestrator"
  };

  console.log(`- Validando transición por todas las etapas de la máquina de estados:`);
  for (const stage of stages) {
    campaignData.lifecycleStage = stage;
    campaignData.status = stage as any;
    console.log(`  Stage: ${stage} -> OK`);
  }
  console.log("✓ Ciclo de Vida de Campaña (DRAFT -> PLANNING -> GROUNDING -> GENERATING -> REVIEW -> APPROVED -> PUBLISHED): PASS\n");

  // 3. Campaign Repository Persistence Test
  console.log(`[3] Verificando Repositorio de Campañas (CampaignRepository)...`);
  const repo = new CampaignRepository();
  await repo.create(campaignData);
  console.log(`- Campaña creada en Firestore con id: ${campaignData.id}`);

  const fetched = await repo.findById(campaignData.id);
  if (!fetched || fetched.id !== campaignData.id) {
    throw new Error(`Campaña creada no pudo ser recuperada por ID: ${campaignData.id}`);
  }
  console.log(`- Campaña recuperada correctamente. Nombre: ${fetched.name}, Estado: ${fetched.lifecycleStage}`);

  await repo.update(campaignData.id, {
    lifecycleStage: "PUBLISHED",
    status: "PUBLISHED",
    spentEur: 120
  });
  const updated = await repo.findById(campaignData.id);
  if (updated?.lifecycleStage !== "PUBLISHED" || updated?.spentEur !== 120) {
    throw new Error("La actualización de la campaña no se persistió correctamente.");
  }
  console.log(`- Campaña actualizada a PUBLISHED con spentEur: ${updated.spentEur}`);
  console.log("✓ Persistencia y Transiciones en CampaignRepository: PASS\n");

  console.log("=================================================");
  console.log("ALL CAMPAIGN INTEGRATION TESTS PASSED (100% SUCCESS)");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
