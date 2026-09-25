/**
 * Sanitiza y parsea respuestas de modelos de IA asegurando la extracción limpia de JSON.
 * Elimina bloques markdown ```json y ```, espacios residuales y delimita desde el primer '{' (o '[')
 * hasta el último '}' (o ']').
 */
export function safeParseJson<T = any>(rawText: string): { success: boolean; data?: T; error?: string } {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "ENTRADA_INVALIDA: La respuesta de la IA está vacía o no es texto." };
  }

  let cleaned = rawText.trim();

  // 1. Quitar cercados de código Markdown (```json ... ``` o ``` ...)
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  // 2. Extraer el sub-string JSON delimitado entre el primer '{' / '[' y el último '}' / ']'
  const firstCurly = cleaned.indexOf("{");
  const firstSquare = cleaned.indexOf("[");
  
  let startIndex = -1;
  let endIndex = -1;

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
    startIndex = firstCurly;
    endIndex = cleaned.lastIndexOf("}");
  } else if (firstSquare !== -1) {
    startIndex = firstSquare;
    endIndex = cleaned.lastIndexOf("]");
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }

  // 3. Intento seguro de parseo
  try {
    const data = JSON.parse(cleaned) as T;
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON_PARSE_ERROR: No se pudo parsear el JSON generado por el modelo: ${err?.message || String(err)}`
    };
  }
}
