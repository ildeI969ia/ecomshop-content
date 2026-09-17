import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import {
  generateEditorialTopicsWithAI,
  getDeterministicTopicsFallback
} from "@/lib/services/editorial-topics-service";
import {
  EditorialTopicsQuerySchema,
  CreateCustomTopicSchema,
  TopicCategory,
  TopicVertical,
  TopicArchetype,
  EditorialTopicCard
} from "@/lib/types/editorial-topics";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Sesión corporativa requerida." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category") || "ALL";
    const verticalParam = searchParams.get("vertical") || "EMPRESAS_OFICINAS";
    const arquetipoParam = searchParams.get("arquetipo") || "TROUBLESHOOTING";

    const parsedQuery = EditorialTopicsQuerySchema.safeParse({
      category: categoryParam,
      vertical: verticalParam,
      arquetipo: arquetipoParam
    });

    const category: TopicCategory = parsedQuery.success ? parsedQuery.data.category : "ALL";
    const vertical: TopicVertical = parsedQuery.success ? parsedQuery.data.vertical : "EMPRESAS_OFICINAS";
    const arquetipo: TopicArchetype = parsedQuery.success ? parsedQuery.data.arquetipo : "TROUBLESHOOTING";

    const topics = await generateEditorialTopicsWithAI(category, vertical, arquetipo);

    return NextResponse.json({
      topics,
      meta: {
        category,
        vertical,
        arquetipo,
        total: topics.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[GET /api/editorial/topics] Error:", err);
    return NextResponse.json(
      {
        topics: getDeterministicTopicsFallback("ALL", "EMPRESAS_OFICINAS", "TROUBLESHOOTING"),
        warning: "Generación fallback por excepción"
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Sesión corporativa requerida." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Caso A: Creación de línea editorial propia personalizada
    if (body.action === "CREATE_CUSTOM") {
      const parsed = CreateCustomTopicSchema.safeParse(body.topic);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos de línea editorial inválidos", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const input = parsed.data;
      const customCard: EditorialTopicCard = {
        id: `custom-topic-${Date.now()}`,
        badge: input.badge || (input.focusLevel === "HIGH_TECHNICAL" ? "LÍNEA TÉCNICA" : "ESTRATEGIA ROI"),
        title: input.title,
        targetAudience: input.targetAudience,
        coreArgument: input.coreArgument || `Línea editorial a medida con enfoque ${input.focusLevel}.`,
        suggestedSKUs: input.suggestedSKUs && input.suggestedSKUs.length > 0 ? input.suggestedSKUs : ["ECW536", "ECS1528FP"],
        category: "ALL",
        isCustom: true
      };

      return NextResponse.json({ topic: customCard });
    }

    // Caso B: Solicitud de regeneración fresca vía POST con opciones de override
    const { category = "ALL", vertical = "EMPRESAS_OFICINAS", arquetipo = "TROUBLESHOOTING", apiKey } = body;

    const topics = await generateEditorialTopicsWithAI(
      category,
      vertical,
      arquetipo,
      apiKey
    );

    return NextResponse.json({
      topics,
      meta: {
        category,
        vertical,
        arquetipo,
        total: topics.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[POST /api/editorial/topics] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Error al procesar solicitud editorial" },
      { status: 500 }
    );
  }
}
