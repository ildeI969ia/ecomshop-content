import { getAdminFirestore } from "../config/firebase";
import { type QueryDocumentSnapshot, type Query, type CollectionReference, type DocumentData } from "firebase-admin/firestore";
import {
  Campaign,
  ContentItem,
  ContentVariant,
  ContentVersion,
  FinOpsRecord,
  AuditLog,
  SourceItem,
  Asset,
  ProductEntity,
  ProductIntelligenceRecord
} from "../domain/types";
import { RepositoryUnavailableError } from "./repository-errors";

export class CampaignRepository {
  private collection = () => getAdminFirestore().collection("campaigns");

  async findById(id: string): Promise<Campaign | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as Campaign) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<Campaign[]> {
    const snapshot = await this.collection().where("workspaceId", "==", workspaceId).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as Campaign);
  }

  async findByOpportunityId(opportunityId: string): Promise<Campaign | null> {
    const snapshot = await this.collection().where("opportunityId", "==", opportunityId).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Campaign;
  }

  async findByProductId(productId: string, workspaceId: string): Promise<Campaign[]> {
    const snapshot = await this.collection()
      .where("workspaceId", "==", workspaceId)
      .where("productIds", "array-contains", productId)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as Campaign);
  }

  async archive(id: string, updatedBy?: string): Promise<void> {
    await this.collection().doc(id).update({
      status: "ARCHIVED",
      updatedAt: new Date().toISOString(),
      ...(updatedBy ? { updatedBy } : {})
    });
  }

  async create(campaign: Campaign): Promise<void> {
    await this.collection().doc(campaign.id).set(campaign);
  }

  async update(id: string, updates: Partial<Campaign>): Promise<void> {
    await this.collection().doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection().doc(id).delete();
  }
}

