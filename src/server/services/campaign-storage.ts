import { getAdminFirestore } from "../config/firebase";
import { Campaign } from "../domain/types";

export class CampaignStorageService {
  private collection = () => getAdminFirestore().collection("campaigns");

  /**
   * Guarda o actualiza una campaña por `id` / `slug` con `{ merge: true }`
   * en lugar de crear un documento nuevo con `.add()` en cada guardado.
   */
  async saveCampaign(campaign: Partial<Campaign> & { id: string }): Promise<void> {
    const docId = campaign.id;
    const nowIso = new Date().toISOString();

    const dataToSave = {
      ...campaign,
      updatedAt: nowIso,
    };

    if (!dataToSave.createdAt) {
      dataToSave.createdAt = nowIso;
    }

    await this.collection().doc(docId).set(dataToSave, { merge: true });
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    const doc = await this.collection().doc(id).get();
    return doc.exists ? (doc.data() as Campaign) : null;
  }

  async listCampaignsByWorkspace(workspaceId: string): Promise<Campaign[]> {
    const snapshot = await this.collection().where("workspaceId", "==", workspaceId).get();
    return snapshot.docs.map((doc) => doc.data() as Campaign);
  }
}

export const campaignStorageService = new CampaignStorageService();
