import { ContentOutput } from "@/lib/schema";
import { validateChannelRules, ChannelValidationReport } from "./channel-rules";

/**
 * Re-generación dirigida de canales con reglas fallidas (Fase 6d - Máx 1 reintento)
 */
export async function autoFixFailedChannels(
  content: ContentOutput,
  apiKey?: string
): Promise<{ updatedContent: ContentOutput; report: ChannelValidationReport; retried: boolean }> {
  let report = validateChannelRules(content);

  // Si todas las reglas pasan o no hay canales fallidos, retornar sin reintento
  if (report.passed || report.failedChannels.length === 0) {
    return { updatedContent: content, report, retried: false };
  }

  try {
    const { getGenAIClient, getActiveGeminiModel } = await import("@/lib/genai-client");
    const ai = getGenAIClient(apiKey);
    const activeModel = getActiveGeminiModel(apiKey);

    const failed = report.failedChannels;
    const prompt = `
Ajusta y corrige ÚNICAMENTE los activos de los siguientes canales que incumplen reglas de calidad B2B:
Canales a corregir: ${failed.join(", ")}

REGLAS ESTRICTAS A CUMPLIR:
${failed.includes("blog") ? "- BLOG: Título ≤ 60 car, meta descripción 140-160 car, H2 y H3, bloque FAQ (3-5 preguntas), ≥ 2 enlaces internos a ecomshop.es, alt en imágenes, sin palabras prohibidas ('el mejor', 'garantizado', '100%').\n" : ""}${failed.includes("whatsapp") ? "- WHATSAPP: ≤ 600 caracteres total, máximo 3 emojis, exactamente 1 enlace con UTM.\n" : ""}${failed.includes("linkedin") ? "- LINKEDIN: Gancho en las 2 primeras líneas (≤ 210 car), 3 a 5 hashtags, máximo 1.300 caracteres, sin enlaces en el cuerpo (enlace en comentario).\n" : ""}${failed.includes("mailchimp") ? "- MAILCHIMP: Asunto A ≤ 50 caracteres, previewText ≤ 90 caracteres, único CTA principal.\n" : ""}

DATOS DEL CONTENIDO BASE:
- Título actual: "${content.topicTitle}"
- Extracto actual: "${content.blog?.cleanPlainTextExcerpt || content.blog?.metaDescription}"

Devuelve un JSON solo con los campos de los canales corregidos (${failed.join(", ")}).
`;

    const generatePromise = ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[ChannelFixer] Timeout en reintento dirigido")), 15000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const fixedJson = JSON.parse(rawText);

    const updated: ContentOutput = {
      ...content,
      ...(fixedJson.blog && failed.includes("blog") ? { blog: { ...content.blog, ...fixedJson.blog } } : {}),
      ...(fixedJson.mailchimp && failed.includes("mailchimp") ? { mailchimp: { ...content.mailchimp, ...fixedJson.mailchimp } } : {}),
      ...(fixedJson.whatsapp && failed.includes("whatsapp") ? { whatsapp: { ...content.whatsapp, ...fixedJson.whatsapp } } : {}),
      ...(fixedJson.linkedin && failed.includes("linkedin") ? { linkedin: { ...content.linkedin, ...fixedJson.linkedin } } : {})
    };

    // Re-evaluar informe final
    const finalReport = validateChannelRules(updated);
    return { updatedContent: updated, report: finalReport, retried: true };
  } catch (err) {
    console.warn("[ChannelFixer] Reintento dirigido fallido o no disponible:", err);
    return { updatedContent: content, report, retried: true };
  }
}
