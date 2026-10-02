import { GoogleGenAI } from "@google/genai";
import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { IAgentProvider } from "./agent-provider";
import { AI_TEXT_MODEL, AI_FALLBACK_MODEL, VERTEX_LOCATION } from "@/lib/ai-config";
import { AIExecutionService } from "@/lib/services/ai-execution-service";

export interface AntigravityTsProviderOptions {
  timeoutMs?: number;
  model?: string;
  apiKey?: string;
}

/**
 * Proveedor TypeScript para el plano de ejecución de agentes.
 * La política transversal de fallback, timeout y parsing JSON vive en
 * AIExecutionService; este adaptador sólo conoce el SDK de Google.
 */
export class AntigravityTsProvider implements IAgentProvider {
  private readonly timeoutMs?: number;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor(options: AntigravityTsProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs;
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
        httpOptions: { headers: { "x-goog-api-key": apiKey } }
      });
    }

    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
      location: VERTEX_LOCATION
    });
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, prompt } = manifest;
    const systemInstruction =
      `Eres un agente de marketing técnico de EcomShop. Tu rol es ${manifest.agentRole}. Produce respuestas estructuradas sin inventar especificaciones no verificadas.`;

    try {
      const client = this.getClient();
      const initialModel = this.model.replace(/-001$/, "");
      const candidateModels = Array.from(
        new Set([initialModel, AI_TEXT_MODEL, AI_FALLBACK_MODEL].filter(Boolean))
      );

      const execution = await new AIExecutionService().generateJson({
        models: candidateModels,
        timeoutMs: this.timeoutMs,
        generate: async (model) => {
          const response = await client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          });

          const rawMeta = response.usageMetadata;
          return {
            text: response.text || "",
            usageMetadata: rawMeta
              ? {
                  promptTokenCount: rawMeta.promptTokenCount,
                  candidatesTokenCount: rawMeta.candidatesTokenCount,
                  totalTokenCount: rawMeta.totalTokenCount,
                  thoughtsTokenCount: rawMeta.thoughtsTokenCount,
                  cachedContentTokenCount: rawMeta.cachedContentTokenCount
                }
              : undefined
          };
        }
      });

      const usageMetadata = execution.usageMetadata;
      try {
        const { recordAiUsage } = await import("@/server/services/ai-budget");
        const projectId =
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.GCP_PROJECT ||
          "ecomshop-marketing-prod";
        const workspaceId =
          typeof manifest.payload?.workspaceId === "string"
            ? manifest.payload.workspaceId
            : "default-ecomspain";
        const sku =
          typeof manifest.payload?.sku === "string"
            ? manifest.payload.sku
            : "UNKNOWN_SKU";

        await recordAiUsage(
          "system-orchestrator",
          "gemini_generation",
          usageMetadata?.promptTokenCount ?? 0,
          usageMetadata?.candidatesTokenCount ?? 0,
          0,
          { email: "orchestrator@ecomspain.com", displayName: "Antigravity Orchestrator" },
          execution.model,
          {
            projectId,
            workspaceId,
            runId: manifest.runId,
            taskId,
            sku,
            actualModel: execution.model,
            fallbackUsed: execution.fallbackUsed,
            usageMetadata
          }
        );
      } catch (finopsError) {
        console.warn("[AntigravityTsProvider] Evento FinOps no pudo registrarse:", finopsError);
      }

      return {
        taskId,
        exitCode: 0,
        stdout: execution.rawText,
        stderr: "",
        timedOut: false,
        filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
        summary: `Agente TypeScript completó exitosamente la tarea ${taskId}`,
        actualModel: execution.model,
        fallbackUsed: execution.fallbackUsed,
        usageMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const normalizedMessage =
        errorMessage.includes("403") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("unregistered callers") ||
        errorMessage.includes("API key not valid")
          ? "API Key de Gemini no configurada en las variables de entorno de Cloud Run"
          : errorMessage;

      console.error(
        `[AntigravityTsProvider Error] Tarea ${taskId} falló sin contingencia genérica:`,
        normalizedMessage
      );

      return {
        taskId,
        exitCode: 1,
        stdout: "",
        stderr: `[AntigravityTsProviderError]: ${normalizedMessage}`,
        timedOut: normalizedMessage.includes("Timeout"),
        filesChanged: [],
        summary: `Fallo en la ejecución del agente TypeScript para la tarea ${taskId}: ${normalizedMessage}`
      };
    }
  }
}

export const AntigravityPythonSdkProvider = AntigravityTsProvider;
