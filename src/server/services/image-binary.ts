import { createHash } from "crypto";
import sharp from "sharp";

/**
 * F3 — Preparación del binario ANTES de subirlo a GCS.
 *
 * Los data URLs de Imagen 3 superan con facilidad los 20 MB: Firestore rechaza
 * el documento (>1 MiB) y el navegador no puede pintar data URLs enormes. Aquí
 * se reduce a ≤1600 px en el lado largo y JPEG q0.85, y se calcula el SHA-256
 * del binario que REALMENTE se sube (nunca de uno inventado).
 */

export const IMAGE_MAX_EDGE_PX = 1600;
export const IMAGE_JPEG_QUALITY = 85;

export interface PreparedImageBinary {
  buffer: Buffer;
  mimeType: string;
  extension: "jpg" | "png" | "webp";
  sha256: string;
  /** true si sharp reescribió el binario; false si se sube tal cual. */
  optimized: boolean;
}

export function sha256Of(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Optimiza un binario de imagen. Si sharp no puede leerlo, devuelve el buffer
 * original sin tocarlo (mejor subir el original verificado que perderlo).
 */
export async function prepareImageBinary(
  buffer: Buffer,
  mimeType: string
): Promise<PreparedImageBinary> {
  const normalized = mimeType.toLowerCase();

  try {
    const optimized = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: IMAGE_MAX_EDGE_PX,
        height: IMAGE_MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    if (optimized.length > 0 && optimized.length < buffer.length) {
      return {
        buffer: optimized,
        mimeType: "image/jpeg",
        extension: "jpg",
        sha256: sha256Of(optimized),
        optimized: true,
      };
    }
  } catch {
    // El binario no es decodificable por sharp: se sube sin transformar.
  }

  const extension = normalized.includes("png")
    ? "png"
    : normalized.includes("webp")
      ? "webp"
      : "jpg";

  return {
    buffer,
    mimeType: normalized.startsWith("image/") ? normalized : "image/jpeg",
    extension,
    sha256: sha256Of(buffer),
    optimized: false,
  };
}
