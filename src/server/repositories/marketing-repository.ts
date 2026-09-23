import { getAdminFirestore } from "../config/firebase";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { MarketingRun, MarketingPackage, QualityReport } from "../orchestrator/marketing-types";

/**
 * Repositorio de persistencia en Firestore para MarketingRuns y MarketingPackages.
 * Mantiene inmutabilidad por versión (contentVersion) y asegura aislamiento por workspace/tenant.
 */
export class MarketingRunRepository {
  private runsCollection = () => getAdminFirestore().collection("marketing_runs");
  private packagesCollection = () => getAdminFirestore().collection("marketing_packages");

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
}
