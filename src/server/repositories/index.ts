import { getAdminFirestore } from "../config/firebase";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  Campaign,
  ContentItem,
  ContentVariant,
  FinOpsRecord,
  AuditLog,
  SourceItem,
  Asset,
  ProductEntity,
  ProductIntelligenceRecord
} from "../domain/types";

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

  async create(campaign: Campaign): Promise<void> {
    await this.collection().doc(campaign.id).set(campaign);
  }

  async update(id: string, updates: Partial<Campaign>): Promise<void> {
    await this.collection().doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }
}

export function sanitizeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeUndefined) as unknown as T;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (value === undefined) {
      clean[key] = null;
    } else if (value !== null && typeof value === "object") {
      clean[key] = sanitizeUndefined(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export class ContentRepository {
  private collection = () => getAdminFirestore().collection("contents");

  async findById(id: string): Promise<ContentItem | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as ContentItem) : null;
  }

  async listByCampaign(campaignId: string): Promise<ContentItem[]> {
    const snapshot = await this.collection().where("campaignId", "==", campaignId).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
  }

  async listRecent(limitCount = 50, workspaceId?: string): Promise<ContentItem[]> {
    try {
      let query: any = this.collection();
      if (workspaceId) {
        query = query.where("workspaceId", "==", workspaceId);
      }
      const snapshot = await query.orderBy("createdAt", "desc").limit(limitCount).get();
      return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
    } catch (err) {
      console.warn("[ContentRepository] orderBy createdAt falló, recurriendo a sort en memoria:", err);
      try {
        let query: any = this.collection();
        if (workspaceId) {
          query = query.where("workspaceId", "==", workspaceId);
        }
        const snapshot = await query.limit(limitCount).get();
        const items = snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
        return items.sort((a: ContentItem, b: ContentItem) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      } catch (fallbackErr) {
        console.error("[ContentRepository] Fallback query error:", fallbackErr);
        return [];
      }
    }
  }

  async findBySlug(slug: string, workspaceId?: string): Promise<ContentItem | null> {
    try {
      let query: any = this.collection().where("slug", "==", slug);
      if (workspaceId) {
        query = query.where("workspaceId", "==", workspaceId);
      }
      const snapshot = await query.limit(1).get();
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as ContentItem;
      }
      return null;
    } catch (err) {
      console.warn("[ContentRepository] findBySlug error:", err);
      return null;
    }
  }

  async upsertBySlug(rawContent: ContentItem): Promise<ContentItem> {
    const content = sanitizeUndefined(rawContent);
    const existing = await this.findBySlug(content.slug, content.workspaceId);
    let nowIso = new Date().toISOString();

    // Corregir fechas corruptas con año 2001 si aplican
    if (content.createdAt && content.createdAt.startsWith("2001")) {
      content.createdAt = nowIso;
    }

    if (existing) {
      const rawVersions = [
        ...(existing.versions || []),
        {
          version: (existing.currentVersion || 1) + 1,
          body: content.canonicalBody || (content as any),
          changeSummary: "Actualización automática por slug (Fase 6g - No duplicación)",
          editedByUserId: content.updatedBy || content.createdBy,
          isAIGenerated: true,
          timestamp: nowIso
        }
      ];

      // Poda de versiones para no superar el límite de 1MB de Firestore (máximo 5 versiones)
      const updatedVersions = rawVersions.slice(-5).map((v, idx, arr) => {
        if (idx < arr.length - 1 && JSON.stringify(v.body || {}).length > 50000) {
          return { ...v, body: { notice: "Cuerpo de versión intermedia purgado para control de tamaño (<1MB)" } };
        }
        return v;
      });

      const mergedItem: ContentItem = sanitizeUndefined({
        ...existing,
        ...content,
        id: existing.id, // Mantener ID único existente para evitar duplicados
        currentVersion: (existing.currentVersion || 1) + 1,
        versions: updatedVersions,
        updatedAt: nowIso,
        updatedBy: content.updatedBy || existing.updatedBy
      });

      // Limpieza preventiva de base64 si el objeto supera 900KB
      let finalItem = mergedItem;
      let serialized = JSON.stringify(finalItem);
      if (serialized.length > 900000) {
        const cleanedStr = serialized.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/g, "https://storage.googleapis.com/ecomshop-marketing-prod/assets/pruned-base64-image.jpg");
        finalItem = sanitizeUndefined(JSON.parse(cleanedStr));
        serialized = JSON.stringify(finalItem);
      }

      if (serialized.length > 1048576) {
        console.error(`[ContentRepository] ADVERTENCIA: Documento ${existing.id} supera 1MB (${serialized.length} bytes). Omitiendo actualización para no colapsar Firestore.`);
        return existing;
      }

      await this.collection().doc(existing.id).set(finalItem, { merge: true });
      return finalItem;
    } else {
      let finalItem = sanitizeUndefined(content);
      let serialized = JSON.stringify(finalItem);
      if (serialized.length > 900000) {
        const cleanedStr = serialized.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/g, "https://storage.googleapis.com/ecomshop-marketing-prod/assets/pruned-base64-image.jpg");
        finalItem = sanitizeUndefined(JSON.parse(cleanedStr));
        serialized = JSON.stringify(finalItem);
      }

      if (serialized.length > 1048576) {
        console.error(`[ContentRepository] ADVERTENCIA: Documento ${content.id} supera 1MB (${serialized.length} bytes). Omitiendo creación para no colapsar Firestore.`);
        return content;
      }

      await this.collection().doc(content.id).set(finalItem);
      return finalItem;
    }
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
