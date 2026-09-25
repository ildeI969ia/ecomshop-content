import { getAdminFirestore } from "../config/firebase";

export interface UtmClickRecord {
  id: string;
  workspaceId?: string;
  channel: "blog" | "whatsapp" | "linkedin" | "mailchimp";
  pieceId: string;
  slug: string;
  utmSource?: string;
  utmMedium?: string;
  timestamp: string;
}

export class UtmClickRepository {
  private collection = () => getAdminFirestore().collection("utm_clicks");

  async recordClick(click: UtmClickRecord): Promise<void> {
    await this.collection().doc(click.id).set(click);
  }

  /**
   * Obtiene las 3 piezas con mejor rendimiento (más clics) para un canal específico
   */
  async getTopPerformingPieces(
    channel: "blog" | "whatsapp" | "linkedin" | "mailchimp",
    limitCount = 3
  ): Promise<Array<{ pieceId: string; slug: string; clicksCount: number }>> {
    try {
      const snapshot = await this.collection().where("channel", "==", channel).limit(200).get();
      const clickCounts = new Map<string, { slug: string; count: number }>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as UtmClickRecord;
        const key = data.pieceId || data.slug;
        const current = clickCounts.get(key) || { slug: data.slug, count: 0 };
        clickCounts.set(key, { slug: data.slug, count: current.count + 1 });
      });

      const sorted = Array.from(clickCounts.entries())
        .map(([pieceId, info]) => ({ pieceId, slug: info.slug, clicksCount: info.count }))
        .sort((a, b) => b.clicksCount - a.clicksCount)
        .slice(0, limitCount);

      return sorted;
    } catch (err) {
      console.warn("[UtmClickRepository] Error al consultar clics por UTM:", err);
      return [];
    }
  }
}
