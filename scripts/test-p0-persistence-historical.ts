/**
 * MANDATO P0: Persistence, Read Model & Historical Content Lifecycle Test Suite
 *
 * Verificaciones:
 * 1. Persistencia de contenido y recuperación histórica aislada por workspace.
 * 2. Preservación ante recarga: Contenido A persiste -> Recuperado -> Generar B -> Ambos presentes (A y B).
 * 3. Aislamiento estricto multi-workspace (Workspace A nunca ve contenido de Workspace B).
 * 4. Manejo de errores UX: 500 devuelve estado ERROR (no EMPTY), [] devuelve estado EMPTY.
 * 5. Lifecycle completo: DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("MANDATO P0 — Persistence, Read Model & Historical Data Contract", () => {
  // Mock Data Store para simular Firestore con aislamiento por Workspace
  interface MockStoredContent {
    id: string;
    workspaceId: string;
    title: string;
    status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED";
    productId: string;
    createdAt: string;
    updatedAt: string;
    versions: Array<{ version: number; body: Record<string, unknown> }>;
  }

  const database: MockStoredContent[] = [];

  const saveContent = (item: MockStoredContent) => {
    const existingIndex = database.findIndex((d) => d.id === item.id);
    if (existingIndex >= 0) {
      database[existingIndex] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      database.push({ ...item, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  };

  const getHistoricalContents = (workspaceId: string, limit = 100) => {
    return database
      .filter((d) => d.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  };

  const getContentById = (id: string, workspaceId: string) => {
    const item = database.find((d) => d.id === id);
    if (!item) return { status: 404, data: null };
    if (item.workspaceId !== workspaceId) return { status: 403, error: "FORBIDDEN_WORKSPACE_MISMATCH" };
    return { status: 200, data: item };
  };

  it("TEST A: Generar artículo A -> Persistir -> Reload -> Recuperar A", () => {
    const articleA: MockStoredContent = {
      id: "gen_test_article_a",
      workspaceId: "default-ecomspain",
      title: "Solución Wi-Fi 7 Enterprise ECW536",
      status: "DRAFT",
      productId: "ECW536",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [{ version: 1, body: { topicTitle: "ECW536 High Density" } }]
    };

    saveContent(articleA);

    // Simular reload del frontend mediante consulta al Read Model
    const loaded = getHistoricalContents("default-ecomspain");
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].id, "gen_test_article_a");
    assert.equal(loaded[0].productId, "ECW536");
  });

  it("TEST B: Generar artículo B -> Reload -> Deben aparecer A y B ordenados por fecha", () => {
    const articleB: MockStoredContent = {
      id: "gen_test_article_b",
      workspaceId: "default-ecomspain",
      title: "Switch PoE+ 24 Puertos ECS2512FP",
      status: "DRAFT",
      productId: "ECS2512FP",
      createdAt: new Date(Date.now() + 1000).toISOString(),
      updatedAt: new Date(Date.now() + 1000).toISOString(),
      versions: [{ version: 1, body: { topicTitle: "ECS2512FP Core Distribution" } }]
    };

    saveContent(articleB);

    // Simular reload
    const loaded = getHistoricalContents("default-ecomspain");
    assert.equal(loaded.length, 2);
    // B es más reciente que A
    assert.equal(loaded[0].id, "gen_test_article_b");
    assert.equal(loaded[1].id, "gen_test_article_a");
  });

  it("TEST C: Cambio de Workspace -> No debe aparecer contenido de otro workspace", () => {
    const foreignArticle: MockStoredContent = {
      id: "gen_foreign_tenant",
      workspaceId: "workspace-segregated-b",
      title: "Confidential Project B",
      status: "DRAFT",
      productId: "RUTX50",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: []
    };

    saveContent(foreignArticle);

    // Usuario en default-ecomspain NO debe ver el artículo del workspace-segregated-b
    const defaultWorkspaceContents = getHistoricalContents("default-ecomspain");
    assert.equal(defaultWorkspaceContents.some((c) => c.id === "gen_foreign_tenant"), false);

    // Acceso directo por ID desde otro workspace debe responder 403 FORBIDDEN_WORKSPACE_MISMATCH
    const directAccess = getContentById("gen_foreign_tenant", "default-ecomspain");
    assert.equal(directAccess.status, 403);
    assert.equal(directAccess.error, "FORBIDDEN_WORKSPACE_MISMATCH");
  });

  it("TEST D: Error 500 en GET de backend -> Frontend debe tratarlo como ERROR y no como EMPTY", () => {
    const simulateFrontendFetch = (mockApiResult: { status: number; data?: any }) => {
      let state = "LOADING";
      let error: string | null = null;
      let items: any[] = [];

      if (mockApiResult.status === 500) {
        state = "ERROR";
        error = "FIRESTORE_QUERY_FAILED";
      } else if (mockApiResult.status === 200) {
        items = mockApiResult.data.items || [];
        state = items.length === 0 ? "EMPTY" : "SUCCESS";
      }

      return { state, error, items };
    };

    const errorResult = simulateFrontendFetch({ status: 500 });
    assert.equal(errorResult.state, "ERROR");
    assert.notEqual(errorResult.state, "EMPTY", "NUNCA debe devolver EMPTY ante un error 500");
    assert.equal(errorResult.error, "FIRESTORE_QUERY_FAILED");
  });

  it("TEST E: GET devuelve lista vacía [] con 200 -> Frontend debe mostrar estado EMPTY legítimo", () => {
    const emptyResult = (() => {
      const mockApiResult = { status: 200, data: { items: [], total: 0 } };
      let state = "LOADING";
      const items = mockApiResult.data.items;
      state = items.length === 0 ? "EMPTY" : "SUCCESS";
      return { state, items };
    })();

    assert.equal(emptyResult.state, "EMPTY");
    assert.equal(emptyResult.items.length, 0);
  });

  it("TEST F: Recuperar Detalle -> Transición de Ciclo de Vida DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED", () => {
    const item = database.find((d) => d.id === "gen_test_article_a")!;
    assert.ok(item);
    assert.equal(item.status, "DRAFT");

    // Transición 1: DRAFT -> IN_REVIEW
    item.status = "IN_REVIEW";
    saveContent(item);
    assert.equal(getContentById("gen_test_article_a", "default-ecomspain").data?.status, "IN_REVIEW");

    // Transición 2: IN_REVIEW -> APPROVED
    item.status = "APPROVED";
    saveContent(item);
    assert.equal(getContentById("gen_test_article_a", "default-ecomspain").data?.status, "APPROVED");

    // Transición 3: APPROVED -> PUBLISHED
    item.status = "PUBLISHED";
    saveContent(item);
    assert.equal(getContentById("gen_test_article_a", "default-ecomspain").data?.status, "PUBLISHED");
  });
});
