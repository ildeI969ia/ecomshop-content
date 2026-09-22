"use client";

import React, { useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compressor";

interface ImageUploadZoneProps {
  imageBase: string | null;
  onSetImageBase: (base: string | null) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
];

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  imageBase,
  onSetImageBase,
  maxSizeMB = 15,
  allowedTypes = DEFAULT_ALLOWED_TYPES
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setUploadError(null);

    // Validación de tipo MIME
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        `Formato no admitido (${file.type || "desconocido"}). Solo se permiten imágenes JPEG, PNG, WEBP o AVIF.`
      );
      return;
    }

    // Validación de tamaño máximo
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `La imagen supera el límite permitido de ${maxSizeMB}MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      onSetImageBase(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onSetImageBase(ev.target?.result as string);
      };
      reader.onerror = () => {
        setUploadError("Error al leer el archivo seleccionado.");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <Upload className="w-3 h-3 text-purple-400" />
          Imagen Base de Referencia
        </label>
        {imageBase && (
          <button
            type="button"
            onClick={() => {
              onSetImageBase(null);
              setUploadError(null);
            }}
            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            Quitar
          </button>
        )}
      </div>

      {uploadError && (
        <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-[11px] flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {imageBase ? (
        <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-purple-500/40 group">
          <img src={imageBase} alt="Referencia activa" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <span className="text-white text-[11px] font-medium">Referencia activa para variaciones</span>
          </div>
        </div>
      ) : (
        <label className="border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900 hover:bg-purple-950/20 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center">
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-xs text-slate-400 font-medium">
              {isProcessing ? "Procesando imagen..." : "Subir imagen base de referencia"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            JPG, PNG o WEBP (máx. {maxSizeMB}MB)
          </span>
          <input
            type="file"
            accept={allowedTypes.join(",")}
            className="hidden"
            disabled={isProcessing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}
    </div>
  );
};
