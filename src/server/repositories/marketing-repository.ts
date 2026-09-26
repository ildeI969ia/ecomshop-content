import { getAdminFirestore } from "../config/firebase";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { MarketingRun, MarketingPackage, QualityReport, MarketingBatch } from "../orchestrator/marketing-types";
import { sanitizeUndefined } from "./index";

/**
 * Repositorio de persistencia en Firestore para MarketingRuns, MarketingPackages y MarketingBatches.
 * Mantiene inmutabilidad por versión (contentVersion) y asegura aislamiento por workspace/tenant.
 */
export class MarketingRunRepository {
  private runsCollection = () => getAdminFirestore().collection("marketing_runs");
  private packagesCollection = () => getAdminFirestore().collection("marketing_packages");
  private batchesCollection = () => getAdminFirestore().collection("marketing_batches");

  async saveRun(run: MarketingRun): Promise<void> {
    await this.runsCollection().doc(run.runId).set(sanitizeUndefined(run));
  }

  async findRunById(runId: string, workspaceId?: string): Promise<MarketingRun | null> {
    const doc = await this.runsCollection().doc(runId).get();
    if (!doc.exists) return null;
    const run = doc.data() as MarketingRun;
    if (workspaceId && run.workspaceId && run.workspaceId !== workspaceId) {
      return null;
    }
    return run;
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
    const pkgToSave: MarketingPackage = {
      ...pkg,
      workspaceId: pkg.workspaceId || "default-ecomspain",
      organizationId: pkg.organizationId || "org-ecomspain"
    };
    await this.packagesCollection().doc(pkgToSave.packageId).set(sanitizeUndefined(pkgToSave));
  }

  async findPackageById(packageId: string, workspaceId?: string): Promise<MarketingPackage | null> {
    const doc = await this.packagesCollection().doc(packageId).get();
    if (!doc.exists) return null;
    const pkg = doc.data() as MarketingPackage;
    if (workspaceId && pkg.workspaceId && pkg.workspaceId !== workspaceId) {
      return null;
    }
    return pkg;
  }

  async findPackageByRunId(runId: string, workspaceId?: string): Promise<MarketingPackage | null> {
    let query = this.packagesCollection().where("runId", "==", runId);
    if (workspaceId) {
      query = query.where("workspaceId", "==", workspaceId);
    }
    const snapshot = await query.limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as MarketingPackage;
  }

  async listPackagesByWorkspace(workspaceId: string, limitCount = 100): Promise<MarketingPackage[]> {
    if (!workspaceId) {
      throw new Error("workspaceId es obligatorio para listar packages por workspace");
    }
    const snapshot = await this.packagesCollection()
      .where("workspaceId", "==", workspaceId)
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingPackage);
  }

  async listPackagesBySku(sku: string, workspaceId: string, limitCount = 20): Promise<MarketingPackage[]> {
    if (!workspaceId) {
      throw new Error("workspaceId es obligatorio para listar packages por SKU");
    }
    const snapshot = await this.packagesCollection()
      .where("workspaceId", "==", workspaceId)
      .where("product.sku", "==", sku)
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as MarketingPackage);
  }

  async saveBatch(batch: MarketingBatch): Promise<void> {
    await this.batchesCollection().doc(batch.batchId).set(sanitizeUndefined(batch));
  }

  async findBatchById(batchId: string, workspaceId?: string): Promise<MarketingBatch | null> {
    const doc = await this.batchesCollection().doc(batchId).get();
    if (!doc.exists) return null;
    const batch = doc.data() as MarketingBatch;
    if (workspaceId && batch.workspaceId && batch.workspaceId !== workspaceId) {
      return null;
    }
    return batch;
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
