/**
 * Configuración centralizada y Single Source of Truth para modelos de Inteligencia Artificial
 * y parámetros de integración con Google GenAI / Vertex AI en EcomShop Content Platform.
 */

export const AI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const AI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
export const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";

/**
 * Lista ordenada de modelos de texto para ejecución con fallback automático.
 */
export const SUPPORTED_AI_TEXT_MODELS = Array.from(
  new Set([AI_TEXT_MODEL, AI_FALLBACK_MODEL])
).filter(Boolean);
