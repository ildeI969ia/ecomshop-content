import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getCatalogDevice, ECOMSHOP_CATALOG } from "@/lib/catalog";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { ChannelContentOutput, ChannelType } from "@/types/geo-content";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { sku, channel, topicTitle, targetAudience, customPrompt } = body;

    if (!sku || !channel) {
      return NextResponse.json(
        { error: "MISSING_PARAMETERS", message: "Los parámetros 'sku' y 'channel' son obligatorios" },
        { status: 400 }
      );
    }

    const validChannels: ChannelType[] = ["linkedin", "whatsapp", "product-sheet"];
    if (!validChannels.includes(channel as ChannelType)) {
      return NextResponse.json(
        { error: "INVALID_CHANNEL", message: `El canal '${channel}' no es válido. Opciones: ${validChannels.join(", ")}` },
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

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.003);
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

    const availableAccessories = ECOMSHOP_CATALOG.filter(d => d.sku !== device.sku).slice(0, 5).map(d => ({
      sku: d.sku,
      name: d.name,
      url: d.productUrl
    }));

    const strictGroundingHeader = `
INSTRUCCIÓN ESTRICTA: El contenido debe centrarse exclusivamente en el producto solicitado (${device.brand} ${device.sku}). Queda terminantemente prohibido mencionar modelos o tecnologías ajenas al producto indicado.
- Si el SKU es un router 4G/LTE (ej. RUTX11) o un inyector (ej. EPA5006GAT), el texto DEBE tratar de routers industriales o de inyectores PoE, NUNCA de puntos de acceso Wi-Fi 7 ni switches de otras marcas.
`;

    let prompt = "";
    if (channel === "linkedin") {
      const dynamicHashtags = Array.from(new Set([
        `#${device.brand.replace(/\s+/g, "")}`,
        `#${device.sku.replace(/[^a-zA-Z0-9]/g, "")}`,
        "#Networking",
        "#EcomShop",
        device.category === "ROUTER_CELLULAR" ? "#IoT" : device.category === "WIFI_7" ? "#WiFi7" : "#B2B"
      ]));

      prompt = `
${strictGroundingHeader}

Genera una publicación profesional de LinkedIn B2B sobre el producto ${device.brand} ${device.sku}: ${device.name}.

ESPECIFICACIONES DEL PRODUCTO:
- SKU: ${device.sku}
- Marca: ${device.brand}
- Nombre: ${device.name}
- Tipo de dispositivo: ${device.type} (${device.category})
- Descripción: ${device.shortDesc}
- Especificaciones: ${JSON.stringify(device.specs)}
- Ventajas clave: ${device.keyAdvantages.join("; ")}
- URL: ${device.productUrl}

REQUISITOS OBLIGATORIOS LINKEDIN:
1. 'hook': Gancho comercial potente de menos de 210 caracteres antes de la línea 'ver más'. Debe captar de inmediato la atención de integradores/CTOs.
2. 'licensingCostComparison': Comparativa cuantitativa de propuesta de valor B2B destacando ventajas competitivas del modelo ${device.sku} de ${device.brand} (ej. 0€ cuotas de gestión en EnGenius Cloud si es EnGenius, o fiabilidad celular/M2M si es Teltonika/Ruckus) frente a competidores con suscripción recurrente o hardware convencional.
3. 'technicalSolution': Solución técnica detallada que resuelve el dispositivo en despliegues corporativos o pymes.
4. 'callToAction': Llamada a la acción clara dirigiendo a ecomshop.es.
5. 'fullPostText': El texto completo unificado listo para publicar en LinkedIn con emojis profesionales.
6. 'hashtags': Array de hashtags B2B relevantes ${JSON.stringify(dynamicHashtags)}.

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ""}

Responde ÚNICAMENTE con un JSON con la estructura:
{
  "channel": "linkedin",
  "hook": "string (max 210 chars)",
  "licensingCostComparison": "string",
  "technicalSolution": "string",
  "callToAction": "string",
  "fullPostText": "string",
  "hashtags": ["string"]
}
`;
    } else if (channel === "whatsapp") {
      prompt = `
${strictGroundingHeader}

Genera un mensaje comercial condensado de WhatsApp sobre el producto ${device.brand} ${device.sku}: ${device.name}.

DATOS DEL PRODUCTO:
- SKU: ${device.sku}
- Marca: ${device.brand}
- Nombre: ${device.name}
- Especificaciones: ${JSON.stringify(device.specs)}
- Ventajas: ${device.keyAdvantages.join("; ")}
- URL Producto: ${device.productUrl}

REQUISITOS OBLIGATORIOS WHATSAPP:
1. 'condensedMessage': Mensaje condensado con viñetas, especificaciones clave en **negrita** y enlace con parámetros UTM.
2. 'keySpecsBold': Lista de strings con las especificaciones técnicas clave redactadas en negrita (ej: "*Throughput:* 9.6 Gbps").
3. 'utmLink': Enlace limpio con UTM (${device.productUrl}?utm_source=whatsapp&utm_medium=direct&utm_campaign=${device.sku.toLowerCase()}_promo).

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ""}

Responde ÚNICAMENTE con un JSON con la estructura:
{
  "channel": "whatsapp",
  "condensedMessage": "string",
  "keySpecsBold": ["string"],
  "utmLink": "string"
}
`;
    } else if (channel === "product-sheet") {
      prompt = `
${strictGroundingHeader}

Genera una ficha de producto optimizada para ecomshop.es sobre ${device.brand} ${device.sku}: ${device.name}.

DATOS DISPONIBLES:
- SKU: ${device.sku}
- Marca: ${device.brand}
- Especificaciones: ${JSON.stringify(device.specs)}
- Ventajas: ${device.keyAdvantages.join("; ")}
- Catálogo de productos relacionados: ${JSON.stringify(availableAccessories)}

REQUISITOS OBLIGATORIOS PRODUCT SHEET:
1. 'commercialBullets': Lista de 4 a 6 viñetas comerciales convincentes para preventa.
2. 'crossSellAccessories': Lista de 2-3 accesorios recomendados de venta cruzada de ecomshop.es (elegidos del catálogo proporcionado), indicando SKU, nombre, razón técnica de compatibilidad y URL.
3. 'technicalSummaryHtml': Resumen de ficha técnica formateado en HTML estricto y limpio.

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ""}

Responde ÚNICAMENTE con un JSON con la estructura:
{
  "channel": "product-sheet",
  "commercialBullets": ["string"],
  "crossSellAccessories": [
    { "sku": "string", "name": "string", "reason": "string", "url": "string" }
  ],
  "technicalSummaryHtml": "string"
}
`;
    }

    const provider = new AntigravityTsProvider({ timeoutMs: 55000 });
    const result = await provider.execute({
      runId: `run-channel-${Date.now().toString(36)}`,
      taskId: `channel-${channel}-${device.sku}-${Date.now().toString(36)}`,
      agentRole: `Especialista en Generación de Contenido por Canal (${channel}) para EcomShop`,
      workspacePath: process.cwd(),
      baseCommit: "HEAD",
      environment: "PRODUCTION",
      filesAllowed: [],
      filesForbidden: [],
      prompt
    });

    if (result.exitCode !== 0 || !result.stdout) {
      return NextResponse.json(
        { error: "AI_GENERATION_FAILED", details: result.stderr || "Error al generar contenido del canal" },
        { status: 500 }
      );
    }

    let parsedOutput: ChannelContentOutput;
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
      await recordAiUsage(user.uid, `channel_${channel}_generation`, 1200, 2000, 0);
    } catch (usageErr) {
      console.error("[API Channel] Warning: Falló el registro de uso de IA:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data: parsedOutput
    });
  } catch (err: any) {
    console.error("[API Channel Error]:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: err?.message || String(err) },
      { status: 500 }
    );
  }
});
