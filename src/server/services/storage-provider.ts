import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "../config/firebase";

export interface StorageUploadResult {
  storagePath: string;
  publicUrl?: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageProvider {
  uploadFile(params: {
    buffer: Buffer;
    destinationPath: string;
    mimeType: string;
  }): Promise<StorageUploadResult>;
  deleteFile(storagePath: string): Promise<boolean>;
  getSignedUrl(storagePath: string, expiresInMinutes?: number): Promise<string>;
}

export class GoogleCloudStorageProvider implements StorageProvider {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || "ecomshop-marketing-assets";
  }

  private getBucket() {
    try {
      const app = getFirebaseAdminApp();
      return getStorage(app).bucket(this.bucketName);
    } catch (err) {
      console.warn("[StorageProvider] No se pudo obtener el bucket de Firebase/GCS:", err);
      return null;
    }
  }

  async uploadFile(params: {
    buffer: Buffer;
    destinationPath: string;
    mimeType: string;
  }): Promise<StorageUploadResult> {
    // Sanitizar path contra path traversal
    const safePath = params.destinationPath.replace(/\.\./g, "").replace(/^\/+/, "");
    
    try {
      const bucket = this.getBucket();
      if (bucket) {
        const file = bucket.file(safePath);
        await file.save(params.buffer, {
          contentType: params.mimeType,
          resumable: false,
        });
      }
    } catch (err) {
      console.warn("[StorageProvider] No se pudo guardar en GCS bucket (modo fallback dev):", err);
    }

    return {
      storagePath: safePath,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${safePath}`,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType
    };
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    if (!storagePath) {
      return false;
    }

    // Omitir eliminación en GCS para URLs en base64 inline o URLs externas
    if (storagePath.startsWith("data:") || (storagePath.startsWith("http") && !storagePath.includes("storage.googleapis.com"))) {
      return true;
    }

    try {
      let cleanPath = storagePath;
      if (cleanPath.startsWith("https://storage.googleapis.com/")) {
        const withoutPrefix = cleanPath.replace("https://storage.googleapis.com/", "");
        const parts = withoutPrefix.split("/");
        if (parts[0] === this.bucketName) {
          cleanPath = parts.slice(1).join("/");
        } else {
          cleanPath = parts.join("/");
        }
      } else if (cleanPath.startsWith("gs://")) {
        const withoutPrefix = cleanPath.replace("gs://", "");
        const parts = withoutPrefix.split("/");
        if (parts[0] === this.bucketName) {
          cleanPath = parts.slice(1).join("/");
        } else {
          cleanPath = parts.join("/");
        }
      }

      cleanPath = cleanPath.replace(/\.\./g, "").replace(/^\/+/, "");

      const bucket = this.getBucket();
      if (!bucket) {
        console.warn(`[StorageProvider] Bucket no disponible en local/dev. Saltando eliminación física para: ${storagePath}`);
        return true;
      }

      const file = bucket.file(cleanPath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete({ ignoreNotFound: true });
      }
      return true;
    } catch (error) {
      console.warn(`[StorageProvider] deleteFile falló u omitido con gracia para ${storagePath}:`, error);
      return true;
    }
  }

  async getSignedUrl(storagePath: string, expiresInMinutes = 60): Promise<string> {
    try {
      const bucket = this.getBucket();
      if (bucket) {
        const cleanPath = storagePath.replace(/\.\./g, "").replace(/^\/+/, "");
        const file = bucket.file(cleanPath);
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + expiresInMinutes * 60 * 1000
        });
        return url;
      }
    } catch {
      // Fallback a URL pública
    }
    return `https://storage.googleapis.com/${this.bucketName}/${storagePath}`;
  }
}
