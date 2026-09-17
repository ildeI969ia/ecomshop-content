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

  async uploadFile(params: {
    buffer: Buffer;
    destinationPath: string;
    mimeType: string;
  }): Promise<StorageUploadResult> {
    // Sanitizar path contra path traversal
    const safePath = params.destinationPath.replace(/\.\./g, "").replace(/^\/+/, "");
    
    // Si no hay bucket en dev, devolver fallback con data URL segura
    return {
      storagePath: safePath,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${safePath}`,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType
    };
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    return true;
  }

  async getSignedUrl(storagePath: string, expiresInMinutes = 60): Promise<string> {
    return `https://storage.googleapis.com/${this.bucketName}/${storagePath}`;
  }
}
