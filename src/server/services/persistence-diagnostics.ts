import { getAdminFirestore } from "../config/firebase";
import { Asset } from "../domain/types";
import {
  GoogleCloudStorageProvider,
  StorageHealthResult,
  getGcsBucketName,
  getGcsBucketNameSource,
} from "./storage-provider";

/**
 * Diagnóstico del flujo real de persistencia de activos (solo lectura salvo
 * la sonda profunda, que escribe y borra 1 byte en el prefijo _health/).
 *
 * Contexto del incidente (ver PHASE_06A_PERSISTENCE_HARDENING.md):
 *  - Los assets de Firestore se escribían con `publicUrl: ""` cuando el data
 *    URL superaba 800.000 caracteres (commit 5150e78) o con una URL fabricada
 *    por el antiguo StorageProvider que nunca tocó GCS.
 *  - La galería descarta cualquier asset sin URL (page.tsx:716-725).
 */

/** Punto exacto del frontend que convierte "asset sin URL" en "galería vacía". */
export const GALLERY_DISCARD_POINT = "src/app/page.tsx:716-725 (.filter(a => Boolean(a.url)))";

/** Prefijo de storagePath que NO corresponde a ningún objeto real de GCS. */
export const PLACEHOLDER_STORAGE_PREFIX = "generated/";

export type AssetUrlHealth =
  | "OK"
  | "DATA_URL_IN_FIRESTORE"
  | "MISSING_URL"
  | "PLACEHOLDER_STORAGE_PATH";

export interface AssetHealthSample {
  id: string;
  filename: string;
  storagePath: string;
  sizeBytes: number;
  health: AssetUrlHealth;
}

export interface AssetHealthSummary {
  classified: Record<AssetUrlHealth, number>;
  withUrl: number;
  withoutUrl: number;
  samples: AssetHealthSample[];
}

export interface PersistenceDiagnosticCheck {
  id: string;
  severity: "OK" | "WARNING" | "CRITICAL";
  title: string;
  detail: string;
  remediation?: string;
}

export interface UrlProbeResult {
  assetId: string;
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
}

export interface PersistenceDiagnosticReport {
  ok: boolean;
  generatedAt: string;
  projectId: string;
  workspaceId: string;
  deepProbe: boolean;
  bucket: { name: string; source: "env" | "default" };
  firestore: {
    ok: boolean;
    error?: string;
    totalAssets: number | null;
    workspaceAssets: number | null;
    workspaceQueryError?: string;
    indexedQuery: { ok: boolean; code?: string; message?: string };
  };
  assets: AssetHealthSummary;
  urlProbes: UrlProbeResult[];
  storage: { ok: boolean; health: StorageHealthResult | null; error?: string };
  checks: PersistenceDiagnosticCheck[];
  diagnosis: string[];
  pendingWork: string[];
}

/**
 * Clasifica un asset según lo que se pueda deducir de sus metadatos.
 * Es una función PURA (sin red ni Firestore) para poder testearla offline.
 */
export function classifyAssetUrl(asset: Partial<Asset>): AssetUrlHealth {
  const url = typeof asset.publicUrl === "string" ? asset.publicUrl.trim() : "";
  const storagePath = typeof asset.storagePath === "string" ? asset.storagePath.trim() : "";

  if (url.startsWith("data:")) return "DATA_URL_IN_FIRESTORE";
  if (url.length === 0) return "MISSING_URL";
  if (storagePath.length === 0) return "PLACEHOLDER_STORAGE_PATH";
  if (storagePath.startsWith(PLACEHOLDER_STORAGE_PREFIX)) return "PLACEHOLDER_STORAGE_PATH";
  return "OK";
}

