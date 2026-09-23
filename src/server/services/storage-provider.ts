import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "../config/firebase";

/**
 * Tipo del bucket de GCS derivado de firebase-admin (evita depender
 * directamente del paquete @google-cloud/storage, que es transitivo).
 */
type GcsBucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;
type GcsFile = ReturnType<GcsBucket["file"]>;

/**
 * Nombre de bucket por defecto. Debe existir en el proyecto o definirse
 * GCS_BUCKET_NAME en el runtime (Cloud Run / .env.local).
 */
export const DEFAULT_GCS_BUCKET_NAME = "ecomshop-marketing-assets";

/** Prefijo reservado para sondas de salud del propio diagnóstico. */
export const HEALTH_PROBE_PREFIX = "_health/";

export interface StorageUploadParams {
  buffer: Buffer;
  destinationPath: string;
  mimeType: string;
  cacheControl?: string;
}

export interface StorageUploadResult {
  /** Ruta relativa dentro del bucket (sin gs:// ni dominio). */
  storagePath: string;
  /** URL de lectura. Sólo se devuelve si el objeto está VERIFICADO en GCS. */
  publicUrl?: string;
  /** URI canónica gs://bucket/objeto */
  gsUri: string;
  sizeBytes: number;
  mimeType: string;
  /** true = se comprobó en GCS (exists + tamaño correcto). */
  verified: boolean;
  bucket: string;
}

export type StorageErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "UPLOAD_FAILED"
  | "VERIFY_FAILED"
  | "DELETE_FAILED"
  | "SIGNED_URL_FAILED";

export interface StorageHealthOptions {
  /** Realiza una subida real de 1 byte + verificación + borrado. */
  deep?: boolean;
  probePath?: string;
}

export interface StorageHealthResult {
  bucketName: string;
  bucketNameSource: "env" | "default";
  reachable: boolean;
  probePath: string;
  probeFound?: boolean;
  canWrite: boolean;
  canDelete: boolean;
  wroteBytes?: number;
  roundtripMs?: number;
  error?: { code: string; message: string; hint?: string };
}

export interface StorageProvider {
  uploadFile(params: StorageUploadParams): Promise<StorageUploadResult>;
  deleteFile(storagePath: string): Promise<boolean>;
  getSignedUrl(storagePath: string, expiresInMinutes?: number): Promise<string>;
  checkStorageHealth?(options?: StorageHealthOptions): Promise<StorageHealthResult>;
}

/**
 * Error tipado de la capa de almacenamiento.
 *
 * Regla de oro: si el binario NO está en GCS, esto LANZA.
 * Nunca se fabrica una `publicUrl` sin haber verificado el objeto.
 */
export class StorageProviderError extends Error {
  readonly code: StorageErrorCode;
  readonly stage: string;
  readonly hint?: string;

  constructor(
    code: StorageErrorCode,
    stage: string,
    message: string,
    options?: { cause?: unknown; hint?: string }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "StorageProviderError";
    this.code = code;
    this.stage = stage;
    this.hint = options?.hint;
  }
}

/** Bucket efectivo del runtime (env > default documentado). */
export function getGcsBucketName(): string {
  const fromEnv = process.env.GCS_BUCKET_NAME?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_GCS_BUCKET_NAME;
}

export function getGcsBucketNameSource(): "env" | "default" {
  const fromEnv = process.env.GCS_BUCKET_NAME?.trim();
  return fromEnv && fromEnv.length > 0 ? "env" : "default";
}

export type StorageErrorKind =
  | "BUCKET_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "NO_CREDENTIALS"
  | "UNKNOWN";

export interface ClassifiedStorageError {
  kind: StorageErrorKind;
  code?: string;
  message: string;
  hint: string;
}

/** Traduce un error crudo del SDK de Storage a algo accionable. */
export function classifyStorageError(err: unknown): ClassifiedStorageError {
  const rawCode = (err as { code?: unknown } | null)?.code;
  const code = rawCode === undefined || rawCode === null ? undefined : String(rawCode);
  const message = err instanceof Error ? err.message : String(err ?? "Error desconocido de Storage");

  if (code === "404" || /not found|does not exist|no such bucket/i.test(message)) {
    return {
      kind: "BUCKET_NOT_FOUND",
      code,
      message,
      hint:
        `El bucket no existe o la ruta es inválida. Crea el bucket o define GCS_BUCKET_NAME: ` +
        `gcloud storage buckets create gs://${getGcsBucketName()} --project=<PROJECT_ID> --location=europe-west1 --uniform-bucket-level-access`,
    };
  }
  if (code === "403" || /permission|forbidden|denied/i.test(message)) {
    return {
      kind: "PERMISSION_DENIED",
      code,
      message,
      hint:
        `Concede roles/storage.objectAdmin al service account del runtime sobre el bucket ` +
        `(gcloud storage buckets add-iam-policy-binding gs://${getGcsBucketName()} ` +
        `--member="serviceAccount:<SA_EMAIL>" --role="roles/storage.objectAdmin").`,
    };
  }
  if (/could not load the default credentials|default credentials|invalid_grant|unauthorized_client/i.test(message)) {
    return {
      kind: "NO_CREDENTIALS",
      code,
      message,
      hint:
        "No hay credenciales válidas. En local: `gcloud auth application-default login`. " +
        "En Cloud Run: el service account del servicio debe existir y tener permisos.",
    };
  }
  return {
    kind: "UNKNOWN",
    code,
    message,
    hint: "Revisa los logs de Cloud Storage (permisos, deny policies, retención).",
  };
}
/**
 * Normaliza cualquier forma de ruta (gs://, URL pública o ruta relativa) a
 * un objeto dentro del bucket. Devuelve "" si la ruta no es gestionable.
 */
