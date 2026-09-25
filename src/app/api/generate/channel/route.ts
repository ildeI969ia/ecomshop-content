import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { channel, sku, topicTitle, category, currentContent } = body;

    if (!channel) {
      return NextResponse.json(
        { error: "El canal es obligatorio" },
        { status: 400 }
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Has superado el límite de presupuesto de IA asignado." },
        { status: 429 }
      );
    }

    const ai = getGenAIClient();
    const activeModel = getActiveGeminiModel();

    const prompt = `
Eres el especialista multicanal B2B de EcomShop.
Genera o regenera el contenido exclusivo para el canal "${channel}".

EQUIPO/SKU: "${sku || topicTitle || "Dispositivo EcomShop"}"
CATEGORÍA: "${category || "redes"}"
CONTENIDO PREVIO: ${JSON.stringify(currentContent || {})}

FORMATO DE SALIDA SEGÚN CANAL:
- Si channel === "blog" o "geo": Devuelve un objeto JSON con { "title": "...", "htmlContent": "...", "slug": "...", "readingTimeMinutes": 5, "metaDescription": "..." }
- Si channel === "linkedin": Devuelve un objeto JSON con { "hook": "...", "body": "...", "takeaways": [...], "callToAction": "...", "hashtags": [...], "fullPostText": "..." }
- Si channel === "whatsapp": Devuelve un objeto JSON con { "headline": "...", "formattedMessage": "...", "callToAction": "...", "targetUrl": "..." }
- Si channel === "ecomshop": Devuelve un objeto JSON con { "title": "...", "argumentario": "...", "features": [...], "cmsHtml": "..." }

Devuelve únicamente el objeto JSON del canal solicitado.
`;

    const generatePromise = ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout en generación de canal")), 25000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(rawText);

    const tokensIn = response.usageMetadata?.promptTokenCount ?? 500;
    const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 900;
    await recordAiUsage(user.uid, `generate_channel_${channel}`, tokensIn, tokensOut, 0);

    return NextResponse.json({
      success: true,
      channel,
      data: parsed[channel] || parsed,
      tokensUsed: tokensIn + tokensOut
    });
  } catch (err: any) {
    console.error("[API GenerateChannel] Error:", err);
    return NextResponse.json(
      { error: "Error al generar contenido del canal", details: err?.message || String(err) },
      { status: 500 }
    );
  }
});
