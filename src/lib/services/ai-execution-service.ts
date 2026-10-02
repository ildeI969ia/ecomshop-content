import { AI_REQUEST_TIMEOUT_MS } from "@/lib/ai-config";

export interface AIUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
}

export interface AITextGenerationResult {
  text: string;
  usageMetadata?: AIUsageMetadata;
}

export interface AIJsonExecutionRequest {
  models: string[];
  generate: (model: string) => Promise<AITextGenerationResult>;
  timeoutMs?: number;
}

export interface AIJsonExecutionResult {
  parsed: unknown;
  rawText: string;
  model: string;
  fallbackUsed: boolean;
  usageMetadata?: AIUsageMetadata;
}

/**
 * Application-level execution policy for synchronous text generation.
 *
 * Provider-specific SDK calls stay outside this service. The service owns the
 * cross-provider concerns that must behave identically for every writer:
 * model fallback, timeout, JSON normalization and usage metadata extraction.
 */
export class AIExecutionService {
  async generateJson(
    request: AIJsonExecutionRequest
  ): Promise<AIJsonExecutionResult> {
    const models = Array.from(
      new Set(request.models.filter((model): model is string => Boolean(model)))
    );

    if (models.length === 0) {
      throw new Error("AI_NO_MODELS_CONFIGURED");
    }

    const timeoutMs = request.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
    let lastError: unknown;

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];

      try {
        const generated = await this.withTimeout(
          request.generate(model),
          timeoutMs,
          `Timeout con modelo ${model} en Vertex AI (${timeoutMs}ms)`
        );

        const rawText = generated.text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        if (!rawText) {
          throw new Error(`AI_EMPTY_RESPONSE:${model}`);
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText);
        } catch (parseError) {
          throw new Error(
            `AI_INVALID_JSON:${model}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }

        return {
          parsed,
          rawText,
          model,
          fallbackUsed: index > 0,
          usageMetadata: generated.usageMetadata
        };
      } catch (error) {
        lastError = error;
        console.error(`[AIExecutionService] Fallo con ${model}:`, error);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("AI_EXECUTION_FAILED");
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string
  ): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error(message)), timeoutMs);
        })
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
