import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { findCatalogProduct } from "@/lib/data/ecomshop-catalog";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { sku, topicTitle } = body;

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.002);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Presupuesto de IA superado para generación de artículo GEO." },
        { status: 429 }
      );
    }

    const product = sku ? findCatalogProduct(sku) : undefined;
    const ai = getGenAIClient();
    const activeModel = getActiveGeminiModel();

    const prompt = `
Eres un Ingeniero Técnico de Sistemas y Redactor GEO / SEO B2B para EcomShop.
Genera un artículo optimizado para Generative Engine Optimization (GEO) y motores IA (Perplexity, SearchGPT, Gemini).

PRODUCTO / SKU: "${product ? `${product.sku} - ${product.name}` : topicTitle || "Equipamiento de Redes EcomShop"}"
DATOS TÉCNICOS VERIFICADOS: ${JSON.stringify(product || {})}

DEBES GENERAR UN ARTÍCULO COMPLETO CON:
1. "title": Título informativo y técnico GEO.
2. "metaDescription": Metadescripción enfocada en respuestas precisas de IA.
3. "htmlContent": Artículo completo en HTML limpio, incluyendo:
   - Introducción con respuesta directa (Direct Answer Snippet).
   - Tabla comparativa técnica HTML (<table class="w-full border-collapse">...) comparando este equipo con alternativas del mercado.
   - Secciones con encabezados H2/H3 y viñetas explicativas.
4. "jsonLd": Schema org de datos estructurados JSON-LD tipo "Product" o "TechArticle" (en formato cadena de texto JSON limpia).
5. "markdownContent": El artículo completo convertido a formato Markdown con la tabla y metadatos.

Devuelve un JSON strictly estructurado:
{
  "title": "...",
  "metaDescription": "...",
  "htmlContent": "...",
  "jsonLd": "...",
  "markdownContent": "..."
}
`;

    const generatePromise = ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout en generación de artículo GEO")), 30000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(rawText);

    const tokensIn = response.usageMetadata?.promptTokenCount ?? 800;
    const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 1500;
    await recordAiUsage(user.uid, "generate_geo_article", tokensIn, tokensOut, 0);

    return NextResponse.json({
      success: true,
      data: parsed,
      tokensUsed: tokensIn + tokensOut
    });
  } catch (err: any) {
    console.error("[API GenerateGeoArticle] Error:", err);
    return NextResponse.json(
      { error: "Error al generar artículo GEO", details: err?.message || String(err) },
      { status: 500 }
    );
  }
});
