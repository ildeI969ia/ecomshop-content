import { UtmClickRepository } from "@/server/repositories/utm-click-repository";
import { ContentRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";

export interface UtmTopPerformerExample {
  pieceId: string;
  slug: string;
  clicksCount: number;
  channel: "blog" | "whatsapp" | "linkedin" | "mailchimp";
  isTopPerformer: boolean;
  contentSnippet?: string;
  title?: string;
}

export class UtmLearnerService {
  private utmRepo: UtmClickRepository;
  private contentRepo: ContentRepository;

  constructor() {
    this.utmRepo = new UtmClickRepository();
    this.contentRepo = new ContentRepository();
  }

  /**
   * Obtiene los ejemplos top performer marcados con `isTopPerformer: true`
   * para ser reutilizados como few-shot examples en los prompts del canal correspondiente.
   */
  async getTopPerformerExamples(
    channel: "blog" | "whatsapp" | "linkedin" | "mailchimp",
    limitCount = 3
  ): Promise<UtmTopPerformerExample[]> {
    try {
      const topPieces = await this.utmRepo.getTopPerformingPieces(channel, limitCount);
      const examples: UtmTopPerformerExample[] = [];

      for (const piece of topPieces) {
        let contentItem: ContentItem | null = null;

        if (piece.slug) {
          contentItem = await this.contentRepo.findBySlug(piece.slug);
        }
        if (!contentItem && piece.pieceId) {
          contentItem = await this.contentRepo.findById(piece.pieceId);
        }

        let contentSnippet = "";
        let title = contentItem?.title || piece.slug;

        if (contentItem) {
          const body = contentItem.canonicalBody || {};
          const textContent =
            typeof body === "string"
              ? body
              : body.content || body.text || body.body || JSON.stringify(body);

          contentSnippet = textContent.slice(0, 400);
        }

        examples.push({
          pieceId: piece.pieceId,
          slug: piece.slug,
          clicksCount: piece.clicksCount,
          channel,
          isTopPerformer: true,
          title,
          contentSnippet
        });
      }

      return examples;
    } catch (err) {
      console.warn(`[UtmLearner] Error extrayendo top performers para ${channel}:`, err);
      return [];
    }
  }

  /**
   * Genera un bloque de contexto few-shot formateado para inyectar en el prompt de la IA.
   */
  async getFewShotPromptContext(
    channel: "blog" | "whatsapp" | "linkedin" | "mailchimp",
    limitCount = 2
  ): Promise<string> {
    const examples = await this.getTopPerformerExamples(channel, limitCount);
    if (examples.length === 0) return "";

    let promptContext = `\n--- EJEMPLOS DE ALTO RENDIMIENTO (TOP PERFORMERS POR TRAFICO UTM) PARA CANAL ${channel.toUpperCase()} ---\n`;
    promptContext += `Utiliza la estructura, tono y patrón de los siguientes contenidos con isTopPerformer: true como referencia few-shot:\n\n`;

    examples.forEach((ex, idx) => {
      promptContext += `Ejemplo #${idx + 1} (isTopPerformer: ${ex.isTopPerformer}, Clics UTM: ${ex.clicksCount}):\n`;
      promptContext += `Título: ${ex.title}\n`;
      if (ex.contentSnippet) {
        promptContext += `Extracto: ${ex.contentSnippet}\n`;
      }
      promptContext += `\n`;
    });

    promptContext += `--- FIN EJEMPLOS TOP PERFORMER ---\n`;
    return promptContext;
  }
}

export const utmLearnerService = new UtmLearnerService();
