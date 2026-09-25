import assert from "node:assert";
import { ContentRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";
import { UtmClickRepository } from "@/server/repositories/utm-click-repository";

async function runTest() {
  console.log("▶ Fase 6g — Pruebas de Historial Sin Duplicados & Aprendizaje por UTM");

  const repo = new ContentRepository();
  const testSlug = `test-no-duplicate-slug-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // 1. Crear el primer borrador para el slug
  const firstDraft: ContentItem = {
    id: `content-${testSlug}-v1`,
    workspaceId: "test-workspace",
    title: "Switch Multi-Gigabit de Prueba",
    slug: testSlug,
    category: "switches",
    status: "DRAFT",
    currentVersion: 1,
    authorId: "test-user",
    versions: [
      {
        version: 1,
        body: { topicId: testSlug, topicTitle: "Switch Multi-Gigabit" } as any,
        changeSummary: "Creación inicial",
        editedByUserId: "test-user",
        isAIGenerated: true,
        timestamp: nowIso
      }
    ],
    canonicalBody: { topicId: testSlug } as any,
    linkedProductIds: ["ECS2512FP"],
    linkedSourceIds: ["src-8"],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: "test-user",
    updatedBy: "test-user"
  };

  const savedFirst = await repo.upsertBySlug(firstDraft);
  assert.strictEqual(savedFirst.slug, testSlug, "El slug debe ser el mismo");
  assert.strictEqual(savedFirst.currentVersion, 1, "La versión inicial debe ser 1");

  console.log(`  ✔ Primer borrador guardado correctamente con ID="${savedFirst.id}" y versión 1`);

  // 2. Simular una SEGUNDA edición para el MISMO slug
  const secondDraft: ContentItem = {
    ...firstDraft,
    id: `content-${testSlug}-v2-duplicate-attempt`,
    title: "Switch Multi-Gigabit de Prueba (Editado)",
    updatedBy: "test-user-2"
  };

  const savedSecond = await repo.upsertBySlug(secondDraft);

  // Verificación 1: Debe actualizar el documento existente en lugar de crear uno nuevo
  assert.strictEqual(savedSecond.id, savedFirst.id, "Debe conservar el ID único del documento existente en lugar de crear uno nuevo");
  assert.strictEqual(savedSecond.currentVersion, 2, "La versión del documento actualizado debe incrementarse a 2");
  assert.strictEqual(savedSecond.versions.length, 2, "El array de versiones debe registrar 2 iteraciones sin duplicar el documento");
  assert.strictEqual(savedSecond.title, "Switch Multi-Gigabit de Prueba (Editado)", "El título del documento debe ser el editado");

  console.log(`  ✔ Segunda edición sobre el mismo slug no creó duplicado (conservó ID="${savedSecond.id}", incrementó a versión 2)`);

  // 3. Verificación de fechas corruptas del año 2001
  const corruptedDateDraft: ContentItem = {
    ...firstDraft,
    slug: `test-corrupted-date-${Date.now()}`,
    createdAt: "2001-01-01T00:00:00.000Z",
    updatedAt: "2001-01-01T00:00:00.000Z"
  };

  const fixedDateItem = await repo.upsertBySlug(corruptedDateDraft);
  assert.strictEqual(fixedDateItem.createdAt.startsWith("2001"), false, "La fecha del año 2001 debe ser corregida a la fecha actual");

  console.log("  ✔ Fechas anómalas del año 2001 corregidas a marcas temporales actuales válidas");

  // 4. Verificación de Clics por UTM
  const utmRepo = new UtmClickRepository();
  await utmRepo.recordClick({
    id: `click-test-${Date.now()}`,
    channel: "whatsapp",
    pieceId: "piece-ecw536",
    slug: testSlug,
    utmSource: "whatsapp",
    utmMedium: "broadcast",
    timestamp: new Date().toISOString()
  });

  const topPieces = await utmRepo.getTopPerformingPieces("whatsapp", 3);
  assert.ok(Array.isArray(topPieces), "Debe retornar un array con las piezas top");
  console.log("  ✔ Registro de clics por UTM y consulta de piezas con mejor rendimiento funcional");

  console.log("✔ Fase 6g — Pruebas de historial sin duplicados completadas con éxito.");
}

runTest().catch((err) => {
  console.error("❌ Error en prueba 6g:", err);
  process.exit(1);
});
