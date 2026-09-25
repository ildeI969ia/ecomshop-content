import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getCatalogDevice } from "@/lib/catalog";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { SchemaJsonLdOutput } from "@/types/geo-content";

export const maxDuration = 60;

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { sku, customPrompt } = body;

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

    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.0035);
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
Genera un bloque de esquema JSON-LD válido para la web de EcomShop en torno al siguiente dispositivo técnico:

DATOS TÉCNICOS DEL DISPOSITIVO:
- SKU: ${device.sku}
- Marca: ${device.brand}
- Nombre Completo: ${device.name}
- Tipo: ${device.type}
- Categoría: ${device.category}
- Descripción: ${device.shortDesc}
- Especificaciones: ${JSON.stringify(device.specs)}
- URL Producto: ${device.productUrl}

REQUISITOS DEL ESQUEMA JSON-LD:
1. Debe combinar en una estructura con "@graph":
   - @type: "TechArticle" (con headline, description, proficiencyLevel="Beginner/Intermediate/Advanced", dependencies/specs).
   - @type: "Product" (con name, sku, brand="EnGenius", description, url, offers/availability).
   - @type: "FAQPage" (con EXACTAMENTE 4 preguntas y respuestas REALES de ingeniería preventa B2B sobre este equipo, como consumo PoE, licencias Cloud 0€, throughput real y compatibilidad/uplinks).
2. Genera también el string empaquetado exacto dentro del tag HTML: '<script type="application/ld+json">...</script>'.

${customPrompt ? `INSTRUCCIONES ADICIONALES: ${customPrompt}` : ""}

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "sku": "${device.sku}",
  "jsonLdScriptTag": "<script type=\\"application/ld+json\\">...</script>",
  "jsonLdObject": { "@context": "https://schema.org", "@graph": [...] },
  "schemaTypesIncluded": ["TechArticle", "Product", "FAQPage"],
  "faqCount": 4
}
`;

    const provider = new AntigravityTsProvider({ timeoutMs: 55000 });
    const result = await provider.execute({
      runId: `run-schema-${Date.now().toString(36)}`,
      taskId: `schema-jsonld-${device.sku}-${Date.now().toString(36)}`,
      agentRole: "Especialista en Datos Estructurados JSON-LD y SEO Técnico para EcomShop",
      workspacePath: process.cwd(),
      baseCommit: "HEAD",
      environment: "PRODUCTION",
      filesAllowed: [],
      filesForbidden: [],
      prompt
    });

    if (result.exitCode !== 0 || !result.stdout) {
      return NextResponse.json(
        { error: "AI_GENERATION_FAILED", details: result.stderr || "Error al generar JSON-LD" },
        { status: 500 }
      );
    }

    let parsedOutput: SchemaJsonLdOutput;
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
      await recordAiUsage(user.uid, "schema_jsonld_generation", 1500, 2500, 0);
    } catch (usageErr) {
      console.error("[API Schema JSON-LD] Warning: Falló el registro de uso de IA:", usageErr);
    }

    return NextResponse.json({
      success: true,
      data: parsedOutput
    });
  } catch (err: any) {
    console.error("[API Schema JSON-LD Error]:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: err?.message || String(err) },
      { status: 500 }
    );
  }
});
