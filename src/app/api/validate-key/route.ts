import { NextResponse } from "next/server";
import { getGenAIClient } from "@/lib/genai-client";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key && !isVertex) {
      return NextResponse.json({ valid: false, message: "No se ha proporcionado API Key ni entorno Vertex AI" }, { status: 400 });
    }

    const ai = getGenAIClient(apiKey);

    // Modelos válidos en Google AI Studio / Vertex AI
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let verifiedModel = candidateModels[0];
    let response = null;
    let lastErr = null;

    for (const candidate of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: candidate,
          contents: "ping",
          config: { maxOutputTokens: 5 }
        });
        if (response) {
          verifiedModel = candidate;
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (response) {
      return NextResponse.json({ 
        valid: true, 
        model: verifiedModel, 
        backend: isVertex && !apiKey ? "Vertex AI (europe-west1)" : "Google AI Studio",
        status: "online" 
      });
    }

    if (lastErr) throw lastErr;
    return NextResponse.json({ valid: false, message: "Respuesta vacía de Gemini" }, { status: 400 });
  } catch (error: any) {
    console.error("[VALIDATE_KEY_ERROR]", error);
    let errorDetail = error?.message || "Clave inválida o sin permisos en Google Cloud";
    if (typeof errorDetail === "string" && errorDetail.includes("{")) {
      try {
        const parsed = JSON.parse(errorDetail.substring(errorDetail.indexOf("{")));
        if (parsed?.error?.message) {
          errorDetail = parsed.error.message;
        }
      } catch {}
    }
    return NextResponse.json({ 
      valid: false, 
      message: errorDetail
    }, { status: 400 });
  }
}
