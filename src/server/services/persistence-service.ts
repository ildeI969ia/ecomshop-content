import { ContentItem, ContentVariant, FinOpsRecord, AuditLog, Campaign, Asset } from "../domain/types";
import { ContentRepository, FinOpsRepository, AuditRepository, CampaignRepository, AssetRepository } from "../repositories";
import { GoogleCloudStorageProvider } from "./storage-provider";
import { prepareImageBinary } from "./image-binary";

export interface SyncPayload {
  historyItems?: any[];
  finopsRecords?: any[];
  generatedImages?: any[];
  workspaceId?: string;
  userId: string;
  userEmail: string;
}

function safeIsoDate(input?: string): string {
  if (!input) return new Date().toISOString();
  try {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return new Date().toISOString();
}

export class PersistenceService {
  private contentRepo = new ContentRepository();
  private finopsRepo = new FinOpsRepository();
  private auditRepo = new AuditRepository();
  private campaignRepo = new CampaignRepository();
  private assetRepo = new AssetRepository();

  /**
   * Recibe datos volcados desde localStorage y los persiste de manera idempotente en Firestore
   */
  async syncFromLocalStorage(payload: SyncPayload): Promise<{
    syncedArticles: number;
    syncedFinops: number;
    syncedImages: number;
    failedImages: number;
    imageErrors: string[];
  }> {
    const workspaceId = payload.workspaceId || "default-ecomspain";
    let syncedArticles = 0;
    let syncedFinops = 0;
    let syncedImages = 0;
    let failedImages = 0;
    const imageErrors: string[] = [];

    // 1. Migrar artículos de historial
    if (payload.historyItems && Array.isArray(payload.historyItems)) {
      for (const item of payload.historyItems) {
        if (!item.content) continue;
        const rawId = String(item.id || Date.now());
        const cleanId = rawId.replace(/^(content-)+/, "");
        const contentId = `content-${cleanId}`;
        const contentItem: ContentItem = {
          id: contentId,
          workspaceId,
          title: item.title || item.content.topicTitle || "Sin título",
          slug: item.content.blog?.slug || `post-${cleanId}`,
          category: item.category || item.content.category || "general",
          status: item.status === "published" ? "PUBLISHED" : item.status === "approved" ? "APPROVED" : item.status === "reviewed" ? "IN_REVIEW" : "DRAFT",
          currentVersion: 1,
          authorId: payload.userId,
          canonicalBody: item.content.blog || {},
          linkedProductIds: [],
          linkedSourceIds: [],
          versions: [
            {
              version: 1,
              body: item.content,
              changeSummary: "Migrado desde almacenamiento local del navegador",
              editedByUserId: payload.userId,
              isAIGenerated: true,
              timestamp: safeIsoDate(item.createdAt)
            }
          ],
          createdAt: safeIsoDate(item.createdAt),
          updatedAt: new Date().toISOString(),
          createdBy: payload.userId,
          updatedBy: payload.userId
        };

        await this.contentRepo.save(contentItem);
        syncedArticles++;

        // Guardar variantes específicas si existen
        if (item.content.mailchimp) {
          await this.contentRepo.saveVariant(contentId, {
            id: `var-${contentId}-mailchimp`,
            contentId,
            channel: "MAILCHIMP",
            status: "DRAFT",
            bodyPayload: item.content.mailchimp,
            version: 1,
            isAIGenerated: true,
            humanModified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        if (item.content.linkedin) {
          await this.contentRepo.saveVariant(contentId, {
            id: `var-${contentId}-linkedin`,
            contentId,
            channel: "LINKEDIN",
            status: "DRAFT",
            bodyPayload: item.content.linkedin,
            version: 1,
            isAIGenerated: true,
            humanModified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 2. Migrar imágenes generadas (F3): el binario real se sube a GCS y se verifica.
    //    Si algo falla NO se inventa storagePath: se registra en imageErrors (sin skips silenciosos).
    if (payload.generatedImages && Array.isArray(payload.generatedImages)) {
      const storage = new GoogleCloudStorageProvider();
      for (const img of payload.generatedImages) {
        if (!img.url) continue;
        const assetId = String(img.id || "").startsWith("asset-") ? String(img.id) : `asset-${img.id || Math.random().toString(36).substring(2, 9)}`;
        try {
          let storagePath = "";
          let publicUrl = "";
          let sizeBytes = 0;
          let mimeType = "image/jpeg";
          let sha256: string | undefined;
          let originalSizeBytes: number | undefined;
          let storageStatus: Asset["storageStatus"] = "EXTERNAL_URL";

          if (img.url.startsWith("data:")) {
            const semi = img.url.indexOf(";");
            const comma = img.url.indexOf(",");
            if (semi < 0 || comma < 0 || img.url.slice(semi + 1, comma) !== "base64") {
              throw new Error("data URL mal formado (se esperaba ;base64,)");
            }
            const sourceMime = img.url.slice(5, semi);
            const original = Buffer.from(img.url.slice(comma + 1), "base64");
            originalSizeBytes = original.length;
            const prepared = await prepareImageBinary(original, sourceMime);
            const destinationPath = `workspaces/${workspaceId}/assets/${assetId}_migrated.${prepared.extension}`;
            const upload = await storage.uploadFile({ buffer: prepared.buffer, destinationPath, mimeType: prepared.mimeType });
            if (!upload.publicUrl) throw new Error("GCS no devolvio publicUrl verificada");
            storagePath = upload.storagePath;
            publicUrl = upload.publicUrl;
            sizeBytes = upload.sizeBytes;
            mimeType = prepared.mimeType;
            sha256 = prepared.sha256;
            storageStatus = "VERIFIED";
          } else if (img.url.startsWith("http://") || img.url.startsWith("https://")) {
            publicUrl = img.url;
            storagePath = img.url;
            storageStatus = "EXTERNAL_URL";
          } else {
            throw new Error(`Esquema de URL no soportado: ${String(img.url).slice(0, 60)}`);
          }

          const assetItem: Asset = {
            id: assetId,
            workspaceId,
            filename: img.prompt ? `AI: ${img.prompt.substring(0, 60)}` : `img-${img.id}`,
            mimeType,
            sizeBytes,
            storagePath,
            publicUrl,
            storageStatus,
            sha256,
            originalSizeBytes,
            type: "image",
            aiGenerated: true,
            aiProvenance: {
              provider: "google-vertex-genai",
              model: img.sourceType || "imagen3",
              requestId: assetId,
              generatedAt: safeIsoDate(img.createdAt),
              inputTokens: 0,
              outputTokens: 0,
              cachedTokens: 0,
              latencyMs: 0,
              estimatedCostEur: 0.03,
              sourceIdsUsed: []
            },
            ownerId: payload.userId,
            createdAt: safeIsoDate(img.createdAt),
            updatedAt: new Date().toISOString(),
            createdBy: payload.userId,
            updatedBy: payload.userId
          };
          await this.assetRepo.save(assetItem);
          syncedImages++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          failedImages++;
          if (imageErrors.length < 5) imageErrors.push(`${assetId}: ${message}`);
          console.error(`[PersistenceService] Imagen ${assetId} NO sincronizada:`, message);
        }
      }
    }
    // 3. Migrar registros de FinOps
    if (payload.finopsRecords && Array.isArray(payload.finopsRecords)) {
      for (const rec of payload.finopsRecords) {
        const finopsItem: FinOpsRecord = {
          id: `finops-${rec.id || Math.random().toString(36).substring(2, 9)}`,
          workspaceId,
          timestamp: safeIsoDate(rec.timestamp),
          userId: payload.userId,
          action: rec.action || "gemini_generation",
          tokensInput: rec.tokensInput || 0,
          tokensOutput: rec.tokensOutput || 0,
          cachedTokens: 0,
          imageCount: rec.imageCount || 0,
          latencyMs: 0,
          estimatedCostEur: rec.estimatedCostEur || 0,
          currency: "EUR"
        };
        await this.finopsRepo.record(finopsItem);
        syncedFinops++;
      }
    }

    // 4. Registrar auditoría de la sincronización
    await this.auditRepo.record({
      id: `audit-sync-${Date.now()}`,
      workspaceId,
      timestamp: new Date().toISOString(),
      userId: payload.userId,
      userEmail: payload.userEmail,
      action: "EDIT",
      entity: "LOCALSTORAGE_SYNC",
      entityId: workspaceId,
      diff: { syncedArticles, syncedFinops, syncedImages, failedImages, imageErrors: imageErrors.slice(0, 5) },
      source: "UI"
    });

    return { syncedArticles, syncedFinops, syncedImages, failedImages, imageErrors };
  }
}
