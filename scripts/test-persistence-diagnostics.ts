/**
 * F0 — Tests de la clasificación de assets (funciones PURAS, sin credenciales).
 *
 * Codifican como regresión el caso real del incidente: los 12 assets legacy de
 * Firestore con `publicUrl: ""` y `storagePath: "generated/asset-..."`.
 *
 * Ejecución: npx tsx scripts/test-persistence-diagnostics.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyAssetUrl,
  summarizeAssetHealth,
  GALLERY_DISCARD_POINT,
  PLACEHOLDER_STORAGE_PREFIX,
} from "../src/server/services/persistence-diagnostics.ts";

describe("F0 — Clasificación de assets (funciones puras)", () => {
  it("detecta el caso real de los assets legacy (publicUrl vacío)", () => {
    // Forma EXACTA de los 12 documentos encontrados en la colección assets
    const legacy = {
      id: "asset-1790075065929-g87f7",
      storagePath: "generated/asset-1790075065929-g87f7",
      publicUrl: "",
      sizeBytes: 22239590,
    };

    assert.equal(classifyAssetUrl(legacy), "MISSING_URL");

    const summary = summarizeAssetHealth([legacy, legacy, legacy], 2);
    assert.equal(summary.withUrl, 0);
    assert.equal(summary.withoutUrl, 3);
    assert.equal(summary.classified.MISSING_URL, 3);
    assert.equal(summary.samples.length, 2, "respeta el número máximo de muestras");
    assert.equal(summary.samples[0].health, "MISSING_URL");
  });

  it("marca como ficticia la ruta generated/ aunque el asset tenga URL", () => {
    const asset = {
      publicUrl: "https://storage.googleapis.com/ecomshop-marketing-assets/generated/x.jpg",
      storagePath: "generated/x.jpg",
    };
    assert.equal(classifyAssetUrl(asset), "PLACEHOLDER_STORAGE_PATH");
  });

  it("detecta data URLs persistidos en Firestore", () => {
    const asset = { publicUrl: "data:image/png;base64,AAAA", storagePath: "generated/x" };
    assert.equal(classifyAssetUrl(asset), "DATA_URL_IN_FIRESTORE");
    assert.notEqual(
      classifyAssetUrl({ publicUrl: "data:image/png;base64,AAAA", storagePath: "generated/x" }),
      "OK"
    );
  });

  it("considera OK un asset con URL y storagePath reales", () => {
    const asset = {
      id: "asset-fixed-1",
      publicUrl:
        "https://storage.googleapis.com/ecomshop-marketing-assets/workspaces/default-ecomspain/assets/a.jpg",
      storagePath: "workspaces/default-ecomspain/assets/a.jpg",
      sizeBytes: 220000,
    };

    assert.equal(classifyAssetUrl(asset), "OK");
    const summary = summarizeAssetHealth([asset]);
    assert.equal(summary.withUrl, 1);
    assert.equal(summary.withoutUrl, 0);
    assert.equal(summary.samples.length, 0);
  });

  it("trata metadatos incompletos como no servibles (nunca como OK)", () => {
    assert.equal(classifyAssetUrl({}), "MISSING_URL");
    assert.equal(classifyAssetUrl({ publicUrl: "   ", storagePath: "  " }), "MISSING_URL");
    assert.equal(classifyAssetUrl({ publicUrl: "https://x/y.jpg", storagePath: "" }), "PLACEHOLDER_STORAGE_PATH");
  });

  it("expone el punto exacto de descarte de la galería", () => {
    assert.ok(GALLERY_DISCARD_POINT.includes("page.tsx"));
    assert.equal(PLACEHOLDER_STORAGE_PREFIX, "generated/");
  });
});