export function normalizeObjectPath(storagePath: string, bucketName: string): string {
  let clean = (storagePath || "").trim();
  if (clean.length === 0) return "";

  if (clean.startsWith("gs://")) {
    clean = clean.slice("gs://".length);
  } else if (clean.startsWith("https://storage.googleapis.com/")) {
    clean = clean.slice("https://storage.googleapis.com/".length);
  } else if (/^https?:\/\//i.test(clean)) {
    // URL externa (stock, CDN de terceros): no gestionamos su ciclo de vida.
    return "";
  }

  const parts = clean.split("/").filter((p) => p.length > 0);
  if (parts.length > 1 && parts[0] === bucketName) {
    parts.shift();
  }
  return parts.join("/").replace(/\.\./g, "").replace(/^\/+/, "");
}

export class GoogleCloudStorageProvider implements StorageProvider {
  private bucketName: string;

  constructor(bucketName?: string) {
    this.bucketName = bucketName?.trim() || getGcsBucketName();
  }

  getBucketName(): string {
    return this.bucketName;
  }

  /** Devuelve el bucket o LANZA (ya no devuelve null silenciosamente). */
  private getBucket(): GcsBucket {
    try {
      const app = getFirebaseAdminApp();
      return getStorage(app).bucket(this.bucketName);
    } catch (err) {
      const info = classifyStorageError(err);
      throw new StorageProviderError(
        "STORAGE_UNAVAILABLE",
        "getBucket",
        `No se pudo inicializar Cloud Storage para el bucket "${this.bucketName}": ${info.message}`,
        { cause: err, hint: info.hint }
      );
    }
  }

  private sanitizePath(destinationPath: string): string {
    return (destinationPath || "").replace(/\.\./g, "").replace(/^\/+/, "").trim();
  }

