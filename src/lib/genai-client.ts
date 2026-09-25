import { GoogleGenAI } from "@google/genai";

/**
 * Cliente SDK unificado para Google GenAI en GCP Cloud Run (Vertex AI) / Local Development.
 *
 * En producción (GCP Cloud Run):
 * - Usa Vertex AI con Application Default Credentials (ADC) o Service Account asociada.
 * - Proyecto GCP: ecomshop-marketing-prod (o process.env.GOOGLE_CLOUD_PROJECT)
 * - Región de texto/chat: process.env.GOOGLE_CLOUD_LOCATION || 'europe-west1'
 *
 * En desarrollo local:
 * - Soporta GOOGLE_APPLICATION_CREDENTIALS con ADC en Vertex AI.
 * - Soporta GEMINI_API_KEY / GOOGLE_API_KEY como fallback.
 *
 * NOTA: Imagen 3 solo está disponible en us-central1 y europe-west4.
 * Usar getVertexImageClient() para obtener un cliente en una región soportada.
 */

/** Regiones con soporte activo de Imagen 3 en Vertex AI */
export const IMAGEN_SUPPORTED_LOCATIONS = ["us-central1", "europe-west4"] as const;
export type ImagenLocation = (typeof IMAGEN_SUPPORTED_LOCATIONS)[number];

const isProduction = process.env.NODE_ENV === "production";
const hasGcpProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT);
const hasApiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY);
const shouldUseVertex =
  process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" ||
  process.env.USE_VERTEX_AI === "true" ||
  (isProduction && hasGcpProject && !hasApiKey) ||
  (!hasApiKey && hasGcpProject);

/** Singleton para texto/chat — puede usar europe-west1 sin problema */
export const aiClient = new GoogleGenAI(
  shouldUseVertex
    ? {
        vertexai: true, // ← lowercase correcto según tipo ApiClientInitOptions del SDK
        project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
        location: process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "europe-west1",
      }
    : {
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || "",
      }
);

/**
 * Factory de cliente Vertex AI especializado para Imagen 3.
 * Siempre usa una región con soporte de Imagen 3.
 *
 * @param location - Región de Vertex AI. Por defecto "us-central1".
 */
export function getVertexImageClient(location: ImagenLocation = "us-central1"): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true, // ← lowercase 'ai' para SDK @google/genai v2+
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ecomshop-marketing-prod",
    location: process.env.IMAGEN_LOCATION || location,
  });
}

/**
 * Función factory unificada que devuelve el cliente singleton `aiClient`
 * o una instancia configurada con un override de API key en tiempo de ejecución.
 * Soporta tanto claves legadas (AIza...) como las nuevas Authorization Keys de Google (AQ...).
 */
export function getGenAIClient(apiKeyOverride?: string): GoogleGenAI {
  const cleanKey = apiKeyOverride?.trim();
  if (cleanKey) {
    // vertexai: false es OBLIGATORIO cuando se usa una Gemini API Key de AI Studio.
    // Sin esta propiedad, el SDK auto-detecta GOOGLE_CLOUD_PROJECT del entorno y
    // enruta a aiplatform.googleapis.com en lugar de generativelanguage.googleapis.com,
    // causando el error "Requests to this API are blocked".
    return new GoogleGenAI({
      vertexai: false,
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          "x-goog-api-key": cleanKey,
        },
      },
    });
  }

  return aiClient;
}


/**
 * Devuelve el modelo adecuado según el contexto:
 * - Para Google AI Studio con claves de nuevo usuario: 'gemini-2.5-flash'
 * - Para Vertex AI en GCP Cloud Run: 'gemini-2.5-flash'
 */
export function getActiveGeminiModel(apiKey?: string): string {
  if (apiKey?.trim()) {
    return "gemini-2.5-flash";
  }
  return "gemini-2.5-flash";
}
