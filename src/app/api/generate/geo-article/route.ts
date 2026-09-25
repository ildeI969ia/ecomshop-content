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

    const productContext = product
      ? `
- SKU: ${product.sku}
- Marca: ${product.brand}
- Modelo exacto: ${product.model}
- Nombre completo: ${product.name}
- Tipo de dispositivo / Categoría: ${product.deviceType} (${product.category})
- Especificaciones reales verificadas: ${JSON.stringify(product.specs || [])}
- Interfaces y puertos reales: ${JSON.stringify(product.interfaces || [])}
- Requisitos de alimentación / PoE: ${product.powerRequirements} (${product.poeType})
- Ventajas clave reales: ${JSON.stringify(product.keyAdvantages || [])}
- Modo de gestión: ${product.managementMode}
`
      : `- Tema / SKU: "${topicTitle || "Equipamiento de Redes B2B"}"`;

    const prompt = `
Eres un Ingeniero Técnico de Sistemas y Redactor GEO / SEO B2B para EcomShop.
Genera un artículo optimizado para Generative Engine Optimization (GEO) y motores IA (Perplexity, SearchGPT, Gemini).

INSTRUCCIÓN ESTRICTA DE GROUNDING TÉCNICO Y PERTINENCIA DE PRODUCTO:
El artículo debe centrarse exclusivamente en el producto solicitado (${product ? `${product.model} de la marca ${product.brand}` : topicTitle}). Queda terminantemente prohibido mencionar modelos, marcas o tecnologías ajenas al producto indicado.
- Si el SKU solicitado es un router 4G/LTE (ej. RUTX11) o un inyector PoE (ej. EPA5006GAT), el artículo DEBE tratar exclusivamente sobre conectividad celular industrial o inyectores PoE respectivamente. NUNCA sobre puntos de acceso Wi-Fi 7 ni switches si el producto no lo es.
- Queda prohibido usar datos, especificaciones o tablas por defecto de EnGenius ECW546 ni de ningún otro producto cuando el SKU solicitado no sea ese.

DATOS TÉCNICOS OBLIGATORIOS DEL PRODUCTO SOLICITADO:
${productContext}

DEBES GENERAR UN ARTÍCULO COMPLETO CON:
1. "title": Título informativo y técnico GEO enfocado estrictamente en ${product ? `${product.brand} ${product.model}` : "el producto"}.
2. "metaDescription": Metadescripción enfocada en respuestas precisas de IA sobre las capacidades reales de este SKU.
3. "htmlContent": Artículo completo en HTML limpio, incluyendo:
   - Introducción con respuesta directa (Direct Answer Snippet) citando explícitamente el modelo ${product ? product.model : ""}.
   - Tabla comparativa técnica HTML (<table class="w-full border-collapse">...) comparando la ficha técnica REAL de este equipo (${product ? product.model : ""}) con alternativas de su misma categoría de mercado.
   - Secciones con encabezados H2/H3 y viñetas explicativas enfocadas en sus casos de uso reales (ej. conectividad M2M/4G para routers celulares, PoE para inyectores, cobertura in situ para APs).
4. "jsonLd": Schema org de datos estructurados JSON-LD tipo "Product" o "TechArticle" (en formato cadena de texto JSON limpia) con la marca "${product?.brand || "EcomShop"}" y modelo "${product?.model || sku}".
5. "markdownContent": El artículo completo convertido a formato Markdown con la tabla y metadatos.

Devuelve un JSON estrictamente estructurado:
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
