import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { findCatalogProduct } from "@/lib/data/ecomshop-catalog";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

export const maxDuration = 60;

export interface EditorialAngle {
  id: string;
  title: string;
  intent: string;
  hook: string;
  targetAudience: string;
}

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { sku, brand: inputBrand, model: inputModel, category: inputCategory, specs: inputSpecs } = body;

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Presupuesto de IA superado para sugerencia de ángulos editoriales." },
        { status: 429 }
      );
    }

    const cleanSku = (sku || "").trim().toUpperCase();
    const catalogItem = cleanSku ? findCatalogProduct(cleanSku) : undefined;

    const brand = catalogItem?.brand || inputBrand || "EcomShop";
    const model = catalogItem?.name || inputModel || cleanSku || "Equipamiento de Redes B2B";
    const category = catalogItem?.category || inputCategory || "general";
    const specs = catalogItem?.specs || inputSpecs || catalogItem?.interfaces || [];

    const fallbackAngles: EditorialAngle[] = [
      {
        id: "angle-engineering",
        title: `Ingeniería Avanzada: Optimización y Resolución de Problemas en ${model}`,
        intent: "RESOLUCION_PROBLEMAS",
        hook: `Cómo prevenir interferencias y caídas de servicio aprovechando la arquitectura de ${brand} ${model}.`,
        targetAudience: "Ingenieros de Red, Instaladores IT y MSPs"
      },
      {
        id: "angle-tco",
        title: `Retorno de Inversión (ROI) y Migración: Auditoría TCO de ${model}`,
        intent: "ROI_MIGRACION",
        hook: `Eliminación de licencias anuales recurrentes y amortización garantizada de hardware con ${brand}.`,
        targetAudience: "Directores de TIC, Responsables de Compras y CFOs"
      },
      {
        id: "angle-case-study",
        title: `Caso de Uso Sectorial: Despliegue de ${model} en Entornos Exigentes`,
        intent: "CASO_DE_USO",
        hook: `Estrategia de alta disponibilidad para entornos corporativos, hospitality y naves logísticas.`,
        targetAudience: "Arquitectos de Infraestructura y Directores Operativos"
      }
    ];

    const ai = getGenAIClient();
    const activeModel = getActiveGeminiModel();

    const prompt = `
Eres un Director Editorial de Inteligencia B2B especializado en Telecomunicaciones, Redes e Infraestructura IT.
Tu misión es investigar las especificaciones reales del siguiente producto y sugerir EXACTAMENTE 3 ángulos editoriales diferenciados e impactantes para artículos técnicos B2B:

DATOS DEL PRODUCTO:
- SKU: ${cleanSku || "Genérico"}
- Marca: ${brand}
- Modelo: ${model}
- Categoría: ${category}
- Especificaciones: ${JSON.stringify(specs)}

DEBES GENERAR OBLIGATORIAMENTE 3 ÁNGULOS CON ESTOS ENFOQUES:
1. ÁNGULO 1: [RESOLUCIÓN DE PROBLEMAS / INGENIERÍA] - Enfocado en resolver un dolor técnico complejo (interferencias RF, caídas de tensión PoE, latencia MLO, failover 4G/Dual-SIM, etc.).
2. ÁNGULO 2: [RETORNO DE INVERSIÓN Y MIGRACIÓN (TCO)] - Enfocado en ahorro financiero, sustitución de parque obsoleto, 0€ cuotas de licencias y rentabilidad B2B.
3. ÁNGULO 3: [CASO DE USO SECTORIAL ESPECÍFICO] - Enfocado en una industria concreta (Hospitality/Hoteles, Naves Logísticas, Educación/Campus o Despachos Corporativos).

REGLA CRÍTICA:
- NUNCA uses como título "Despliegue y Solución B2B con ${cleanSku}". Genera títulos periodísticos, atractivos y técnicos.

Formato JSON de salida requerido (estrictamente una lista de 3 objetos):
{
  "angles": [
    {
      "id": "angle-engineering",
      "title": "Título técnico potente sin frases genéricas",
      "intent": "RESOLUCION_PROBLEMAS",
      "hook": "Gancho editorial de 1-2 frases",
      "targetAudience": "Público objetivo"
    },
    {
      "id": "angle-tco",
      "title": "Título enfocado en ROI y TCO",
      "intent": "ROI_MIGRACION",
      "hook": "Gancho enfocado en coste y cuotas cero",
      "targetAudience": "Público objetivo"
    },
    {
      "id": "angle-case-study",
      "title": "Título enfocado en el sector de uso específico",
      "intent": "CASO_DE_USO",
      "hook": "Gancho del sector",
      "targetAudience": "Público objetivo"
    }
  ]
}
`;

    try {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawText);

      const tokensIn = response.usageMetadata?.promptTokenCount ?? 400;
      const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 600;
      await recordAiUsage(user.uid, "suggest_editorial_angles", tokensIn, tokensOut, 0);

      if (parsed.angles && Array.isArray(parsed.angles) && parsed.angles.length >= 3) {
        return NextResponse.json({
          success: true,
          sku: cleanSku,
          angles: parsed.angles.slice(0, 3)
        });
      }
    } catch (aiErr) {
      console.warn("[API SuggestAngles] Fallo en Gemini, usando fallback determinista:", aiErr);
    }

    return NextResponse.json({
      success: true,
      sku: cleanSku,
      angles: fallbackAngles
    });
  } catch (err: any) {
    console.error("[API SuggestAngles] Error:", err);
    return NextResponse.json(
      { error: "Error al generar sugerencias de ángulos editoriales", details: err?.message || String(err) },
      { status: 500 }
    );
  }
});
