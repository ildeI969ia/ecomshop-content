import { ContentItem, ContentVariant, FinOpsRecord, AuditLog, Campaign } from "../domain/types";
import { ContentRepository, FinOpsRepository, AuditRepository, CampaignRepository } from "../repositories";

export interface SyncPayload {
  historyItems?: any[];
  finopsRecords?: any[];
  generatedImages?: any[];
  workspaceId?: string;
  userId: string;
  userEmail: string;
}

export class PersistenceService {
  private contentRepo = new ContentRepository();
  private finopsRepo = new FinOpsRepository();
  private auditRepo = new AuditRepository();
  private campaignRepo = new CampaignRepository();

  /**
   * Recibe datos volcados desde localStorage y los persiste de manera idempotente en Firestore
   */
  async syncFromLocalStorage(payload: SyncPayload): Promise<{
    syncedArticles: number;
    syncedFinops: number;
  }> {
    const workspaceId = payload.workspaceId || "default-ecomspain";
    let syncedArticles = 0;
    let syncedFinops = 0;

    // 1. Migrar artículos de historial
    if (payload.historyItems && Array.isArray(payload.historyItems)) {
      for (const item of payload.historyItems) {
        if (!item.content) continue;
        const contentId = `content-${item.id || Date.now()}`;
        const contentItem: ContentItem = {
          id: contentId,
          workspaceId,
          title: item.title || item.content.topicTitle || "Sin título",
          slug: item.content.blog?.slug || `post-${item.id}`,
          category: item.category || item.content.category || "general",
          status: item.status === "published" ? "PUBLISHED" : "DRAFT",
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
              timestamp: item.createdAt || new Date().toISOString()
            }
          ],
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
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

    // 2. Migrar registros de FinOps
    if (payload.finopsRecords && Array.isArray(payload.finopsRecords)) {
      for (const rec of payload.finopsRecords) {
        const finopsItem: FinOpsRecord = {
          id: `finops-${rec.id || Math.random().toString(36).substring(2, 9)}`,
          workspaceId,
          timestamp: rec.timestamp || new Date().toISOString(),
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

    // 3. Registrar auditoría de la sincronización
    await this.auditRepo.record({
      id: `audit-sync-${Date.now()}`,
      workspaceId,
      timestamp: new Date().toISOString(),
      userId: payload.userId,
      userEmail: payload.userEmail,
      action: "EDIT",
      entity: "LOCALSTORAGE_SYNC",
      entityId: workspaceId,
      diff: { syncedArticles, syncedFinops },
      source: "UI"
    });

    return { syncedArticles, syncedFinops };
  }
}
