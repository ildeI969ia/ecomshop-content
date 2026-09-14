# PHASE 04A — AI PROVIDER & KNOWLEDGE ARCHITECTURE

## 1. Provider Decoupling & Interface Architecture

To ensure vendor independence and decouple the product from proprietary, non-API tools, all AI operations are accessed via the `AIProvider` contract:

```typescript
export interface AIProvider {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  generateImage(prompt: string, aspectRatio?: string): Promise<ImageGenerationResult>;
  analyzeMultimodal(options: MultimodalInputOptions): Promise<TextGenerationResult>;
}
```

The concrete implementation, `GoogleGenAIProvider`, encapsulates the official `@google/genai` SDK and extracts telemetry (`inputTokens`, `outputTokens`, `cachedTokens`, `latencyMs`, `estimatedCostEur`) into standard `AIProvenance` records.

---

## 2. NotebookLM Technical Evaluation & KnowledgeProvider Strategy

> [!CAUTION]
> **NotebookLM API Status Notice:**  
> NotebookLM currently does **NOT** offer a generally available, supported REST API or SDK for external application integration. Scraping consumer NotebookLM interfaces is strictly prohibited as it creates critical runtime fragility, violates Google Terms of Service, and cannot guarantee latency or SLA thresholds.

### Supported Decoupled Architecture: `KnowledgeProvider`
Instead of coupling EcomSpain Marketing OS directly to NotebookLM, the system introduces the `KnowledgeProvider` interface:

```typescript
export interface KnowledgeProvider {
  searchSources(query: string, limit?: number): Promise<{ id: string; title: string; content: string }[]>;
  getVerifiedSources(): Promise<{ id: string; title: string; type: string; url?: string }[]>;
}
```

- **Phase 04A Implementation:** `HybridKnowledgeProvider` indexes verified local datasheets, EnGenius product specs, and technical whitepapers directly in server memory and Firestore collections.
- **Future Evolution:** Can seamlessly switch to Vertex AI Search & Conversation / Firestore Vector Embeddings without altering a single component or route handler.
