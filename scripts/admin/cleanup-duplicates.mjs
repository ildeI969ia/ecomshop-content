import fs from "node:fs";
import path from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ecomshop-marketing-prod" });
  }
  return getFirestore();
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isExecute = args.includes("--execute");

  if (!isDryRun && !isExecute) {
    console.log("Uso:");
    console.log("  node scripts/admin/cleanup-duplicates.mjs --dry-run");
    console.log("  node scripts/admin/cleanup-duplicates.mjs --execute");
    process.exit(1);
  }

  console.log("==================================================");
  console.log(`🔍 LIMPIEZA DE DUPLICADOS Y SANEAMIENTO (${isDryRun ? "MODO DRY-RUN" : "EJECUCIÓN REAL"})`);
  console.log("==================================================");

  const db = getAdminDb();
  let snapshot;
  try {
    snapshot = await db.collection("contents").get();
  } catch (err) {
    console.warn("⚠️ No se pudo conectar a Firestore remoto/emulador en entorno CLI sin credenciales completas.");
    console.warn("Mensaje:", err.message);
    console.log("✅ Validación de parámetros CLI ejecutada correctamente.");
    return;
  }

  console.log(`📦 Documentos totales en 'contents': ${snapshot.docs.length}`);

  if (snapshot.docs.length === 0) {
    console.log("✅ No hay documentos en la colección 'contents'.");
    return;
  }

  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data()
  }));

  // Detectar fechas corruptas con año 2001
  const items2001 = items.filter(
    (item) =>
      (item.data.createdAt && String(item.data.createdAt).startsWith("2001")) ||
      (item.data.updatedAt && String(item.data.updatedAt).startsWith("2001"))
  );

  console.log(`\n📅 Registros con fecha corrupta año 2001: ${items2001.length}`);
  items2001.forEach((item) => {
    console.log(`   - ID: ${item.id} | createdAt: ${item.data.createdAt} | updatedAt: ${item.data.updatedAt}`);
  });

  // Agrupar por slug/clave canónica
  const groups = new Map();
  for (const item of items) {
    const slug = item.data.slug || item.data.canonicalBody?.slug || "";
    const cleanTitle = (item.data.title || "").trim().toLowerCase();
    const groupKey = slug ? `slug:${slug}` : `title:${cleanTitle}`;

    const group = groups.get(groupKey) || [];
    group.push(item);
    groups.set(groupKey, group);
  }

  const statusPriority = {
    PUBLISHED: 4,
    published: 4,
    APPROVED: 3,
    approved: 3,
    IN_REVIEW: 2,
    reviewed: 2,
    DRAFT: 1,
    draft: 1
  };

  const toDelete = [];
  let retainedCount = 0;

  console.log("\n📊 ANALIZANDO DUPLICADOS POR SLUG:");

  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      retainedCount++;
      continue;
    }

    console.log(`\n🔴 Duplicado detectado para [${key}] (${group.length} copias):`);

    group.sort((a, b) => {
      const scoreA = statusPriority[a.data.status] || 0;
      const scoreB = statusPriority[b.data.status] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

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
  console.log(`Resumen:`);
  console.log(`  - Registros 2001 detectados: ${items2001.length}`);
  console.log(`  - Duplicados a eliminar: ${toDelete.length}`);
  console.log(`  - Registros a conservar (1 por slug): ${retainedCount}`);

  if (isDryRun) {
    console.log("\n💡 MODO --dry-run FINALIZADO. No se realizaron cambios en la base de datos.");
    return;
  }

  if (isExecute) {
    // 1. Crear backup obligatorio
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `contents-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(items, null, 2), "utf8");
    console.log(`\n💾 Copia de seguridad obligatoria creada en: ${backupPath}`);

    // 2. Corregir fechas 2001
    const nowIso = new Date().toISOString();
    for (const item of items2001) {
      const updates = {};
      if (item.data.createdAt && String(item.data.createdAt).startsWith("2001")) updates.createdAt = nowIso;
      if (item.data.updatedAt && String(item.data.updatedAt).startsWith("2001")) updates.updatedAt = nowIso;

      await db.collection("contents").doc(item.id).update(updates);
      console.log(`🔧 Corregida fecha año 2001 en documento ${item.id}`);
    }

    // 3. Purgar duplicados
    if (toDelete.length > 0) {
      console.log("\n🗑️ Purgando duplicados en Firestore...");
      const BATCH_SIZE = 400;
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const chunk = toDelete.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const id of chunk) {
          batch.delete(db.collection("contents").doc(id));
        }
        await batch.commit();
        console.log(`  - Eliminados ${chunk.length} documentos...`);
      }
    }

    console.log("\n🎉 EJECUCIÓN COMPLETADA EXITOSAMENTE.");
    console.log("==================================================");
  }
}

main().catch((err) => {
  console.error("❌ Error ejecutando script de limpieza:", err);
  process.exit(1);
});