export function sanitizeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeUndefined) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined) {
      clean[key] = null;
    } else if (value !== null && typeof value === "object") {
      clean[key] = sanitizeUndefined(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as unknown as T;
}

export class ContentRepository {
  private collection = () => getAdminFirestore().collection("contents");

  private async hydrateVersions(id: string, root: ContentItem): Promise<ContentItem> {
    const snapshot = await this.collection().doc(id).collection("versions").orderBy("version", "desc").get();
    if (snapshot.empty) {
      return root;
    }
    return {
      ...root,
      versions: snapshot.docs.map((doc) => doc.data() as ContentVersion)
    };
  }

  async findById(id: string): Promise<ContentItem | null> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) return null;
    return this.hydrateVersions(id, doc.data() as ContentItem);
  }

  async listByCampaign(campaignId: string): Promise<ContentItem[]> {
    const snapshot = await this.collection().where("campaignId", "==", campaignId).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
  }

  async listByProduct(productId: string, workspaceId: string): Promise<ContentItem[]> {
    const snapshot = await this.collection()
      .where("workspaceId", "==", workspaceId)
      .where("linkedProductIds", "array-contains", productId)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
  }

  async listRecent(limitCount = 50, workspaceId?: string): Promise<ContentItem[]> {
    try {
      let query: Query<DocumentData> = this.collection();
      if (workspaceId) query = query.where("workspaceId", "==", workspaceId);
      const snapshot = await query.orderBy("createdAt", "desc").limit(limitCount).get();
      return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
    } catch (error) {
      throw new RepositoryUnavailableError("contents.listRecent", error);
    }
  }

  async listRecentPaginated(
    limitCount = 50,
    workspaceId?: string,
    startAfterCreatedAt?: string
  ): Promise<{ items: ContentItem[]; nextCursor: string | null }> {
    try {
      let query: Query<DocumentData> = this.collection();
      if (workspaceId) query = query.where("workspaceId", "==", workspaceId);
      query = query.orderBy("createdAt", "desc").orderBy("__name__", "desc");

      if (startAfterCreatedAt) {
        query = query.startAfter(startAfterCreatedAt);
      }

      const snapshot = await query.limit(limitCount + 1).get();
      const hasNextPage = snapshot.docs.length > limitCount;
      const returnedDocs = hasNextPage ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const items = returnedDocs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
      const lastDoc = returnedDocs[returnedDocs.length - 1];
      const nextCursor = hasNextPage && lastDoc ? (lastDoc.data()?.createdAt as string || null) : null;

      return { items, nextCursor };
    } catch (error) {
      throw new RepositoryUnavailableError("contents.listRecentPaginated", error);
    }
  }

  async findBySlug(slug: string, workspaceId?: string): Promise<ContentItem | null> {
    try {
      let query: Query<DocumentData> = this.collection().where("slug", "==", slug);
      if (workspaceId) query = query.where("workspaceId", "==", workspaceId);
      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return this.hydrateVersions(doc.id, doc.data() as ContentItem);
    } catch (error) {
      throw new RepositoryUnavailableError("contents.findBySlug", error);
    }
  }

  async upsertBySlug(rawContent: ContentItem): Promise<ContentItem> {
    const content = sanitizeUndefined(rawContent);
    const existing = await this.findBySlug(content.slug, content.workspaceId);
    const nowIso = new Date().toISOString();

    if (content.createdAt && content.createdAt.startsWith("2001")) {
      content.createdAt = nowIso;
    }

    const nextVersion = existing ? (existing.currentVersion || 1) + 1 : 1;
    const version: ContentVersion = {
      version: nextVersion,
      body: content.canonicalBody || (content as unknown as Record<string, unknown>),
      changeSummary: existing
        ? "Actualización automática por slug (versionado desacoplado)"
        : "Generación inicial",
      editedByUserId: content.updatedBy || content.createdBy,
      isAIGenerated: true,
      timestamp: nowIso
    };

    const rootData = sanitizeUndefined({
      ...(existing || {}),
      ...content,
      id: existing?.id || content.id,
      currentVersion: nextVersion,
      versions: [],
      updatedAt: nowIso,
      updatedBy: content.updatedBy || existing?.updatedBy
    }) as Record<string, unknown>;

    const rootId = existing?.id || content.id;
    const rootRef = this.collection().doc(rootId);
    const versionRef = rootRef.collection("versions").doc(`v-${String(nextVersion).padStart(6, "0")}`);
    const db = getAdminFirestore();

    let serialized = JSON.stringify(rootData);
    if (serialized.length > 900000) {
      const cleanedStr = serialized.replace(
        /data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/g,
        "https://storage.googleapis.com/ecomshop-marketing-prod/assets/pruned-base64-image.jpg"
      );
      Object.assign(rootData, JSON.parse(cleanedStr));
      serialized = JSON.stringify(rootData);
    }

    if (serialized.length > 1048576) {
      throw new Error(`CONTENT_DOCUMENT_TOO_LARGE: Documento ${rootId} supera 1MiB incluso después de limpieza.`);
    }

    const batch = db.batch();
    batch.set(rootRef, rootData, { merge: true });
    if (existing?.versions) {
      for (const legacyVersion of existing.versions) {
        const legacyVersionRef = rootRef.collection("versions").doc(`v-${String(legacyVersion.version).padStart(6, "0")}`);
        batch.set(legacyVersionRef, sanitizeUndefined(legacyVersion));
      }
    }
    batch.set(versionRef, sanitizeUndefined(version));
    await batch.commit();

    return {
      ...(rootData as unknown as ContentItem),
      versions: existing?.versions
        ? [...existing.versions, version]
        : [version]
    };
  }

  async save(content: ContentItem): Promise<void> {
    await this.upsertBySlug(content);
  }

  async update(id: string, updates: Partial<ContentItem>): Promise<void> {
    await this.collection().doc(id).update(sanitizeUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  }

  async updateStatus(id: string, status: ContentItem["status"]): Promise<void> {
    await this.collection().doc(id).update({
      status,
      updatedAt: new Date().toISOString()
    });
  }

  async saveVariant(contentId: string, variant: ContentVariant): Promise<void> {
    const cleanVariant = sanitizeUndefined(variant);
    await this.collection()
      .doc(contentId)
      .collection("variants")
      .doc(cleanVariant.id)
      .set(cleanVariant);
  }

  private async deleteSubcollection(id: string, name: "versions" | "variants"): Promise<void> {
    const parent = this.collection().doc(id);
    const snapshot = await parent.collection(name).get();
    if (snapshot.empty) return;

    const db = getAdminFirestore();
    const BATCH_LIMIT = 450;
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      snapshot.docs.slice(i, i + BATCH_LIMIT).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  async inspectIntegrity(id: string, workspaceId?: string): Promise<{
    contentId: string;
    workspaceId: string;
    status: "VALID" | "CORRUPTED" | "LEGACY_NEEDS_REPAIR";
    hasRoot: boolean;
    orphanVersionsCount: number;
    reasons: string[];
  }> {
    const rootDoc = await this.collection().doc(id).get();
    const versionsSnapshot = await this.collection().doc(id).collection("versions").get();
    const hasRoot = rootDoc.exists;
    const rootData = hasRoot ? (rootDoc.data() as ContentItem) : null;
    const orphanVersionsCount = !hasRoot ? versionsSnapshot.size : 0;
    const reasons: string[] = [];

    const itemWorkspace = rootData?.workspaceId || workspaceId || "";

    if (!hasRoot) {
      reasons.push("Documento raíz no existe en Firestore.");
      if (orphanVersionsCount > 0) {
        reasons.push(`Subcolección versions contiene ${orphanVersionsCount} versiones huérfanas sin raíz.`);
      }
      return {
        contentId: id,
        workspaceId: itemWorkspace,
        status: "CORRUPTED",
        hasRoot: false,
        orphanVersionsCount,
        reasons
      };
    }

    if (!itemWorkspace || itemWorkspace.trim().length === 0) {
      reasons.push("workspaceId está vacío o indefinido en el documento raíz.");
    }

    if (!rootData?.title || rootData.title.trim().length === 0 || rootData.title === "Sin título") {
      reasons.push("Título vacío o sin valor editorial formal.");
    }

    const versionCount = versionsSnapshot.size;
    const hasVersions = versionCount > 0 || Boolean(rootData?.canonicalBody && Object.keys(rootData.canonicalBody).length > 0);

    if (!hasVersions) {
      reasons.push("El documento carece de versiones en la subcolección y no posee canonicalBody.");
    }

    let status: "VALID" | "CORRUPTED" | "LEGACY_NEEDS_REPAIR" = "VALID";
    if (!itemWorkspace || itemWorkspace.trim().length === 0) {
      status = "CORRUPTED";
    } else if (reasons.length > 0) {
      status = "LEGACY_NEEDS_REPAIR";
    }

    return {
      contentId: id,
      workspaceId: itemWorkspace,
      status,
      hasRoot: true,
      orphanVersionsCount: 0,
      reasons
    };
  }

  async delete(id: string): Promise<void> {
    await Promise.all([
      this.deleteSubcollection(id, "versions"),
      this.deleteSubcollection(id, "variants")
    ]);
    await this.collection().doc(id).delete();
  }

  async deleteBulk(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    for (const id of ids) {
      await this.delete(id);
    }
  }
}

export class FinOpsRepository {
  private collection = () => getAdminFirestore().collection("usage_records");

  async record(record: FinOpsRecord): Promise<void> {
    await this.collection().doc(record.id).set(sanitizeUndefined(record));
  }

  async listRecent(limitCount = 100): Promise<FinOpsRecord[]> {
    const snapshot = await this.collection().orderBy("timestamp", "desc").limit(limitCount).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as FinOpsRecord);
  }

  async getMonthlyTotalCost(monthStartIso: string): Promise<number> {
    const snapshot = await this.collection()
      .where("timestamp", ">=", monthStartIso)
      .get();
    return snapshot.docs.reduce((acc: number, doc: QueryDocumentSnapshot) => {
      const data = doc.data() as FinOpsRecord;
      return acc + (data.estimatedCostEur || 0);
    }, 0);
  }
}

