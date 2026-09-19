import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import {
  generateFieldScenariosWithAI,
  getRandomCuratedScenarios
} from "@/lib/services/field-scenarios-service";

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
    const category = searchParams.get("category") || "ALL";

    const scenarios = getRandomCuratedScenarios(category, 6);
    return NextResponse.json({
      scenarios,
      meta: {
        category,
        total: scenarios.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[GET /api/advisor/scenarios] Error:", err);
    return NextResponse.json(
      { scenarios: getRandomCuratedScenarios("ALL", 6) },
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

    const body = await req.json().catch(() => ({}));
    const { category = "ALL", apiKey } = body;

    const scenarios = await generateFieldScenariosWithAI(category, apiKey);

    return NextResponse.json({
      scenarios,
      meta: {
        category,
        total: scenarios.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[POST /api/advisor/scenarios] Error:", err);
    return NextResponse.json(
      {
        scenarios: getRandomCuratedScenarios("ALL", 6),
        warning: "Fallback a pool curado por excepción"
      },
      { status: 200 }
    );
  }
}
