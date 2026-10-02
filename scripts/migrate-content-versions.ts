import { getAdminFirestore } from "@/server/config/firebase";
import type { ContentVersion } from "@/server/domain/types";

const BATCH_LIMIT = 400;

async function migrate(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("contents").get();
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;

  for (let offset = 0; offset < snapshot.docs.length; offset += BATCH_LIMIT) {
    const batch = db.batch();
    let writes = 0;

    for (const doc of snapshot.docs.slice(offset, offset + BATCH_LIMIT)) {
      scanned += 1;
      const data = doc.data();
      const versions = Array.isArray(data.versions)
        ? (data.versions as ContentVersion[])
        : [];

      if (versions.length === 0) {
        skipped += 1;
        continue;
      }

      for (const version of versions) {
        const versionRef = doc.ref
          .collection("versions")
          .doc(`v-${String(version.version).padStart(6, "0")}`);
        batch.set(versionRef, version, { merge: true });
        writes += 1;
      }

      batch.update(doc.ref, { versions: [] });
      writes += 1;
      migrated += 1;
    }

    if (writes > 0) {
      await batch.commit();
    }

    console.log(
      `[migrate-content-versions] bloque ${Math.floor(offset / BATCH_LIMIT) + 1}: ${writes} escrituras`
    );
  }

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
