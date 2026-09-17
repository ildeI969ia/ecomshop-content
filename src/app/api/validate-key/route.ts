import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * Valida la conectividad con Gemini/Vertex AI.
 *
 * Estrategia en Cloud Run (producción):
 * 1. Si el usuario envía su propia API Key → valida contra Google AI Studio
 *    usando vertexai: false para evitar que el SDK enrute a aiplatform.googleapis.com
 * 2. Si no hay key de usuario pero hay GEMINI_API_KEY en Secret Manager → AI Studio
 * 3. Si no hay ninguna key → intenta Vertex AI con ADC (Service Account de Cloud Run)
 */

const CANDIDATE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

async function pingModel(ai: GoogleGenAI, model: string): Promise<boolean> {
  try {
    const res = await ai.models.generateContent({
      model,
      contents: "ping",
      config: { maxOutputTokens: 5 },
    });
    return Boolean(res);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userApiKey = (body.apiKey as string | undefined)?.trim() || "";

    // ── CAMINO 1: API Key del usuario (siempre → AI Studio, nunca Vertex) ────
    if (userApiKey) {
      const ai = new GoogleGenAI({
        vertexai: false, // OBLIGATORIO: evita auto-routing a aiplatform.googleapis.com
        apiKey: userApiKey,
        httpOptions: { headers: { "x-goog-api-key": userApiKey } },
      });

      let verifiedModel: string | null = null;
      let lastErrMsg = "";

      for (const model of CANDIDATE_MODELS) {
        try {
          const ok = await pingModel(ai, model);
          if (ok) { verifiedModel = model; break; }
        } catch (err: unknown) {
          lastErrMsg = err instanceof Error ? err.message : String(err);
        }
      }

      if (verifiedModel) {
        return NextResponse.json({
          valid: true,
          model: verifiedModel,
          backend: "Google AI Studio",
          status: "online",
        });
      }

      return NextResponse.json(
        { valid: false, message: lastErrMsg || "La API Key no tiene acceso a Gemini" },
        { status: 400 }
      );
    }

    // ── CAMINO 2: GEMINI_API_KEY de Secret Manager (Cloud Run) → AI Studio ───
    const serverKey =
      process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";

    if (serverKey) {
      const ai = new GoogleGenAI({
        vertexai: false,
        apiKey: serverKey,
        httpOptions: { headers: { "x-goog-api-key": serverKey } },
      });

      let verifiedModel: string | null = null;
      for (const model of CANDIDATE_MODELS) {
        const ok = await pingModel(ai, model);
        if (ok) { verifiedModel = model; break; }
      }

      if (verifiedModel) {
        return NextResponse.json({
          valid: true,
          model: verifiedModel,
          backend: "Google AI Studio (servidor)",
          status: "online",
        });
      }
    }

    // ── CAMINO 3: Vertex AI con ADC — Service Account de Cloud Run ────────────
    const gcpProject =
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      process.env.GCP_PROJECT?.trim() ||
      "";

    if (gcpProject) {
      const ai = new GoogleGenAI({
        vertexai: true,
        project: gcpProject,
        location: process.env.GOOGLE_CLOUD_LOCATION || "europe-west1",
      });

      let verifiedModel: string | null = null;
      let lastErrMsg = "";

      for (const model of CANDIDATE_MODELS) {
        try {
          const ok = await pingModel(ai, model);
          if (ok) { verifiedModel = model; break; }
        } catch (err: unknown) {
          lastErrMsg = err instanceof Error ? err.message : String(err);
        }
      }

      if (verifiedModel) {
        return NextResponse.json({
          valid: true,
          model: verifiedModel,
          backend: `Vertex AI (${process.env.GOOGLE_CLOUD_LOCATION || "europe-west1"})`,
          status: "online",
        });
      }

      if (lastErrMsg) {
        // Mensaje de error legible cuando la SA no tiene permisos Vertex
        const isBlocked =
          lastErrMsg.includes("blocked") ||
          lastErrMsg.includes("PERMISSION_DENIED") ||
          lastErrMsg.includes("iam");

        return NextResponse.json(
          {
            valid: false,
            message: isBlocked
              ? `La Service Account de Cloud Run no tiene permisos Vertex AI. Asigna el rol roles/aiplatform.user al proyecto ${gcpProject}.`
              : lastErrMsg,
          },
          { status: 400 }
        );
      }
    }

    // ── Sin credenciales ──────────────────────────────────────────────────────
    return NextResponse.json(
      {
        valid: false,
        message:
          "No hay credenciales disponibles. Proporciona una Gemini API Key o configura GEMINI_API_KEY en Secret Manager.",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[VALIDATE_KEY_ERROR]", error);
    const msg = error instanceof Error ? error.message : "Error interno al verificar credenciales";
    return NextResponse.json({ valid: false, message: msg }, { status: 500 });
  }
}
