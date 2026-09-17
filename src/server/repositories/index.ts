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

  async listRecent(limitCount = 50): Promise<ContentItem[]> {
    const snapshot = await this.collection().orderBy("createdAt", "desc").limit(limitCount).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as ContentItem);
  }

  async save(content: ContentItem): Promise<void> {
    await this.collection().doc(content.id).set(content);
  }

  async saveVariant(contentId: string, variant: ContentVariant): Promise<void> {
    await this.collection()
      .doc(contentId)
      .collection("variants")
      .doc(variant.id)
      .set(variant);
  }
}

export class FinOpsRepository {
  private collection = () => getAdminFirestore().collection("usage_records");

  async record(record: FinOpsRecord): Promise<void> {
    await this.collection().doc(record.id).set(record);
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
    await this.collection().doc(log.id).set(log);
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
    await this.collection().doc(source.id).set(source);
  }
}
export class AssetRepository {
  private collection = () => getAdminFirestore().collection("assets");

  async findById(id: string): Promise<Asset | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as Asset) : null;
  }

  async listByWorkspace(workspaceId: string, limitCount = 50): Promise<Asset[]> {
    const snapshot = await this.collection()
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snapshot.docs.map((d) => d.data() as Asset);
  }

  async listByCampaign(campaignId: string): Promise<Asset[]> {
    const snapshot = await this.collection()
      .where("campaignId", "==", campaignId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((d) => d.data() as Asset);
  }

  async save(asset: Asset): Promise<void> {
    await this.collection().doc(asset.id).set(asset);
  }

  async delete(id: string): Promise<void> {
    await this.collection().doc(id).delete();
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
    await this.collection().doc(product.id).set(product);
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
    await this.collection().doc(record.id).set(record);
  }
}