/** Resume la salud de una lista de assets (función PURA). */
export function summarizeAssetHealth(assets: Partial<Asset>[], maxSamples = 5): AssetHealthSummary {
  const classified: Record<AssetUrlHealth, number> = {
    OK: 0,
    DATA_URL_IN_FIRESTORE: 0,
    MISSING_URL: 0,
    PLACEHOLDER_STORAGE_PATH: 0,
  };
  const samples: AssetHealthSample[] = [];

  for (const asset of assets) {
    const health = classifyAssetUrl(asset);
    classified[health] += 1;
    if (health !== "OK" && samples.length < maxSamples) {
      samples.push({
        id: String(asset.id ?? "(sin id)"),
        filename: String(asset.filename ?? "").slice(0, 60),
        storagePath: String(asset.storagePath ?? "").slice(0, 80),
        sizeBytes: Number(asset.sizeBytes ?? 0),
        health,
      });
    }
  }

  const withUrl = classified.OK;
  const withoutUrl = assets.length - withUrl;
  return { classified, withUrl, withoutUrl, samples };
}

function shortMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.split("\n")[0].slice(0, 400);
}

function errorCode(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return code === undefined || code === null ? undefined : String(code);
}

export interface DiagnosticsOptions {
  workspaceId: string;
  /** Sonda de escritura real (1 byte) + borrado en _health/. */
  deep?: boolean;
  limit?: number;
  /** Comprueba por HTTP que las URLs devuelvan 2xx/3xx. */
  verifyUrls?: boolean;
  maxUrlProbes?: number;
}

