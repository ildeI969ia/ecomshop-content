/**
 * Configuración centralizada y Single Source of Truth para modelos de Inteligencia Artificial
 * y parámetros de integración con Google GenAI / Vertex AI en EcomShop Content Platform.
 */

export const AI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
export const AI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
export const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";

/**
 * Lista ordenada de modelos de texto para ejecución con fallback automático.
 */
export const SUPPORTED_AI_TEXT_MODELS = Array.from(
  new Set([AI_TEXT_MODEL, AI_FALLBACK_MODEL])
).filter(Boolean);

/**
 * Presupuesto temporal común para llamadas síncronas de IA desde API routes.
 * Debe mantenerse por debajo del límite de ejecución de los endpoints Next.js.
 */
export const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 95000);
/**
 * Normaliza los nombres de modelos para garantizar compatibilidad con Vertex AI.
 * En Vertex AI publisher models, "gemini-2.0-flash" requiere el sufijo de versión (ej. "-001").
 */
export function normalizeVertexModelName(modelName: string): string {
  if (modelName === "gemini-2.0-flash") return "gemini-2.0-flash-001";
  return modelName;
}

