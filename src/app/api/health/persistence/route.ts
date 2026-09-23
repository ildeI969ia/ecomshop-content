import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import { runPersistenceDiagnostics } from "@/server/services/persistence-diagnostics";

/**
 * GET /api/health/persistence
 *
 * Diagnóstico del flujo REAL de persistencia de activos: colección `assets`
 * de Firestore, índice compuesto, bucket de Cloud Storage y estado de las URLs.
 *
 * Parámetros:
 *   ?deep=1        → realiza una subida real de 1 byte + borrado en _health/
 *   ?verifyUrls=1  → comprueba por HTTP que las URLs de los assets respondan
 *
 * Respuesta: 200 si no hay hallazgos CRITICAL, 503 si el pipeline está roto.
 * Requiere sesión corporativa (el middleware protege /api/*).
 */

// Next 16: los route handlers no se cachean por defecto; forzamos dinámico
// para que el diagnóstico siempre lea el estado real (Firestore + GCS).
export const dynamic = "force-dynamic";

function isTruthy(value: string | null): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Requiere sesión corporativa @ecomspain.com", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const params = new URL(req.url).searchParams;

  try {
    const report = await runPersistenceDiagnostics({
      workspaceId: user.workspaceId,
      deep: isTruthy(params.get("deep")),
      verifyUrls: isTruthy(params.get("verifyUrls")),
      limit: 200,
    });

    return NextResponse.json(
      { ...report, requestedBy: user.email },
      { status: report.ok ? 200 : 503 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/health/persistence] Fallo ejecutando el diagnóstico:", err);
    return NextResponse.json(
      { ok: false, error: "El diagnóstico de persistencia falló", details: message },
      { status: 500 }
    );
  }
}
