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
 * Si existe una API Key explícita, PREFIERE Gemini API Studio para evitar bloqueos por ADC desconfigurado.
 */
export function isVertexEnabled(): boolean {
  const apiKey = getApiKeyFromEnv();
  if (apiKey) return false;
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.USE_VERTEX_AI === "true") return true;
  return hasGcpProject;
}

export function createGenAIInstance(apiKeyOverride?: string, locationOverride?: string): GoogleGenAI {
  const isServer = typeof window === "undefined";
  const apiKey = apiKeyOverride?.trim() || getApiKeyFromEnv() || (isServer ? "" : "dummy_browser_key");
  
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

  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod";
  const location = locationOverride || VERTEX_LOCATION;

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
  const apiKey = getApiKeyFromEnv();
  if (apiKey) {
    return createGenAIInstance(apiKey);
  }

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
  return aiClient;
}

export function getActiveGeminiModel(apiKey?: string): string {
  return AI_TEXT_MODEL;
}

