import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public liveness/readiness endpoint for Cloud Run.
 *
 * GET /health
 *
 * This endpoint intentionally performs no authentication and no external
 * dependency checks. It is used to verify that the Next.js process is alive.
 * Deeper Firestore/Storage diagnostics remain under /api/health/persistence.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ecomshop-content",
    version: process.env.APP_VERSION ?? "0.1.0",
    commit: process.env.GIT_COMMIT_SHA ?? null,
    environment: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
