import { AIProvider, TextGenerationOptions, TextGenerationResult, ImageGenerationResult, MultimodalInputOptions } from "./ai-provider";
import { AIProvenance } from "../domain/types";
import { PRICING } from "@/lib/finops";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

export class GoogleGenAIProvider implements AIProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const ai = getGenAIClient(this.apiKey);
    const model = options?.model || getActiveGeminiModel(this.apiKey);
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        responseMimeType: options?.responseMimeType || "application/json",
        temperature: options?.temperature
      }
    });

    const latencyMs = Date.now() - startTime;
    const inputTokens = (response as any).usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
    const outputTokens = (response as any).usageMetadata?.candidatesTokenCount || Math.ceil((response.text?.length || 0) / 4);
    const cachedTokens = (response as any).usageMetadata?.cachedContentTokenCount || 0;

    const estimatedCostEur =
      (inputTokens / 1_000_000) * PRICING.geminiInputPerMillionEur +
      (outputTokens / 1_000_000) * PRICING.geminiOutputPerMillionEur;

    const provenance: AIProvenance = {
      provider: "google-vertex-genai",
      model,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      inputTokens,
      outputTokens,
      cachedTokens,
      latencyMs,
      estimatedCostEur: Math.round(estimatedCostEur * 1_000_000) / 1_000_000,
      sourceIdsUsed: [],
      generatedAt: new Date().toISOString()
    };

    return {
      text: response.text || "",
      provenance
    };
  }

  async generateImage(prompt: string, aspectRatio = "16:9"): Promise<ImageGenerationResult> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const startTime = Date.now();

    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio === "16:9" ? "16:9" : aspectRatio === "4:3" ? "4:3" : "1:1",
        outputMimeType: "image/jpeg"
      }
    });

    const latencyMs = Date.now() - startTime;
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    const imageUrl = base64 ? `data:image/jpeg;base64,${base64}` : "";

    const provenance: AIProvenance = {
      provider: "google-vertex-genai",
      model: "imagen-3.0-generate-002",
      requestId: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      latencyMs,
      estimatedCostEur: PRICING.imagen3PerImageEur,
      sourceIdsUsed: [],
      generatedAt: new Date().toISOString()
    };

    return {
      imageUrl,
      provenance
    };
  }

  async analyzeMultimodal(options: MultimodalInputOptions): Promise<TextGenerationResult> {
    const ai = getGenAIClient(this.apiKey);
    const model = getActiveGeminiModel(this.apiKey);
    const startTime = Date.now();

    const parts: any[] = [];
    if (options.mediaBase64 && options.mimeType) {
      parts.push({
        inlineData: {
          data: options.mediaBase64,
          mimeType: options.mimeType
        }
      });
    }
    if (options.textPrompt) {
      parts.push(options.textPrompt);
    }

    const response = await ai.models.generateContent({
      model,
      contents: parts,
      config: {
        responseMimeType: "application/json"
      }
    });

    const latencyMs = Date.now() - startTime;
    const inputTokens = (response as any).usageMetadata?.promptTokenCount || 1000;
    const outputTokens = (response as any).usageMetadata?.candidatesTokenCount || 800;

    const estimatedCostEur =
      (inputTokens / 1_000_000) * PRICING.geminiInputPerMillionEur +
      (outputTokens / 1_000_000) * PRICING.geminiOutputPerMillionEur;

    const provenance: AIProvenance = {
      provider: "google-vertex-genai",
      model,
      requestId: `multi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      inputTokens,
      outputTokens,
      cachedTokens: 0,
      latencyMs,
      estimatedCostEur: Math.round(estimatedCostEur * 1_000_000) / 1_000_000,
      sourceIdsUsed: [],
      generatedAt: new Date().toISOString()
    };

    return {
      text: response.text || "{}",
      provenance
    };
  }
}