/** Ejecuta el diagnóstico completo del flujo de persistencia. */
export async function runPersistenceDiagnostics(
  options: DiagnosticsOptions
): Promise<PersistenceDiagnosticReport> {
  const workspaceId = options.workspaceId || "default-ecomspain";
  const limit = options.limit && options.limit > 0 ? options.limit : 200;
  const deep = Boolean(options.deep);
  const checks: PersistenceDiagnosticCheck[] = [];
  const diagnosis: string[] = [];
  const urlProbes: UrlProbeResult[] = [];

  const bucketName = getGcsBucketName();
  const bucketSource = getGcsBucketNameSource();

  const firestore: PersistenceDiagnosticReport["firestore"] = {
    ok: true,
    totalAssets: null,
    workspaceAssets: null,
    indexedQuery: { ok: false },
  };

  let assets: Asset[] = [];
  let db: ReturnType<typeof getAdminFirestore> | null = null;

  try {
    db = getAdminFirestore();
  } catch (err) {
    firestore.ok = false;
    firestore.error = `No se pudo inicializar Firestore: ${shortMessage(err)}`;
  }

  if (db) {
    // 1) Query con orden: la que usa AssetRepository.listRecent (requiere índice compuesto)
    try {
      await db
        .collection("assets")
        .where("workspaceId", "==", workspaceId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      firestore.indexedQuery = { ok: true };
    } catch (err) {
      firestore.indexedQuery = {
        ok: false,
        code: errorCode(err),
        message: shortMessage(err),
      };
    }

    // 2) Conteo total de la colección
    try {
      const countSnapshot = await db.collection("assets").count().get();
      firestore.totalAssets = countSnapshot.data().count;
    } catch (err) {
      firestore.ok = false;
      firestore.error = `count() falló: ${shortMessage(err)}`;
    }

    // 3) Lectura del workspace (equivalente al fallback sin orden)
    try {
      const snapshot = await db
        .collection("assets")
        .where("workspaceId", "==", workspaceId)
        .limit(limit)
        .get();
      assets = snapshot.docs.map((doc) => doc.data() as Asset);
      firestore.workspaceAssets = assets.length;
    } catch (err) {
      firestore.ok = false;
      firestore.workspaceQueryError = shortMessage(err);
    }
  }

  const summary = summarizeAssetHealth(assets);

  // ── Sonda de Storage ─────────────────────────────────────────────────────
  let storageHealth: StorageHealthResult | null = null;
  let storageError: string | undefined;
  try {
    storageHealth = await new GoogleCloudStorageProvider().checkStorageHealth({ deep });
  } catch (err) {
    storageError = shortMessage(err);
  }
  const storageOk = Boolean(storageHealth?.reachable) && (!deep || Boolean(storageHealth?.canWrite));

  // ── Sonda HTTP de URLs (opcional) ────────────────────────────────────────
  if (options.verifyUrls) {
    const maxProbes = options.maxUrlProbes && options.maxUrlProbes > 0 ? options.maxUrlProbes : 3;
    const candidates = assets.filter((a) => classifyAssetUrl(a) === "OK").slice(0, maxProbes);
    for (const asset of candidates) {
      const url = String(asset.publicUrl ?? "");
      try {
        const res = await fetch(url, { method: "HEAD", redirect: "follow" });
        urlProbes.push({
          assetId: String(asset.id ?? ""),
          url,
          status: res.status,
          ok: res.status >= 200 && res.status < 400,
        });
      } catch (err) {
        urlProbes.push({
          assetId: String(asset.id ?? ""),
          url,
          status: null,
          ok: false,
          error: shortMessage(err),
        });
      }
    }
  }

  // ── Checks ───────────────────────────────────────────────────────────────
  const projectId =
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "ecomshop-marketing-prod";

  checks.push(
    bucketSource === "env"
      ? {
          id: "gcs.bucket.configured",
          severity: "OK",
          title: "GCS_BUCKET_NAME definido en el runtime",
          detail: `Bucket efectivo: "${bucketName}".`,
        }
      : {
          id: "gcs.bucket.configured",
          severity: "WARNING",
          title: "GCS_BUCKET_NAME no está definido",
          detail: `Se está usando el bucket por defecto "${bucketName}".`,
          remediation: `gcloud run services update ecomshop-content --region=europe-west1 --update-env-vars GCS_BUCKET_NAME=${bucketName}`,
        }
  );

  if (storageOk) {
    checks.push({
      id: "gcs.bucket.reachable",
      severity: "OK",
      title: "Bucket de Storage operativo",
      detail:
        `gs://${bucketName} responde (sonda ${storageHealth?.probePath}). ` +
        (deep && storageHealth?.canWrite
          ? `Escritura verificada (${storageHealth.wroteBytes} bytes, ${storageHealth.roundtripMs} ms) y borrado OK.`
          : "Modo superficial: usa la sonda profunda para verificar escritura real."),
    });
  } else {
    checks.push({
      id: "gcs.bucket.reachable",
      severity: "CRITICAL",
      title: "El bucket de Storage NO es utilizable",
      detail: storageError || storageHealth?.error?.message || "La sonda no devolvió resultado.",
      remediation:
        storageHealth?.error?.hint ||
        `Verifica que gs://${bucketName} existe y que el service account del runtime tiene roles/storage.objectAdmin.`,
    });
  }

  if (firestore.indexedQuery.ok) {
    checks.push({
      id: "firestore.index.composite",
      severity: "OK",
      title: "Índice compuesto assets(workspaceId, createdAt) disponible",
      detail: "AssetRepository.listRecent se resuelve sin caer al fallback sin orden.",
    });
  } else {
    checks.push({
      id: "firestore.index.composite",
      severity: "CRITICAL",
      title: "Falta el índice compuesto de la colección assets",
      detail:
        `La query where(workspaceId) + orderBy(createdAt) falla` +
        (firestore.indexedQuery.code ? ` (código ${firestore.indexedQuery.code})` : "") +
        `: ${firestore.indexedQuery.message ?? "sin detalle"}`,
      remediation:
        `gcloud firestore indexes composite create --project=${projectId} --database='(default)' ` +
        `--collection-group=assets --field-config=field-path=workspaceId,order=ascending ` +
        `--field-config=field-path=createdAt,order=descending`,
    });
  }

  if (summary.withoutUrl > 0) {
    checks.push({
      id: "firestore.assets.missingUrl",
      severity: "CRITICAL",
      title: `${summary.withoutUrl} asset(s) sin URL utilizable`,
      detail:
        `De ${assets.length} assets del workspace "${workspaceId}": ` +
        `${summary.classified.MISSING_URL} sin publicUrl, ` +
        `${summary.classified.PLACEHOLDER_STORAGE_PATH} con storagePath ficticio, ` +
        `${summary.classified.DATA_URL_IN_FIRESTORE} con data URL en Firestore. ` +
        `El frontend los descarta en ${GALLERY_DISCARD_POINT}, por eso la galería muestra 0.`,
      remediation:
        "Cerrar el pipeline (subida real a GCS) y ejecutar la migración legacy (F5): " +
        "nunca inventar URLs; marcar los irrecuperables como storageStatus=BROKEN_SOURCE.",
    });
  } else if (assets.length > 0) {
    checks.push({
      id: "firestore.assets.missingUrl",
      severity: "OK",
      title: "Todos los assets del workspace tienen URL",
      detail: `${summary.withUrl} asset(s) con publicUrl y storagePath válidos.`,
    });
  }

  if (urlProbes.length > 0) {
    const broken = urlProbes.filter((probe) => !probe.ok);
    checks.push(
      broken.length === 0
        ? {
            id: "storage.urls.reachable",
            severity: "OK",
            title: "Las URLs de los assets responden",
            detail: urlProbes.map((p) => `${p.status ?? "ERR"} ${p.url.slice(0, 80)}`).join(" | "),
          }
        : {
            id: "storage.urls.reachable",
            severity: "CRITICAL",
            title: `${broken.length} URL(s) de asset no responden`,
            detail: broken
              .map((p) => `${p.status ?? p.error ?? "ERR"} ${p.url.slice(0, 90)}`)
              .join(" | "),
            remediation:
              "La metadata apunta a objetos inexistentes (URL fabricada por el antiguo provider). " +
              "Re-subir el binario y reescribir publicUrl con la URL verificada.",
          }
    );
  }

  checks.push({
    id: "pipeline.silentFailures",
    severity: "WARNING",
    title: "Quedan puntos de fallo silencioso (F3/F4 pendientes)",
    detail:
      "src/app/api/images/generate/route.ts:121-123 (catch dbErr => 200), " +
      "src/app/api/assets/route.ts:73 y :101 (repo.save().catch(() => {})), " +
      "src/app/api/assets/route.ts:116-118 (catch => 200 con assets: []), " +
      "src/server/repositories/index.ts listRecent => [] ante error.",
    remediation:
      "Propagar errores tipados y devolver 4xx/5xx reales; eliminar los catch vacíos " +
      "(plan por fases en PHASE_06A_PERSISTENCE_HARDENING.md).",
  });

  // ── Diagnóstico en lenguaje natural ──────────────────────────────────────
  if (summary.withoutUrl > 0) {
    diagnosis.push(
      `Cadena rota en el binario: ${summary.withoutUrl}/${assets.length} assets del workspace no tienen una URL servible.`
    );
  }
  if (!storageOk) {
    diagnosis.push(
      `Cloud Storage no es utilizable para el bucket "${bucketName}" (origen del nombre: ${bucketSource}). ` +
        "Sin bucket no hay binarios, y sin binarios no hay activos persistidos."
    );
  }
  if (!firestore.indexedQuery.ok) {
    diagnosis.push(
      "La lectura ordenada siempre cae al fallback sin orden y puede degradar a lista vacía en silencio."
    );
  }
  if (summary.classified.DATA_URL_IN_FIRESTORE > 0) {
    diagnosis.push(
      "Hay data URLs guardados en Firestore: exceden el límite de 1 MiB por documento y rompen la escritura."
    );
  }
  if (diagnosis.length === 0) {
    diagnosis.push("No se han detectado fallos bloqueantes en la persistencia de activos.");
  }

  return {
    ok: checks.every((check) => check.severity !== "CRITICAL"),
    generatedAt: new Date().toISOString(),
    projectId,
    workspaceId,
    deepProbe: deep,
    bucket: { name: bucketName, source: bucketSource },
    firestore,
    assets: summary,
    urlProbes,
    storage: { ok: storageOk, health: storageHealth, error: storageError },
    checks,
    diagnosis,
    pendingWork: [
      "F3 · Pipeline de generación: optimizar el binario, subirlo a GCS, escribir metadatos verificados y propagar errores (src/app/api/images/generate/route.ts).",
      "F4 · Lectura y UI: /api/assets sin fallbacks laterales ni 200 vacíos; galería que no descarte activos sin URL (src/app/page.tsx:716-725) y muestre el estado real.",
      "F5 · Migración de los assets legacy con publicUrl vacío (marcar BROKEN_SOURCE o recuperar el binario; nunca inventar URL).",
      "F6 · Blindaje: SESSION_SECRET/CORPORATE_ACCESS_PASSWORD en Secret Manager, src/middleware.ts:11, reglas de lint contra catch vacíos y CI gate con los tests de storage/persistencia.",
    ],
  };
}



