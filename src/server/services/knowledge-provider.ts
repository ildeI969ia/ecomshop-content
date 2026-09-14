import { KnowledgeProvider } from "./ai-provider";
import { PRESET_TOPICS, STAR_PRODUCTS } from "@/lib/knowledge";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";

/**
 * KnowledgeProvider decoupled from NotebookLM proprietary API.
 * Uses verified corporate datasheets, star products, and curated knowledge base.
 */
export class HybridKnowledgeProvider implements KnowledgeProvider {
  async searchSources(query: string, limit = 5): Promise<{ id: string; title: string; content: string }[]> {
    const q = query.toLowerCase();
    const results: { id: string; title: string; content: string }[] = [];

    for (const source of OFFICIAL_NOTEBOOK.sources) {
      if (source.title.toLowerCase().includes(q) || source.description.toLowerCase().includes(q)) {
        results.push({
          id: source.id,
          title: source.title,
          content: source.description
        });
      }
    }

    for (const prod of STAR_PRODUCTS) {
      if (prod.name.toLowerCase().includes(q) || prod.description.toLowerCase().includes(q)) {
        results.push({
          id: prod.id,
          title: prod.name,
          content: `${prod.description} | Specs: ${prod.specs.join(", ")}`
        });
      }
    }

    return results.slice(0, limit);
  }

  async getVerifiedSources(): Promise<{ id: string; title: string; type: string; url?: string }[]> {
    return OFFICIAL_NOTEBOOK.sources.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      url: s.url
    }));
  }
}
