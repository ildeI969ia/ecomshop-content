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
    this.timeoutMs = options.timeoutMs ?? 20000; // 20 segundos máximo por especificación
    this.model = options.model ?? "gemini-2.5-flash";
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
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
      location: process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "europe-west1"
    });
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, prompt } = manifest;

    const systemInstruction = `Eres un agente de marketing técnico de EcomShop. Tu rol es ${manifest.agentRole}. Produce respuestas estructuradas sin inventar especificaciones no verificadas.`;

    try {
      const client = this.getClient();
      const activeModel = this.model || "gemini-2.5-flash";

      // Implementación de timeout de 20s
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED: La generación de la IA excedió el límite de 20s")), this.timeoutMs);
      });

      const generationPromise = client.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      const response = await Promise.race([generationPromise, timeoutPromise]) as any;
      const responseText = response.text || "";

      return {
        taskId,
        exitCode: 0,
        stdout: responseText,
        stderr: "",
        timedOut: false,
        filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
        summary: `Agente TypeScript completó exitosamente la tarea ${taskId}`
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

      console.error(`[AntigravityTsProvider Error] Tarea ${taskId} falló:`, errorMessage);

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
