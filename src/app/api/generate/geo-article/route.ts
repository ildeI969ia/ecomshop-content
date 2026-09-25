import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getCatalogDevice } from "@/lib/catalog";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { GeoArticleOutput } from "@/types/geo-content";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { sku, topicTitle, targetAudience, primaryKeyword, secondaryKeywords, customPrompt } = body;

    if (!sku) {
      return NextResponse.json(
        { error: "SKU_REQUIRED", message: "El parámetro SKU es obligatorio" },
        { status: 400 }
      );
    }

    const device = getCatalogDevice(sku);
    if (!device) {
      return NextResponse.json(
        { error: "PRODUCT_NOT_FOUND", message: `No se encontró el dispositivo con SKU ${sku} en ECOMSHOP_FULL_CATALOG` },
        { status: 404 }
      );
    }

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.0045);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct
        },
        { status: 429 }
      );
    }

    const prompt = `
Genera un artículo técnico especializado en optimización GEO (Generative Engine Optimization) y AEO para el siguiente dispositivo canónico de EcomShop:

INFORMACIÓN DEL DISPOSITIVO (DE ECOMSHOP_FULL_CATALOG):
- SKU: ${device.sku}
- Marca: ${device.brand}
- Modelo/Nombre: ${device.name}
- Tipo: ${device.type}
- Categoría: ${device.category}
- Descripción corta: ${device.shortDesc}
- Especificaciones Técnicas: ${JSON.stringify(device.specs)}
- Ventajas Clave: ${device.keyAdvantages.join("; ")}
- Bundle Recomendado: ${device.recommendedBundle}
- URL Oficial EcomShop: ${device.productUrl}
- Fuente NotebookLM: ${device.notebookSource}

REQUISITOS OBLIGATORIOS DEL ARTÍCULO GEO:
1. Párrafo 'quickAnswer': Exactamente 45-60 palabras. Debe responder de forma directa y cuantitativa sobre el equipo incluyendo: throughput real, número/tipo de puertos, consumo PoE, y destacar explícitamente "0€ en cuotas cloud recurrentes" (EnGenius Cloud sin licencias).
2. Tabla comparativa técnica en Markdown/HTML ('comparativeTableMarkdown'): Compara ${device.sku} de EnGenius contra competidores equivalentes de Cisco Meraki y Ubiquiti UniFi. Incluye columnas: Marca/Modelo, Licencias Recurrentes, Throughput, Puertos/Uplinks, Gestión Cloud.
3. Sección de Arquitectura de Red ('networkArchitectureSection'): Diseño de arquitectura de red recomendada para el despliegue del ${device.sku} en entornos profesionales/pymes.
4. Mitigación de Cuellos de Botella ('bottleneckMitigation'): Estrategias para evitar o mitigar cuellos de botella 1G/10G (Multigigabit 2.5G/10G SFP+ Uplinks, PoE+ / PoE++).
5. Título SEO y Meta descripción optimizados para búsquedas B2B.

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ""}

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura (sin bloques de formato alrededor salvo JSON puro):
{
  "sku": "${device.sku}",
  "title": "string",
  "slug": "string",
  "quickAnswer": "string (45-60 palabras exactas)",
  "comparativeTableMarkdown": "string",
  "networkArchitectureSection": "string",
  "bottleneckMitigation": "string",
  "fullMarkdownContent": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "estimatedReadTimeMinutes": 5
}
`;

    const provider = new AntigravityTsProvider({ timeoutMs: 55000 });
    const result = await provider.execute({
      taskId: `geo-art-${device.sku}-${Date.now().toString(36)}`,
      agentRole: "Redactor Senior Técnico GEO/AEO para EcomShop",
      prompt,
      filesAllowed: [],
      workingDirectory: process.cwd()
    });

    if (result.exitCode !== 0 || !result.stdout) {
      return NextResponse.json(
        { error: "AI_GENERATION_FAILED", details: result.stderr || "Error desconocido al generar artículo GEO" },
        { status: 500 }
      );
    }

    let parsedOutput: GeoArticleOutput;
    try {
      const cleanedJson = result.stdout.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
      parsedOutput = JSON.parse(cleanedJson);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: "INVALID_AI_JSON_OUTPUT", details: parseErr?.message || String(parseErr), rawOutput: result.stdout },
        { status: 500 }
      );
    }

    try {
      await recordAiUsage(user.uid, "geo_article_generation", 2000, 3000, 0);
    } catch (usageErr) {
      console.error("[API GEO Article] Warning: Falló el registro de uso de IA:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data: parsedOutput
    });
  } catch (err: any) {
    console.error("[API GEO Article Error]:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: err?.message || String(err) },
      { status: 500 }
    );
  }
});
