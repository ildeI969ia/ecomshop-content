import { getAdminFirestore } from "@/server/config/firebase";
import type { ContentVersion } from "@/server/domain/types";

const BATCH_LIMIT = 400;

async function migrate(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("contents").get();
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let pendingWrites = 0;
  let batch = db.batch();

  const commitBatch = async (): Promise<void> => {
    if (pendingWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  };

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data();
    const versions = Array.isArray(data.versions)
      ? (data.versions as ContentVersion[])
      : [];

    if (versions.length === 0) {
      skipped += 1;
      continue;
    }

    // Leave enough headroom below Firestore's 500-operation batch limit.
    if (pendingWrites + versions.length + 1 > BATCH_LIMIT) {
      await commitBatch();
    }

    for (const version of versions) {
      const versionRef = doc.ref
        .collection("versions")
        .doc(`v-${String(version.version).padStart(6, "0")}`);
      batch.set(versionRef, version, { merge: true });
      pendingWrites += 1;
    }

    batch.update(doc.ref, { versions: [] });
    pendingWrites += 1;
    migrated += 1;

    if (pendingWrites >= BATCH_LIMIT) {
      await commitBatch();
    }
  }

  await commitBatch();

  console.log(
    JSON.stringify({
      scanned,
      migrated,
      skipped,
      message: "Migración de versiones completada. El proceso es idempotente."
    })
  );
}

migrate().catch((error: unknown) => {
  console.error("[migrate-content-versions] FAILED", error);
  process.exitCode = 1;
});
