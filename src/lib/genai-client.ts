import { GoogleGenAI } from "@google/genai";
import { AI_TEXT_MODEL, AI_FALLBACK_MODEL, VERTEX_LOCATION } from "@/lib/ai-config";

/**
 * Cliente SDK unificado para Google GenAI en GCP Cloud Run (Vertex AI) / Local Development.
 */

/** Regiones con soporte activo de Imagen 3 en Vertex AI */
export const IMAGEN_SUPPORTED_LOCATIONS = ["us-central1", "europe-west4"] as const;
export type ImagenLocation = (typeof IMAGEN_SUPPORTED_LOCATIONS)[number];

const isProduction = process.env.NODE_ENV === "production";
const hasGcpProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT);
const getApiKeyFromEnv = (): string =>
  (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

/**
 * Determina si se debe usar Vertex AI o Gemini API Studio.
 * En el entorno corporativo de EcomShop en GCP (europe-west1 / us-central1),
 * Vertex AI es el motor primario empresarial salvo que se fuerce explícitamente API key.
 */
export function isVertexEnabled(): boolean {
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.USE_VERTEX_AI === "true") return true;
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT) return true;
  const apiKey = getApiKeyFromEnv();
  if (apiKey) return false;
  return true;
}

export function createGenAIInstance(apiKeyOverride?: string, locationOverride?: string): GoogleGenAI {
  const isServer = typeof window === "undefined";
  const explicitKey = apiKeyOverride?.trim();

  // Si se solicita Vertex AI o estamos en entorno GCP con proyecto, usar Vertex AI
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod";
  const location = locationOverride || VERTEX_LOCATION;

  if (!explicitKey && (isVertexEnabled() || hasGcpProject)) {
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  const apiKey = explicitKey || getApiKeyFromEnv() || (isServer ? "" : "dummy_browser_key");
  if (apiKey) {
    return new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "x-goog-api-key": apiKey,
        },
      },
    });
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
  });
}

/** Singleton por defecto para texto/chat */
export const aiClient = createGenAIInstance();

/**
 * Factory de cliente Vertex AI especializado para Imagen 3.
 */
export function getVertexImageClient(location: ImagenLocation = "us-central1"): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
    location: process.env.IMAGEN_LOCATION || location,
  });
}

/**
 * Devuelve una instancia de GenAI según se pase apiKeyOverride o se use el cliente singleton.
 */
export function getGenAIClient(apiKeyOverride?: string): GoogleGenAI {
  if (apiKeyOverride?.trim()) {
    return createGenAIInstance(apiKeyOverride);
  }
  return createGenAIInstance();
}

export function getActiveGeminiModel(apiKey?: string): string {
  return AI_TEXT_MODEL;
}