export class AuditRepository {
  private collection = () => getAdminFirestore().collection("audit_logs");

  async record(log: AuditLog): Promise<void> {
    await this.collection().doc(log.id).set(sanitizeUndefined(log));
  }

  async listByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    const snapshot = await this.collection()
      .where("entity", "==", entity)
      .where("entityId", "==", entityId)
      .orderBy("timestamp", "desc")
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as AuditLog);
  }
}

export class SourceRepository {
  private collection = () => getAdminFirestore().collection("sources");

  async listVerified(workspaceId: string): Promise<SourceItem[]> {
    const snapshot = await this.collection()
      .where("workspaceId", "==", workspaceId)
      .where("verified", "==", true)
      .get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as SourceItem);
  }

  async save(source: SourceItem): Promise<void> {
    await this.collection().doc(source.id).set(sanitizeUndefined(source));
  }
}
export class AssetRepository {
  private collection = () => getAdminFirestore().collection("assets");

  async findById(id: string): Promise<Asset | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as Asset) : null;
  }

  async listByWorkspace(workspaceId: string, limitCount = 50): Promise<Asset[]> {
    return this.listRecent(limitCount, workspaceId);
  }

  async listRecent(limitCount = 100, workspaceId?: string): Promise<Asset[]> {
    try {
      let query: any = this.collection();
      if (workspaceId) {
        query = query.where("workspaceId", "==", workspaceId);
      }
      const snapshot = await query.orderBy("createdAt", "desc").limit(limitCount).get();
      return snapshot.docs.map((d: any) => d.data() as Asset);
    } catch (err) {
      console.warn("[AssetRepository] orderBy createdAt falló (posible falta de índice compuesto), aplicando sort en memoria:", err);
      try {
        let query: any = this.collection();
        if (workspaceId) {
          query = query.where("workspaceId", "==", workspaceId);
        }
        const snapshot = await query.limit(limitCount).get();
        const items = snapshot.docs.map((d: any) => d.data() as Asset);
        return items.sort((a: Asset, b: Asset) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      } catch (fallbackErr) {
        console.error("[AssetRepository] Fallback listRecent falló:", fallbackErr);
        throw fallbackErr; // F4: el error total se propaga (el caller responde 5xx), nunca lista vacía silenciosa.
      }
    }
  }

  async listByCampaign(campaignId: string): Promise<Asset[]> {
    const snapshot = await this.collection()
      .where("campaignId", "==", campaignId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((d) => d.data() as Asset);
  }

  async save(asset: Asset): Promise<void> {
    await this.collection().doc(asset.id).set(sanitizeUndefined(asset));
  }

  async delete(id: string): Promise<void> {
    await this.collection().doc(id).delete();
  }

  async deleteBulk(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const db = getAdminFirestore();
    const BATCH_LIMIT = 450;
    for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
      const chunk = ids.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      for (const id of chunk) {
        batch.delete(this.collection().doc(id));
      }
      await batch.commit();
    }
  }
}

