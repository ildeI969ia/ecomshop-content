import { GoogleGenAI } from "@google/genai";
import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { IAgentProvider } from "./agent-provider";
import { AI_TEXT_MODEL, AI_FALLBACK_MODEL, VERTEX_LOCATION } from "@/lib/ai-config";

export interface AntigravityTsProviderOptions {
  timeoutMs?: number;
  model?: string;
  apiKey?: string;
}

/**
 * Proveedor 100% nativo en TypeScript para la ejecución de agentes usando Gemini 2.5 Flash
 * vía el SDK oficial `@google/genai` con soporte dual (API Key / Vertex AI ADC).
 */
export class AntigravityTsProvider implements IAgentProvider {
  private timeoutMs: number;
  private model: string;
  private apiKey?: string;

  constructor(options: AntigravityTsProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 90000; // 90 segundos por defecto para estabilización de IA
    this.model = options.model || AI_TEXT_MODEL;
    this.apiKey = options.apiKey;
  }

  private getClient(): GoogleGenAI {
    const apiKey = (
      this.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_API_KEY
    )?.trim();

    if (apiKey) {
      return new GoogleGenAI({
        vertexai: false,
        apiKey,
        httpOptions: {
          headers: {
            "x-goog-api-key": apiKey
          }
        }
      });
    }

    // Fallback a Vertex AI nativo (Application Default Credentials en Cloud Run)
    const location = VERTEX_LOCATION;

    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
      location
    });
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, prompt } = manifest;

    const systemInstruction = `Eres un agente de marketing técnico de EcomShop. Tu rol es ${manifest.agentRole}. Produce respuestas estructuradas sin inventar especificaciones no verificadas.`;

    const client = this.getClient();

    const generateWithModel = async (modelName: string) => {
      const timeoutSec = Math.round(this.timeoutMs / 1000);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`TIMEOUT_EXCEEDED: La generación de la IA excedió el límite de ${timeoutSec}s`)), this.timeoutMs);
      });

      const generationPromise = client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      });

      return await Promise.race([generationPromise, timeoutPromise]) as any;
    };

    try {
      const initialModel = (this.model || AI_TEXT_MODEL).replace(/-001$/, "");
      const candidateModels = Array.from(new Set([
        initialModel,
        AI_TEXT_MODEL,
        AI_FALLBACK_MODEL
      ])).filter(Boolean);

      let response: any;
      let lastError: any;
      let usedModel = candidateModels[0];
      let fallbackUsed = false;

      for (let i = 0; i < candidateModels.length; i++) {
        const modelName = candidateModels[i];
        try {
          response = await generateWithModel(modelName);
          if (response?.text) {
            usedModel = modelName;
            fallbackUsed = i > 0;
            break;
          }
        } catch (err: any) {
          console.warn(`[AntigravityTsProvider] Modelo ${modelName} falló en Vertex AI (${err?.message || err}). Probando siguiente...`);
          lastError = err;
        }
      }

      if (!response?.text) {
        throw lastError || new Error("EMPTY_AI_RESPONSE: Ningún modelo de IA pudo responder.");
      }

      const responseText = response.text || "";
      if (!responseText) {
        throw new Error("EMPTY_AI_RESPONSE: El modelo de IA devolvió una respuesta vacía");
      }

      // Extraer metadatos de consumo reales de Vertex AI / Gemini
      const rawMeta = response.usageMetadata || {};
      const usageMetadata = {
        promptTokenCount: typeof rawMeta.promptTokenCount === "number" ? rawMeta.promptTokenCount : null,
        candidatesTokenCount: typeof rawMeta.candidatesTokenCount === "number" ? rawMeta.candidatesTokenCount : null,
        totalTokenCount: typeof rawMeta.totalTokenCount === "number" ? rawMeta.totalTokenCount : null,
        thoughtsTokenCount: typeof rawMeta.thoughtsTokenCount === "number" ? rawMeta.thoughtsTokenCount : (typeof rawMeta.candidatesTokensDetails?.[0]?.tokens === "number" ? rawMeta.candidatesTokensDetails[0].tokens : null),
        cachedContentTokenCount: typeof rawMeta.cachedContentTokenCount === "number" ? rawMeta.cachedContentTokenCount : null,
      };

      // Registrar evento de consumo FinOps en ai_usage / ai_usage_project_summary
      try {
        const { recordAiUsage } = await import("@/server/services/ai-budget");
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod";
        const workspaceId = (manifest.payload as any)?.workspaceId || "default-ecomspain";
        const sku = (manifest.payload as any)?.sku || "UNKNOWN_SKU";

        await recordAiUsage(
          "system-orchestrator",
          "gemini_generation",
          usageMetadata.promptTokenCount ?? 0,
          usageMetadata.candidatesTokenCount ?? 0,
          0,
          { email: "orchestrator@ecomspain.com", displayName: "Antigravity Orchestrator" },
          usedModel,
          {
            projectId,
            workspaceId,
            runId: manifest.runId,
            taskId,
            sku,
            actualModel: usedModel,
            fallbackUsed,
            usageMetadata
          }
        );
      } catch (finopsErr) {
        console.warn("[AntigravityTsProvider] Evento FinOps no pudo registrarse:", finopsErr);
      }

      return {
        taskId,
        exitCode: 0,
        stdout: responseText,
        stderr: "",
        timedOut: false,
        filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
        summary: `Agente TypeScript completó exitosamente la tarea ${taskId}`,
        actualModel: usedModel,
        fallbackUsed,
        usageMetadata
      };
    } catch (err: any) {
      let errorMessage = err?.message || String(err);

      if (
        errorMessage.includes("403") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("unregistered callers") ||
        errorMessage.includes("API key not valid")
      ) {
        errorMessage = "API Key de Gemini no configurada en las variables de entorno de Cloud Run";
      }

      console.error(`[AntigravityTsProvider Error] Tarea ${taskId} falló sin contingencia genérica:`, errorMessage);

      return {
        taskId,
        exitCode: 1,
        stdout: "",
        stderr: `[AntigravityTsProviderError]: ${errorMessage}`,
        timedOut: errorMessage.includes("TIMEOUT_EXCEEDED"),
        filesChanged: [],
        summary: `Fallo en la ejecución del agente TypeScript para la tarea ${taskId}: ${errorMessage}`
      };
    }
  }
}

// Exportar alias para compatibilidad retroactiva
export const AntigravityPythonSdkProvider = AntigravityTsProvider;
