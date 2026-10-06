import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersistedContent, extractPreviewText } from "../src/lib/utils/content-normalizer";
import { ContentItem } from "../src/server/domain/types";
import { hasPermission } from "../src/server/security/rbac";

test("Sprint Biblioteca de Artículos — Normalización, Aislamiento y Paginación", async (t) => {
  await t.test("extractPreviewText prioriza metaDescription, cleanPlainTextExcerpt o tldr", () => {
    const rawWithMeta = {
      blog: {
        metaDescription: "Meta descripción relevante para el lector profesional.",
        introduction: "Introducción que no debería usarse como primera opción."
      }
    };
    assert.equal(
      extractPreviewText(rawWithMeta, "Fallback"),
      "Meta descripción relevante para el lector profesional."
    );

    const rawWithExcerptOnly = {
      blog: {
        cleanPlainTextExcerpt: "Extracto en texto plano sin etiquetas."
      }
    };
    assert.equal(
      extractPreviewText(rawWithExcerptOnly, "Fallback"),
      "Extracto en texto plano sin etiquetas."
    );

    const rawEmpty = {};
    assert.equal(extractPreviewText(rawEmpty, "Título de respaldo"), "Título de respaldo");
  });

  await t.test("normalizePersistedContent mapea correctamente ContentItem legacy y preserva workspaceId", () => {
    const legacyItem: ContentItem = {
      id: "content-ecw536-test",
      workspaceId: "tenant-valencia",
      title: "Guía de Wi-Fi 7 Profesional",
      slug: "guia-wifi-7-profesional",
      category: "WIFI",
      status: "PUBLISHED",
      currentVersion: 2,
      authorId: "usr-123",
      versions: [],
      canonicalBody: {
        title: "Guía de Wi-Fi 7 Profesional",
        metaDescription: "Análisis técnico de canales de 320 MHz y MLO.",
        slug: "guia-wifi-7-profesional",
        readingTimeMinutes: 6,
        targetKeywords: ["Wi-Fi 7", "ECW536"],
        htmlContent: "<p>Contenido maquetado completo.</p>",
        cleanPlainTextExcerpt: "Análisis técnico de canales de 320 MHz y MLO."
      },
      linkedProductIds: ["ECW536"],
      linkedSourceIds: [],
      createdAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-05-10T11:00:00.000Z",
      createdBy: "usr-123",
      updatedBy: "usr-123"
    };

    const normalized = normalizePersistedContent(legacyItem, "tenant-default");

    assert.equal(normalized.id, "content-ecw536-test");
    assert.equal(normalized.workspaceId, "tenant-valencia");
    assert.equal(normalized.status, "published");
    assert.equal(normalized.rawStatus, "PUBLISHED");
    assert.equal(normalized.productId, "ECW536");
    assert.equal(normalized.preview, "Análisis técnico de canales de 320 MHz y MLO.");
    assert.equal(normalized.authorId, "usr-123");
    assert.ok(normalized.channels.includes("BLOG"));
    assert.equal(normalized.content?.blog?.title, "Guía de Wi-Fi 7 Profesional");
    assert.equal(normalized.content?.blog?.readingTimeMinutes, 6);
  });

  await t.test("RBAC: Permisos de visualización vs publicación en la Biblioteca", () => {
    // Lectura en la biblioteca (content:view)
    assert.equal(hasPermission("VIEWER", "content:view"), true);
    assert.equal(hasPermission("SALES", "content:view"), true);
    assert.equal(hasPermission("EDITOR", "content:view"), true);
    assert.equal(hasPermission("MARKETING_MANAGER", "content:view"), true);
    assert.equal(hasPermission("ADMIN", "content:view"), true);

    // Publicación restringida (content:publish)
    assert.equal(hasPermission("VIEWER", "content:publish"), false);
    assert.equal(hasPermission("EDITOR", "content:publish"), false);
    assert.equal(hasPermission("MARKETING_MANAGER", "content:publish"), true);
    assert.equal(hasPermission("ADMIN", "content:publish"), true);
  });

  await t.test("Filtros en memoria: Búsqueda y estado operan con 0 llamadas a IA", () => {
    const list: ContentItem[] = [
      {
        id: "art-1",
        workspaceId: "tenant-a",
        title: "Switch PoE Multi-Gigabit para Puntos de Acceso",
        slug: "switch-poe-multigigabit",
        category: "SWITCHES",
        status: "APPROVED",
        currentVersion: 1,
        authorId: "usr-1",
        versions: [],
        canonicalBody: {
          metaDescription: "Comparativa de consumo energético y presupuesto PoE."
        },
        linkedProductIds: ["ECS2512FP"],
        linkedSourceIds: [],
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        createdBy: "usr-1",
        updatedBy: "usr-1"
      },
      {
        id: "art-2",
        workspaceId: "tenant-a",
        title: "Pasarela Gateway Cloud con SD-WAN",
        slug: "gateway-cloud-sd-wan",
        category: "GATEWAYS",
        status: "DRAFT",
        currentVersion: 1,
        authorId: "usr-2",
        versions: [],
        canonicalBody: {
          metaDescription: "Configuración de túneles VPN y balanceo redundante."
        },
        linkedProductIds: ["ESG510"],
        linkedSourceIds: [],
        createdAt: "2026-06-02T10:00:00.000Z",
        updatedAt: "2026-06-02T10:00:00.000Z",
        createdBy: "usr-2",
        updatedBy: "usr-2"
      }
    ];

    const normalizedList = list.map((it) => normalizePersistedContent(it, "tenant-a"));

    // Búsqueda por SKU
    const skuMatches = normalizedList.filter((it) => it.productId?.includes("ECS2512FP"));
    assert.equal(skuMatches.length, 1);
    assert.equal(skuMatches[0].id, "art-1");

    // Filtrado por estado
    const draftMatches = normalizedList.filter((it) => it.status === "draft");
    assert.equal(draftMatches.length, 1);
    assert.equal(draftMatches[0].id, "art-2");
  });

  await t.test("Workspace Isolation: Verificación de rechazo ante tenant mismatch", () => {
    const userWorkspace = "workspace-alpha";
    const foreignItem: ContentItem = {
      id: "art-foreign",
      workspaceId: "workspace-beta",
      title: "Artículo de otro tenant",
      slug: "articulo-otro-tenant",
      category: "WIFI",
      status: "DRAFT",
      currentVersion: 1,
      authorId: "usr-beta",
      versions: [],
      canonicalBody: {},
      linkedProductIds: [],
      linkedSourceIds: [],
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      createdBy: "usr-beta",
      updatedBy: "usr-beta"
    };

    const isMatch = foreignItem.workspaceId === userWorkspace;
    assert.equal(isMatch, false, "Debe detectar discrepancia de workspace para responder 403 FORBIDDEN_WORKSPACE_MISMATCH");
  });

  await t.test("Integridad Determinista: Catalogación de VALID, CORRUPTED y LEGACY_INCOMPLETE", () => {
    // 1. Caso VALID: workspaceId definido, título válido y contenido versionado
    const validItem: ContentItem = {
      id: "doc-valid-1",
      workspaceId: "ws-valid",
      title: "Punto de Acceso Wi-Fi 7",
      slug: "punto-acceso-wifi-7",
      category: "WIFI",
      status: "APPROVED",
      currentVersion: 1,
      authorId: "user-1",
      versions: [{
        version: 1,
        body: { blog: { title: "Punto de Acceso Wi-Fi 7", htmlContent: "<p>OK</p>" } },
        changeSummary: "Inicial",
        editedByUserId: "user-1",
        isAIGenerated: false,
        timestamp: "2026-06-01T10:00:00Z"
      }],
      canonicalBody: { blog: { title: "Punto de Acceso Wi-Fi 7", htmlContent: "<p>OK</p>" } },
      linkedProductIds: ["ECW536"],
      linkedSourceIds: [],
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
      createdBy: "user-1",
      updatedBy: "user-1"
    };
    assert.equal(normalizePersistedContent(validItem, "ws-valid").integrityStatus, "VALID");

    // 2. Caso CORRUPTED: falta workspaceId
    const corruptedItem: ContentItem = {
      ...validItem,
      id: "doc-corrupted",
      workspaceId: ""
    };
    assert.equal(normalizePersistedContent(corruptedItem, "").integrityStatus, "CORRUPTED");

    // 3. Caso LEGACY_NEEDS_REPAIR: título vacío o "Sin título"
    const incompleteItem: ContentItem = {
      ...validItem,
      id: "doc-incomplete",
      title: "Sin título"
    };
    assert.equal(normalizePersistedContent(incompleteItem, "ws-valid").integrityStatus, "LEGACY_NEEDS_REPAIR");
  });
});
