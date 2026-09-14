import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key) {
      return NextResponse.json({ valid: false, message: "No se ha proporcionado API Key" }, { status: 400 });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });

    // Verificación rápida con una llamada mínima
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "ping",
      config: { maxOutputTokens: 5 }
    });

    if (response.text) {
      return NextResponse.json({ valid: true, model: "gemini-2.5-flash", status: "online" });
    }

    return NextResponse.json({ valid: false, message: "Respuesta vacía de Gemini" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ 
      valid: false, 
      message: error?.message || "Clave inválida o error de conexión con Google Gemini" 
    }, { status: 400 });
  }
}
