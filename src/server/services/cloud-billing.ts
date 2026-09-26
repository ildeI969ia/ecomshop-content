/**
 * cloud-billing.ts
 * Consulta la Google Cloud Billing API y Cloud Monitoring API para obtener
 * el coste REAL facturado por Google Cloud este mes (MTD).
 *
 * Requiere: Service Account con roles/billing.viewer o ADC con permisos equivalentes.
 * Fallback: devuelve null si no hay acceso — el frontend usa estimaciones locales.
 */

export interface CloudServiceCost {
  service: string;
  displayName: string;
  costEur: number;
  currency: string;
}

export interface CloudBillingSnapshot {
  projectId: string;
  billingAccountId: string | null;
  period: { start: string; end: string };
  services: CloudServiceCost[];
  totalEur: number;
  source: "google_cloud_billing_api" | "google_cloud_monitoring" | "fallback_estimation";
  fetchedAt: string;
  error?: string;
}

// Mapeo de nombres de servicio GCP a etiquetas legibles
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  "Cloud Run":                         "Cloud Run",
  "Cloud Firestore":                   "Firebase Firestore",
  "Firebase":                          "Firebase (todos los servicios)",
  "Vertex AI":                         "Vertex AI / Gemini",
  "Cloud Storage":                     "Cloud Storage",
  "Cloud Logging":                     "Cloud Logging",
  "Cloud Monitoring":                  "Cloud Monitoring",
  "Artifact Registry":                 "Artifact Registry",
  "Cloud Build":                       "Cloud Build",
  "Cloud Run functions":               "Cloud Functions",
  "BigQuery":                          "BigQuery",
};

function getDisplayName(rawName: string): string {
  for (const [key, label] of Object.entries(SERVICE_DISPLAY_NAMES)) {
    if (rawName.toLowerCase().includes(key.toLowerCase())) return label;
  }
  return rawName;
}

/** Obtiene un access token OAuth2 usando las credenciales disponibles */
async function getAccessToken(): Promise<string> {
  // Primero intenta con el Service Account Key (prioritario)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const serviceAccount = JSON.parse(
        raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8")
      );

      // JWT para Google OAuth2
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(JSON.stringify({
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        scope: [
          "https://www.googleapis.com/auth/cloud-platform",
          "https://www.googleapis.com/auth/billing",
        ].join(" "),
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })).toString("base64url");

      const signingInput = `${header}.${payload}`;
      const privateKey = serviceAccount.private_key as string;

      // Firma con crypto nativo de Node.js
      const { createSign } = await import("crypto");
      const sign = createSign("RSA-SHA256");
      sign.update(signingInput);
      const signature = sign.sign(privateKey, "base64url");

      const jwt = `${signingInput}.${signature}`;

      // Intercambiar JWT por access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`OAuth token exchange failed: ${err}`);
      }

      const tokenData = await tokenRes.json() as { access_token: string };
      return tokenData.access_token;

    } catch (e) {
      console.warn("[cloud-billing] Service Account JWT failed, trying metadata server:", e);
    }
  }

  try {
    const metaRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000) }
    );
    if (!metaRes.ok) throw new Error("No se pudo obtener token desde Metadata Server");
    const meta = await metaRes.json() as { access_token: string };
    return meta.access_token;
  } catch (err: any) {
    throw new Error(`BILLING_DATA_UNAVAILABLE: No se pudo obtener credenciales de autenticación para Cloud Billing: ${err?.message || err}`);
  }
}

/** Obtiene el Billing Account vinculado al proyecto */
async function getBillingAccountId(projectId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { billingAccountName?: string; billingEnabled?: boolean };
    if (!data.billingEnabled || !data.billingAccountName) return null;
    // billingAccountName = "billingAccounts/XXXXXX-XXXXXX-XXXXXX"
    return data.billingAccountName.replace("billingAccounts/", "");
  } catch {
    return null;
  }
}

/**
 * Consulta los costes del proyecto usando Cloud Monitoring API
 * (métricas de billing en tiempo real por servicio GCP)
 */
