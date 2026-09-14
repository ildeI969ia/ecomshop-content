import { AIProvenance } from "../domain/types";

export interface TextGenerationOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: "text/plain" | "application/json";
  temperature?: number;
}

export interface TextGenerationResult {
  text: string;
  provenance: AIProvenance;
}

export interface ImageGenerationResult {
  imageUrl: string;
  provenance: AIProvenance;
}

export interface MultimodalInputOptions {
  textPrompt?: string;
  mediaBase64?: string;
  mimeType?: string;
}

export interface AIProvider {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>;
  generateImage(prompt: string, aspectRatio?: string): Promise<ImageGenerationResult>;
  analyzeMultimodal(options: MultimodalInputOptions): Promise<TextGenerationResult>;
}

export interface KnowledgeProvider {
  searchSources(query: string, limit?: number): Promise<{ id: string; title: string; content: string }[]>;
  getVerifiedSources(): Promise<{ id: string; title: string; type: string; url?: string }[]>;
}
