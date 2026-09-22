import { getAdminFirestore } from "../src/server/config/firebase.ts";
import { ContentItem } from "../src/server/domain/types.ts";

async function cleanupDuplicateContents() {
  console.log("==================================================");
  console.log("🔍 INICIANDO AUDITORÍA Y LIMPIEZA DE DUPLICADOS");
  console.log("==================================================");

  const db = getAdminFirestore();
  const snapshot = await db.collection("contents").get();
  console.log(`📦 Documentos totales encontrados en Firestore (contents): ${snapshot.docs.length}`);

  if (snapshot.docs.length === 0) {
    console.log("✅ No hay documentos en la colección 'contents'. Nada que limpiar.");
    return;
  }

  const items: Array<{ id: string; data: ContentItem }> = snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as ContentItem
  }));

  // Agrupar por clave canónica (slug o título normalizado)
  const groups = new Map<string, Array<{ id: string; data: ContentItem }>>();

  for (const item of items) {
    const slug = item.data.slug || item.data.canonicalBody?.slug || "";
    const cleanTitle = (item.data.title || "").trim().toLowerCase();
    const groupKey = slug ? `slug:${slug}` : `title:${cleanTitle}`;

    const group = groups.get(groupKey) || [];
    group.push(item);
    groups.set(groupKey, group);
  }

  const statusPriority: Record<string, number> = {
    PUBLISHED: 4,
    published: 4,
    APPROVED: 3,
    approved: 3,
    IN_REVIEW: 2,
    reviewed: 2,
    DRAFT: 1,
    draft: 1
  };

  const toDelete: string[] = [];
  let retainedCount = 0;

  console.log("\n📊 ANALIZANDO GRUPOS DE CONTENIDO:");

  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      // Documento único, verificar si tiene prefijo anómalo content-content-
      const item = group[0];
      if (/^content-content-/.test(item.id)) {
        console.log(`⚠️ Documento único con prefijo anómalo: ${item.id} (${item.data.title})`);
      }
      retainedCount++;
      continue;
    }

    console.log(`\n🔴 Duplicado detectado para [${key}] (${group.length} copias):`);

    // Ordenar grupo: mayor jerarquía de estado primero, luego los que no tienen 'content-content-', luego fecha más reciente
    group.sort((a, b) => {
      const scoreA = statusPriority[a.data.status] || 0;
      const scoreB = statusPriority[b.data.status] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      const isBadA = /^content-content-/.test(a.id) ? 1 : 0;
      const isBadB = /^content-content-/.test(b.id) ? 1 : 0;
      if (isBadA !== isBadB) return isBadA - isBadB;

      const dateA = new Date(a.data.createdAt || 0).getTime();
      const dateB = new Date(b.data.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const winner = group[0];
    console.log(`  ⭐ CONSERVAR: ID="${winner.id}" | Estado=${winner.data.status} | Fecha=${winner.data.createdAt}`);

    for (let i = 1; i < group.length; i++) {
      const loser = group[i];
      console.log(`  ❌ ELIMINAR : ID="${loser.id}" | Estado=${loser.data.status} | Fecha=${loser.data.createdAt}`);
      toDelete.push(loser.id);
    }
    retainedCount++;
  }

  console.log("\n==================================================");
  console.log(`Total a eliminar: ${toDelete.length} documentos duplicados.`);
  console.log(`Total a conservar: ${retainedCount} documentos canónicos.`);

  if (toDelete.length === 0) {
    console.log("✅ No se detectaron duplicados en Firestore.");
    return;
  }

  console.log("\n🗑️ Ejecutando eliminación en Firestore...");
  // Eliminar en lotes de 500 (límite de Firestore batches)
  const batchSize = 400;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const chunk = toDelete.slice(i, i + batchSize);
    const batch = db.batch();
    for (const id of chunk) {
      batch.delete(db.collection("contents").doc(id));
    }
    await batch.commit();
    console.log(`  - Eliminados ${chunk.length} documentos...`);
  }

  console.log("\n🎉 LIMPIEZA COMPLETADA CON ÉXITO.");
  console.log("==================================================");
}

cleanupDuplicateContents().catch((err) => {
  console.error("❌ Error ejecutando limpieza de duplicados:", err);
  process.exit(1);
});