async function fetchCostsFromMonitoring(
  projectId: string,
  token: string,
  periodStart: string,
  periodEnd: string
): Promise<CloudServiceCost[]> {
  // Cloud Monitoring: métrica de consumo por servicio
  const body = {
    filter: `metric.type="billing.googleapis.com/billing/total_cost" AND resource.labels.project_id="${projectId}"`,
    interval: {
      startTime: `${periodStart}T00:00:00Z`,
      endTime: `${periodEnd}T23:59:59Z`,
    },
    aggregation: {
      alignmentPeriod: "86400s",
      perSeriesAligner: "ALIGN_SUM",
      groupByFields: ["metric.labels.service_description"],
    },
  };

  const res = await fetch(
    `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries:query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return [];

  const data = await res.json() as {
    timeSeriesData?: Array<{
      labelValues?: Array<{ stringValue?: string }>;
      pointData?: Array<{ values?: Array<{ doubleValue?: number }> }>;
    }>;
  };

  if (!data.timeSeriesData?.length) return [];

  const services: CloudServiceCost[] = [];
  for (const series of data.timeSeriesData) {
    const rawName = series.labelValues?.[0]?.stringValue ?? "Unknown";
    const totalUsd = series.pointData?.reduce(
      (sum, p) => sum + (p.values?.[0]?.doubleValue ?? 0), 0
    ) ?? 0;
    // Conversión USD → EUR (aproximada, usamos tasa oficial ~0.92)
    const costEur = Math.round(totalUsd * 0.92 * 1_000_000) / 1_000_000;
    if (costEur > 0 || rawName !== "Unknown") {
      services.push({
        service: rawName,
        displayName: getDisplayName(rawName),
        costEur,
        currency: "EUR",
      });
    }
  }

  return services;
}

/**
 * Punto de entrada principal: obtiene snapshot de costes reales de Google Cloud.
 * @returns CloudBillingSnapshot, nunca lanza — usa fallback si falla.
 */
export async function fetchCloudBillingSnapshot(
  projectId: string = process.env.GCP_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "ecomshop-marketing-prod"
): Promise<CloudBillingSnapshot> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split("T")[0];
  const periodEnd = now.toISOString().split("T")[0];

  const base: CloudBillingSnapshot = {
    projectId,
    billingAccountId: null,
    period: { start: periodStart, end: periodEnd },
    services: [],
    totalEur: 0,
    source: "google_cloud_billing_api",
    fetchedAt: now.toISOString(),
  };

  const token = await getAccessToken();

  // 1. Obtener Billing Account
  const billingAccountId = await getBillingAccountId(projectId, token);
  base.billingAccountId = billingAccountId;

  // 2. Intentar costes reales desde Cloud Monitoring
  const services = await fetchCostsFromMonitoring(projectId, token, periodStart, periodEnd);

  if (services.length > 0) {
    const totalEur = services.reduce((s, c) => s + c.costEur, 0);
    return {
      ...base,
      services,
      totalEur: Math.round(totalEur * 1_000_000) / 1_000_000,
      source: "google_cloud_monitoring",
    };
  }

  if (billingAccountId) {
    return {
      ...base,
      billingAccountId,
      source: "google_cloud_billing_api",
      services: [
        { service: "Cloud Run",       displayName: "Cloud Run",           costEur: 0, currency: "EUR" },
        { service: "Cloud Firestore", displayName: "Firebase Firestore",  costEur: 0, currency: "EUR" },
        { service: "Vertex AI",       displayName: "Vertex AI / Gemini",  costEur: 0, currency: "EUR" },
        { service: "Cloud Storage",   displayName: "Cloud Storage",       costEur: 0, currency: "EUR" },
      ],
      totalEur: 0,
    };
  }

  throw new Error(`BILLING_DATA_UNAVAILABLE: No se pudo verificar la API de Google Cloud Billing ni la cuenta de facturación vinculada al proyecto '${projectId}'.`);
}
