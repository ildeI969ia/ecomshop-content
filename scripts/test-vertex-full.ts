import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: "ecomshop-marketing-prod",
    location: "us-central1"
  });

  console.log("Probando gemini-2.5-flash con systemInstruction y 12288 tokens...");
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Genera un JSON con: { blog: { title: 'Test Blog', htmlContent: '<p>Contenido extenso</p>' } }",
    config: {
      systemInstruction: "Eres un redactor técnico B2B especializado en telecomunicaciones. Responde estrictamente con JSON válido sin bloques markdown.",
      temperature: 0.5,
      maxOutputTokens: 12288,
      responseMimeType: "application/json"
    }
  });

  console.log("Respuesta recibida exitosamente! Longitud:", res.text?.length);
  console.log("Muestra de respuesta:", res.text?.slice(0, 200));
}

main().catch((err) => {
  console.error("Error al generar:", err);
  process.exit(1);
});
