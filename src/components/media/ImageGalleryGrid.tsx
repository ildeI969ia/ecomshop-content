"use client";

import React, { useState } from "react";
import {
  Maximize2,
  Trash2,
  Download,
  Search,
  Shield,
  Sparkles,
  ImageIcon,
  Check
} from "lucide-react";
import { GeneratedImageItem } from "@/components/image-studio-view";

interface ImageGalleryGridProps {
  images: GeneratedImageItem[];
  selectedImageIds: string[];
  onSelectImage: (id: string, selected: boolean) => void;
  onOpenLightbox: (img: GeneratedImageItem) => void;
  onDeleteImage: (id: string) => void;
  onApplyToCampaignBlog: (img: GeneratedImageItem) => void;
  onDownloadImage: (url: string, id: string) => Promise<void>;
  downloadingId: string | null;
}

export const ImageGalleryGrid: React.FC<ImageGalleryGridProps> = ({
  images,
  selectedImageIds,
  onSelectImage,
  onOpenLightbox,
  onDeleteImage,
  onApplyToCampaignBlog,
  onDownloadImage,
  downloadingId
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
      {images.map((img) => {
        const isSelected = selectedImageIds.includes(img.id);
        const isOfficial =
          img.sourceType === "official_product" ||
          img.source === "OFFICIAL_PRODUCT";
        const isImagen3 =
          img.sourceType === "imagen3" ||
          img.sourceType === "VERTEX_IMAGEN_3" ||
          img.sourceType === "AI_STUDIO_IMAGEN_3" ||
          img.source === "VERTEX_IMAGEN_3" ||
          img.source === "AI_STUDIO_IMAGEN_3";

        return (
          <div
            key={img.id}
            className={`group relative bg-slate-950 border rounded-xl overflow-hidden shadow-lg hover:border-indigo-500/50 transition-all flex flex-col justify-between ${
              isSelected
                ? "border-indigo-500 ring-2 ring-indigo-500/30"
                : "border-slate-800"
            }`}
          >
            {/* Contenedor de la Imagen */}
            <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden cursor-zoom-in">
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.prompt || img.title || "Activo visual"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onClick={() => onOpenLightbox(img)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 gap-1 p-4">
                  <ImageIcon className="w-8 h-8 text-slate-700 mb-1" />
                  <span className="text-[11px]">Imagen no disponible</span>
                </div>
              )}

              {/* Badge flotante de origen */}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/90 backdrop-blur-md text-slate-300 border border-slate-700 flex items-center gap-1 select-none z-10">
                {isOfficial ? (
                  <>
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>📷 Foto Oficial</span>
                  </>
                ) : isImagen3 ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>✨ Imagen 3</span>
                  </>
                ) : img.sourceType === "gemini_multimodal" ? (
                  <span>🤖 Multimodal</span>
                ) : (
                  <span>🖼️ Stock</span>
                )}
              </span>

              {/* Checkbox de Selección */}
              <div
                className="absolute top-2 right-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelectImage(img.id, e.target.checked)}
                  aria-label={`Seleccionar imagen ${img.title || img.id}`}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900/90 cursor-pointer shadow-md"
                  title="Seleccionar para acciones masivas"
                />
              </div>

              {/* Overlay de Hover para Lightbox */}
              <div
                onClick={() => onOpenLightbox(img)}
                className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs backdrop-blur-2xs pointer-events-none"
              >
                <Maximize2 className="w-4 h-4 text-indigo-300" />
                <span>Ver en grande</span>
              </div>
            </div>

            {/* Acciones al pie de la tarjeta */}
            <div className="p-2.5 bg-slate-900/95 flex items-center justify-between border-t border-slate-800/80 gap-2">
              <span
                className="text-xs text-slate-400 truncate max-w-[130px] select-none cursor-pointer hover:text-slate-200"
                title={img.title || img.prompt}
                onClick={() => onOpenLightbox(img)}
              >
                {img.title || img.prompt}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                {/* 1. Ver en grande / Lightbox */}
                <button
                  type="button"
                  onClick={() => onOpenLightbox(img)}
                  title="Ver en grande (Lightbox con zoom)"
                  aria-label="Ver imagen en grande"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                {/* 2. Descargar Imagen */}
                <button
                  type="button"
                  onClick={() => onDownloadImage(img.url, img.id)}
                  disabled={downloadingId === img.id}
                  title="Descargar imagen"
                  aria-label="Descargar imagen"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50 cursor-pointer"
                >
                  {downloadingId === img.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* 3. Insertar en el Blog de la Campaña */}
                <button
                  type="button"
                  onClick={() => onApplyToCampaignBlog(img)}
                  title="Insertar en el Blog de la campaña activa"
                  className="rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs px-2 py-1 transition font-medium cursor-pointer"
                >
                  Usar en Blog
                </button>

                {/* 4. Borrar individual */}
                <button
                  type="button"
                  onClick={() => onDeleteImage(img.id)}
                  title="Eliminar esta imagen"
                  aria-label="Eliminar esta imagen"
                  className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
