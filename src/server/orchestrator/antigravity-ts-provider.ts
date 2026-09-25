import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { IAgentProvider } from "./agent-provider";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

export interface AntigravityTsProviderOptions {
  timeoutMs?: number;
  model?: string;
  apiKey?: string;
}

/**
 * Proveedor 100% nativo en TypeScript para la ejecución de agentes usando Gemini 2.5 Flash
 * vía el SDK oficial `@google/genai` (o Vertex AI).
 * Sustituye la dependencia de Python, scripts de terceros y runtime externo.
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

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, prompt } = manifest;

    const systemInstruction = `Eres un agente de marketing técnico de EcomShop. Tu rol es ${manifest.agentRole}. Produce respuestas estructuradas sin inventar especificaciones no verificadas.`;

    try {
      const ai = getGenAIClient(this.apiKey);
      const activeModel = this.model || getActiveGeminiModel(this.apiKey);

      // Implementación de timeout de 20s
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED: La generación de la IA excedió el límite de 20s")), this.timeoutMs);
      });

      const generationPromise = ai.models.generateContent({
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
      const errorMessage = err?.message || String(err);
      console.error(`[AntigravityTsProvider Error] Tarea ${taskId} falló:`, err);

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
