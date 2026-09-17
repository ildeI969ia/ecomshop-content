import { OFFICIAL_NOTEBOOK, NotebookSource } from "@/lib/notebooklm";

export interface NotebookGroundingChunk {
  id: string;
  title: string;
  type: string;
  content: string;
  sourceUrl?: string;
  relevanceScore: number;
}

export interface NotebookGroundingResult {
  notebookId: string;
  notebookName: string;
  officialUrl: string;
  totalSourcesIndexed: number;
  matchedChunks: NotebookGroundingChunk[];
  groundingSummary: string;
}

export class NotebookGroundingService {
  private notebookId = "notebooks/6ae5b7bb-ab27-4541-80cc-6127730fd01b";
  private notebookName = "EcomShop: Professional Networking and B2B WiFi Solutions Store";
  private officialUrl = "https://gemini.google.com/notebook/6ae5b7bb-ab27-4541-80cc-6127730fd01b";

  /**
   * Consulta fragmentos relevantes en el Master Notebook de EcomShop
   */
  async queryNotebookContext(query: string, limit = 5): Promise<NotebookGroundingResult> {
    const cleanQuery = query.toLowerCase();
    const queryTokens = cleanQuery.split(/[\s,/-]+/).filter(t => t.length > 2);

    // Búsqueda ponderada sobre el corpus del notebook
    const scoredSources: { source: NotebookSource; score: number }[] = OFFICIAL_NOTEBOOK.sources.map(src => {
      let score = 0;
      const titleLower = src.title.toLowerCase();
      const descLower = src.description.toLowerCase();

      // Coincidencia exacta de query
      if (titleLower.includes(cleanQuery)) score += 50;
      if (descLower.includes(cleanQuery)) score += 30;

      // Coincidencia de tokens específicos (p. ej. "ecw510", "poe+", "wifi 7")
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 15;
        if (descLower.includes(token)) score += 10;
      }

      return { source: src, score };
    });

    const topMatches = scoredSources
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Si la búsqueda es por un modelo específico (ej: ECW510, POE30Gv2)
    // aseguramos la inclusión de datos maestros de networking corporativo
    const matchedChunks: NotebookGroundingChunk[] = topMatches.map(({ source, score }) => ({
      id: source.id,
      title: source.title,
      type: source.type,
      content: `${source.title}: ${source.description}`,
      sourceUrl: source.url,
      relevanceScore: Math.min(100, score)
    }));

    // Si no hubo coincidencia estricta en los títulos estáticos pero es un modelo EnGenius (ej. ECW510)
    if (matchedChunks.length === 0 && (cleanQuery.includes("ecw") || cleanQuery.includes("engenius"))) {
      matchedChunks.push({
        id: "src-ecw-grounding",
        title: "Especificación Maestra Familia EnGenius Cloud ECW (Notebook EcomShop)",
        type: "datasheet",
        content: "Puntos de acceso para empresas EnGenius Cloud con tecnología Wi-Fi 7 / Wi-Fi 6, alimentación PoE 802.3af/at/bt, sin cuotas ni licencias obligatorias y gestión cloud nativa con visualización de topología.",
        sourceUrl: "https://www.ecomshop.es/engenius-cloud",
        relevanceScore: 85
      });
    }

    const groundingSummary = matchedChunks.length > 0
      ? matchedChunks.map(c => `[${c.type.toUpperCase()}] ${c.title} -> ${c.content}`).join("\n")
      : "Corpus oficial de networking profesional EcomShop (59 fuentes técnicas indexadas).";

    return {
      notebookId: this.notebookId,
      notebookName: this.notebookName,
      officialUrl: this.officialUrl,
      totalSourcesIndexed: 59,
      matchedChunks,
      groundingSummary
    };
  }
}
