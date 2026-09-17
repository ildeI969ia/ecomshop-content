/**
 * GET /api/finops/cloud-costs
 *
 * Devuelve el coste real de Google Cloud este mes (MTD) consultando
 * Cloud Billing API / Cloud Monitoring API con las credenciales del
 * Service Account configurado. Requiere autenticación corporativa.
 *
 * Respuesta: CloudBillingSnapshot JSON
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import { fetchCloudBillingSnapshot } from "@/server/services/cloud-billing";

// Caché en memoria para evitar llamadas repetitivas (TTL: 5 min)
let cachedSnapshot: { data: Awaited<ReturnType<typeof fetchCloudBillingSnapshot>>; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  // Servir desde caché si está vigente y no se fuerza refresco
  if (!forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.at < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedSnapshot.data,
      cached: true,
      cacheAgeSeconds: Math.floor((Date.now() - cachedSnapshot.at) / 1000),
    });
  }

  const projectId =
    process.env.GCP_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "ecomshop-marketing-prod";

  const snapshot = await fetchCloudBillingSnapshot(projectId);

  // Actualizar caché
  cachedSnapshot = { data: snapshot, at: Date.now() };

  return NextResponse.json({ ...snapshot, cached: false });
}
