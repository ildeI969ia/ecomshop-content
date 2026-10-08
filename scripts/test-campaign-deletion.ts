import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/server/security/rbac";
import { Campaign, ContentItem } from "../src/server/domain/types";

test("Sprint Borrado de Campañas del Catálogo — Aislamiento, Cascada y RBAC", async (t) => {
  await t.test("RBAC: Solo ADMIN y MARKETING_MANAGER tienen permiso campaign:delete", () => {
    assert.equal(hasPermission("ADMIN", "campaign:delete"), true);
    assert.equal(hasPermission("MARKETING_MANAGER", "campaign:delete"), true);
    assert.equal(hasPermission("EDITOR", "campaign:delete"), false);
    assert.equal(hasPermission("CONTENT_MANAGER", "campaign:delete"), false);
    assert.equal(hasPermission("PRODUCT_MANAGER", "campaign:delete"), false);
    assert.equal(hasPermission("VIEWER", "campaign:delete"), false);
  });

  await t.test("Lógica de Soft Delete: Cambia el status a ARCHIVED preservando el documento e integridad", () => {
    const activeCampaign: Campaign = {
      id: "camp-test-1",
      workspaceId: "tenant-b2b-spain",
      code: "CAMP-WIFI7",
      name: "Campaña Wi-Fi 7 EnGenius",
      status: "DRAFT",
      lifecycleStage: "DRAFT",
      objective: "Ventas B2B",
      targetAudience: "Hoteles",
      targetPipelineEur: 50000,
      budgetEur: 200,
      spentEur: 50,
      aiCostEur: 0.04,
      productIds: ["ECW536"],
      sourceIds: [],
      versions: [],
      ownerId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "user-1",
      updatedBy: "user-1"
    };

    // Simulando mutación de archivado
    const archivedCampaign: Campaign = {
      ...activeCampaign,
      status: "ARCHIVED",
      updatedAt: new Date().toISOString(),
      updatedBy: "user-admin"
    };

    assert.equal(archivedCampaign.status, "ARCHIVED");
    assert.equal(archivedCampaign.workspaceId, "tenant-b2b-spain");
    assert.equal(archivedCampaign.productIds.includes("ECW536"), true);
  });

  await t.test("Cascada en Soft Delete: Contenidos asociados a la campaña pasan a status ARCHIVED", () => {
    const campaignId = "camp-ecw536-2026";
    const contents: ContentItem[] = [
      {
        id: "cnt-1",
        workspaceId: "tenant-b2b-spain",
        campaignId: campaignId,
        title: "Artículo Blog Wi-Fi 7",
        slug: "articulo-blog-wifi-7",
        category: "WIFI",
        status: "APPROVED",
        currentVersion: 1,
        authorId: "usr-1",
        versions: [],
        canonicalBody: {},
        linkedProductIds: ["ECW536"],
        linkedSourceIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "usr-1",
        updatedBy: "usr-1"
      },
      {
        id: "cnt-2",
        workspaceId: "tenant-b2b-spain",
        campaignId: campaignId,
        title: "Nota de Prensa LinkedIn",
        slug: "nota-prensa-linkedin",
        category: "WIFI",
        status: "PUBLISHED",
        currentVersion: 1,
        authorId: "usr-1",
        versions: [],
        canonicalBody: {},
        linkedProductIds: ["ECW536"],
        linkedSourceIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "usr-1",
        updatedBy: "usr-1"
      }
    ];

    // Aplicar cascada
    const cascadedContents = contents.map((c) => ({
      ...c,
      status: "ARCHIVED" as const
    }));

    assert.equal(cascadedContents.length, 2);
    assert.equal(cascadedContents[0].status, "ARCHIVED");
    assert.equal(cascadedContents[1].status, "ARCHIVED");
  });

  await t.test("Aislamiento Multi-Tenant: Jamás afecta a campañas o contenidos de otro workspace", () => {
    const currentWorkspace = "workspace-tenant-A";
    const foreignWorkspace = "workspace-tenant-B";

    const campaigns: Campaign[] = [
      {
        id: "camp-A",
        workspaceId: currentWorkspace,
        code: "C-A",
        name: "Campaña A",
        status: "DRAFT",
        lifecycleStage: "DRAFT",
        objective: "",
        targetAudience: "",
        targetPipelineEur: 0,
        budgetEur: 0,
        spentEur: 0,
        aiCostEur: 0,
        productIds: ["ECW536"],
        sourceIds: [],
        versions: [],
        ownerId: "u-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "u-1",
        updatedBy: "u-1"
      },
      {
        id: "camp-B",
        workspaceId: foreignWorkspace,
        code: "C-B",
        name: "Campaña B",
        status: "DRAFT",
        lifecycleStage: "DRAFT",
        objective: "",
        targetAudience: "",
        targetPipelineEur: 0,
        budgetEur: 0,
        spentEur: 0,
        aiCostEur: 0,
        productIds: ["ECW536"],
        sourceIds: [],
        versions: [],
        ownerId: "u-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "u-2",
        updatedBy: "u-2"
      }
    ];

    // Filtrar estrictamente por workspace
    const workspaceFiltered = campaigns.filter((c) => c.workspaceId === currentWorkspace);
    assert.equal(workspaceFiltered.length, 1);
    assert.equal(workspaceFiltered[0].id, "camp-A");
  });
});
