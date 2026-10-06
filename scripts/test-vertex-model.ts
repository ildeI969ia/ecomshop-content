import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: "ecomshop-marketing-prod",
    location: "us-central1"
  });

  console.log("Probando gemini-2.5-flash con Vertex AI...");
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Genera un JSON con: { status: 'ok', model: 'gemini-2.5-flash' }",
    config: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 2048
    }
  });

  console.log("Respuesta recibida:", res.text);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
