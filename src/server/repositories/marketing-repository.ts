import { getAdminFirestore } from "../config/firebase";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { MarketingRun, MarketingPackage, QualityReport, MarketingBatch } from "../orchestrator/marketing-types";

/**
 * Repositorio de persistencia en Firestore para MarketingRuns, MarketingPackages y MarketingBatches.
 * Mantiene inmutabilidad por versión (contentVersion) y asegura aislamiento por workspace/tenant.
 */
export class MarketingRunRepository {
  private runsCollection = () => getAdminFirestore().collection("marketing_runs");
  private packagesCollection = () => getAdminFirestore().collection("marketing_packages");
  private batchesCollection = () => getAdminFirestore().collection("marketing_batches");

  async saveRun(run: MarketingRun): Promise<void> {
    await this.runsCollection().doc(run.runId).set(run);
  }

  async findRunById(runId: string): Promise<MarketingRun | null> {
    const doc = await this.runsCollection().doc(runId).get();
    return doc.exists ? (doc.data() as MarketingRun) : null;
  }

  async findRunByIdempotencyHash(hash: string, workspaceId = "default-ecomspain"): Promise<MarketingRun | null> {
    const snapshot = await this.runsCollection()
      .where("workspaceId", "==", workspaceId)
      .where("idempotencyHash", "==", hash)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as MarketingRun;
  }

  async listRunsByWorkspace(workspaceId: string, limitCount = 50): Promise<MarketingRun[]> {
    const snapshot = await this.runsCollection()
      .where("workspaceId", "==", workspaceId)
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingRun);
  }

  async savePackage(pkg: MarketingPackage): Promise<void> {
    await this.packagesCollection().doc(pkg.packageId).set(pkg);
  }

  async findPackageById(packageId: string): Promise<MarketingPackage | null> {
    const doc = await this.packagesCollection().doc(packageId).get();
    return doc.exists ? (doc.data() as MarketingPackage) : null;
  }

  async findPackageByRunId(runId: string): Promise<MarketingPackage | null> {
    const snapshot = await this.packagesCollection().where("runId", "==", runId).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as MarketingPackage;
  }

  async listPackagesByWorkspace(limitCount = 100): Promise<MarketingPackage[]> {
    const snapshot = await this.packagesCollection().limit(limitCount).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingPackage);
  }

  async listPackagesBySku(sku: string, limitCount = 20): Promise<MarketingPackage[]> {
    const snapshot = await this.packagesCollection()
      .where("product.sku", "==", sku)
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingPackage);
  }

  async saveBatch(batch: MarketingBatch): Promise<void> {
    await this.batchesCollection().doc(batch.batchId).set(batch);
  }

  async findBatchById(batchId: string): Promise<MarketingBatch | null> {
    const doc = await this.batchesCollection().doc(batchId).get();
    return doc.exists ? (doc.data() as MarketingBatch) : null;
  }

  async listBatchesByWorkspace(workspaceId: string, limitCount = 20): Promise<MarketingBatch[]> {
    const snapshot = await this.batchesCollection()
      .where("workspaceId", "==", workspaceId)
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingBatch);
  }
}

export const MarketingRepository = MarketingRunRepository;
export type MarketingRepository = MarketingRunRepository;
