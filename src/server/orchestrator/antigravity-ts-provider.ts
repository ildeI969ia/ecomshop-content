import { GoogleGenAI } from "@google/genai";
import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { IAgentProvider } from "./agent-provider";

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
    this.model = options.model || process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
    const location = process.env.VERTEX_LOCATION || "us-central1";

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
      const candidateModels = [
        this.model || process.env.GEMINI_MODEL || "gemini-2.0-flash",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-001",
        "gemini-2.0-flash-001"
      ].filter(Boolean);

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

      return {
        taskId,
        exitCode: 0,
        stdout: responseText,
        stderr: "",
        timedOut: false,
        filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
        summary: `Agente TypeScript completó exitosamente la tarea ${taskId}`,
        actualModel: usedModel,
        fallbackUsed
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