  private buildPublicUrl(objectPath: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${encodeURI(objectPath)}`;
  }

  /**
   * Sube el binario y VERIFICA que existe con el tamaño esperado.
   * Si algo falla lanza StorageProviderError: nunca devuelve una URL fabricada.
   */
  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    if (!params.buffer || params.buffer.length === 0) {
      throw new StorageProviderError("UPLOAD_FAILED", "validate", "El buffer a subir está vacío");
    }

    const safePath = this.sanitizePath(params.destinationPath);
    if (safePath.length === 0) {
      throw new StorageProviderError(
        "UPLOAD_FAILED",
        "validate",
        `destinationPath inválido: "${params.destinationPath}"`
      );
    }

    const bucket = this.getBucket();
    const file = bucket.file(safePath);

    try {
      await file.save(params.buffer, {
        contentType: params.mimeType,
        resumable: false,
        metadata: {
          cacheControl: params.cacheControl || "public, max-age=31536000, immutable",
        },
      });
    } catch (err) {
      const info = classifyStorageError(err);
      throw new StorageProviderError(
        "UPLOAD_FAILED",
        "save",
        `No se pudo subir a gs://${this.bucketName}/${safePath}: ${info.message}`,
        { cause: err, hint: info.hint }
      );
    }

    // ── Verificación obligatoria post-subida ───────────────────────────────
    try {
      const [exists] = await file.exists();
      if (!exists) {
        throw new StorageProviderError(
          "VERIFY_FAILED",
          "exists",
          `El objeto gs://${this.bucketName}/${safePath} no existe después de la subida`
        );
      }

      const [metadata] = await file.getMetadata();
      const remoteSize = Number(metadata.size ?? -1);
      if (!Number.isFinite(remoteSize) || remoteSize !== params.buffer.length) {
        throw new StorageProviderError(
          "VERIFY_FAILED",
          "metadata",
          `Tamaño remoto (${remoteSize}) distinto del local (${params.buffer.length}) en gs://${this.bucketName}/${safePath}`
        );
      }
    } catch (err) {
      if (err instanceof StorageProviderError) throw err;
      const info = classifyStorageError(err);
      throw new StorageProviderError(
        "VERIFY_FAILED",
        "verify",
        `No se pudo verificar la subida de gs://${this.bucketName}/${safePath}: ${info.message}`,
        { cause: err, hint: info.hint }
      );
    }

    return {
      storagePath: safePath,
      publicUrl: this.buildPublicUrl(safePath),
      gsUri: `gs://${this.bucketName}/${safePath}`,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType,
      verified: true,
      bucket: this.bucketName,
    };
  }

  /**
   * Elimina un objeto. Idempotente (objeto ausente ⇒ true).
   * Lanza StorageProviderError si GCS responde con un error real.
   */
  async deleteFile(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;

    // Omitir eliminación para base64 inline o URLs externas no gestionadas
    if (
      storagePath.startsWith("data:") ||
      (storagePath.startsWith("http") && !storagePath.includes("storage.googleapis.com"))
    ) {
      return true;
    }

    const objectPath = normalizeObjectPath(storagePath, this.bucketName);
    if (objectPath.length === 0) return false;

    const bucket = this.getBucket();
    const file = bucket.file(objectPath);

    try {
      const [exists] = await file.exists();
      if (!exists) return true;
      await file.delete({ ignoreNotFound: true });
      return true;
    } catch (err) {
      const info = classifyStorageError(err);
      throw new StorageProviderError(
        "DELETE_FAILED",
        "delete",
        `No se pudo eliminar gs://${this.bucketName}/${objectPath}: ${info.message}`,
        { cause: err, hint: info.hint }
      );
    }
  }

  /**
   * URL firmada V4 para lectura privada.
   * Requiere que el SA del runtime tenga roles/iam.serviceAccountTokenCreator
   * sobre sí mismo (signBlob).
   */
  async getSignedUrl(storagePath: string, expiresInMinutes = 60): Promise<string> {
    const objectPath = normalizeObjectPath(storagePath, this.bucketName);
    if (objectPath.length === 0) {
      throw new StorageProviderError(
        "SIGNED_URL_FAILED",
        "validate",
        `Ruta no gestionable para firmar: "${storagePath}"`
      );
    }

    const bucket = this.getBucket();
    const file = bucket.file(objectPath);

    try {
      const [exists] = await file.exists();
      if (!exists) {
        throw new StorageProviderError(
          "SIGNED_URL_FAILED",
          "exists",
          `El objeto gs://${this.bucketName}/${objectPath} no existe: no se puede firmar una URL`,
          { hint: "Sube el binario antes de pedir una URL firmada." }
        );
      }
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return url;
    } catch (err) {
      if (err instanceof StorageProviderError) throw err;
      const info = classifyStorageError(err);
      throw new StorageProviderError(
        "SIGNED_URL_FAILED",
        "sign",
        `No se pudo firmar gs://${this.bucketName}/${objectPath}: ${info.message}`,
        {
          cause: err,
          hint:
            "Para firmar URLs en Cloud Run el service account necesita " +
            "roles/iam.serviceAccountTokenCreator sobre sí mismo. " + info.hint,
        }
      );
    }
  }

  /**
   * Sonda de salud del almacenamiento. Modo superficial: sólo lectura.
   * Modo profundo: escribe 1 byte, lo verifica por tamaño y lo borra.
   */
  async checkStorageHealth(options: StorageHealthOptions = {}): Promise<StorageHealthResult> {
    const probePath = this.sanitizePath(
      options.probePath || `${HEALTH_PROBE_PREFIX}persistence-probe.txt`
    );
    const base: StorageHealthResult = {
      bucketName: this.bucketName,
      bucketNameSource: getGcsBucketNameSource(),
      reachable: false,
      probePath,
      canWrite: false,
      canDelete: false,
    };

    let bucket: GcsBucket;
    try {
      bucket = this.getBucket();
    } catch (err) {
      const info =
        err instanceof StorageProviderError
          ? { code: err.code as string | undefined, message: err.message, hint: err.hint }
          : classifyStorageError(err);
      return {
        ...base,
        error: { code: String(info.code ?? "UNKNOWN"), message: info.message, hint: info.hint },
      };
    }

    const file: GcsFile = bucket.file(probePath);

    try {
      const [exists] = await file.exists();
      base.reachable = true;
      base.probeFound = exists;
    } catch (err) {
      const info = classifyStorageError(err);
      return {
        ...base,
        error: { code: info.code ?? info.kind, message: info.message, hint: info.hint },
      };
    }

    if (!options.deep) return base;

    const payload = Buffer.from(`ecomshop-storage-probe ${new Date().toISOString()}`, "utf-8");
    const startedAt = Date.now();
    try {
      const uploaded = await this.uploadFile({
        buffer: payload,
        destinationPath: probePath,
        mimeType: "text/plain",
        cacheControl: "no-store",
      });
      base.canWrite = true;
      base.wroteBytes = uploaded.sizeBytes;

      await file.delete({ ignoreNotFound: true });
      base.canDelete = true;
      base.roundtripMs = Date.now() - startedAt;
      return base;
    } catch (err) {
      const info =
        err instanceof StorageProviderError
          ? { code: err.code as string | undefined, message: err.message, hint: err.hint }
          : classifyStorageError(err);
      base.roundtripMs = Date.now() - startedAt;
      return {
        ...base,
        error: { code: String(info.code ?? "UNKNOWN"), message: info.message, hint: info.hint },
      };
    }
  }
}