export class ProductRepository {
  private collection = () => getAdminFirestore().collection("products");

  async findById(id: string): Promise<ProductEntity | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as ProductEntity) : null;
  }

  async findBySku(sku: string): Promise<ProductEntity | null> {
    const snapshot = await this.collection().where("sku", "==", sku).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as ProductEntity;
  }

  async listByCategory(category: string): Promise<ProductEntity[]> {
    const snapshot = await this.collection().where("category", "==", category).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ProductEntity);
  }

  async listAll(limitCount = 100): Promise<ProductEntity[]> {
    const snapshot = await this.collection().limit(limitCount).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ProductEntity);
  }

  async save(product: ProductEntity): Promise<void> {
    await this.collection().doc(product.id).set(sanitizeUndefined(product));
  }
}

export class ProductIntelligenceRepository {
  private collection = () => getAdminFirestore().collection("product_intelligence");

  async findByProductId(productId: string): Promise<ProductIntelligenceRecord | null> {
    const doc = await this.collection().doc(productId).get();
    return doc.exists ? (doc.data() as ProductIntelligenceRecord) : null;
  }

  async findBySku(sku: string): Promise<ProductIntelligenceRecord | null> {
    const snapshot = await this.collection().where("sku", "==", sku).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as ProductIntelligenceRecord;
  }

  async save(record: ProductIntelligenceRecord): Promise<void> {
    await this.collection().doc(record.id).set(sanitizeUndefined(record));
  }
}

export { MarketingRunRepository } from "./marketing-repository";
