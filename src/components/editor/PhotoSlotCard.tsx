"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Copy,
  Check,
  Trash2,
  Link2,
  ExternalLink,
  ChevronDown,
  Wand2
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { EditableArticleSection } from "@/lib/editorial-photo-suggester";

interface PhotoSlotCardProps {
  section: EditableArticleSection;
  sku: string;
  onInsertOrUpdateImage: (
    sectionId: string,
    image: { imageUrl: string; altText: string; caption: string } | undefined,
    usedPrompt?: string
  ) => void;
  onOpenImageStudio?: (prompt: string) => void;
}

export const PhotoSlotCard: React.FC<PhotoSlotCardProps> = ({
  section,
  sku,
  onInsertOrUpdateImage,
  onOpenImageStudio
}) => {
  const { suggestedPhoto, existingImage } = section;
  const [isExpanded, setIsExpanded] = useState<boolean>(suggestedPhoto.recommended || Boolean(existingImage));
  const [prompt, setPrompt] = useState<string>(suggestedPhoto.suggestedPrompt);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3" | "1:1">(suggestedPhoto.aspectRatio);
  const [altText, setAltText] = useState<string>(existingImage?.altText || suggestedPhoto.suggestedAlt);
  const [caption, setCaption] = useState<string>(existingImage?.caption || suggestedPhoto.suggestedCaption);
  const [customUrl, setCustomUrl] = useState<string>(existingImage?.imageUrl || "");
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Ignorar si portapapeles no está disponible
    }
  };

  const handleGenerateInlineImage = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          mode: "ai",
          autoImprove: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar la imagen con IA");
      }
      if (data.imageUrl) {
        setCustomUrl(data.imageUrl);
        onInsertOrUpdateImage(
          section.id,
          {
            imageUrl: data.imageUrl,
            altText: altText.trim() || `${sku} - ${section.headingText || "Imagen técnica"}`,
            caption: caption.trim() || suggestedPhoto.suggestedCaption
          },
          prompt.trim()
        );
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Error al generar la imagen");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    onInsertOrUpdateImage(
      section.id,
      {
        imageUrl: customUrl.trim(),
        altText: altText.trim() || `${sku} - ${section.headingText}`,
        caption: caption.trim() || suggestedPhoto.suggestedCaption
      },
      prompt.trim()
    );
    setShowUrlInput(false);
  };

  if (!isExpanded && !existingImage) {
    return (
      <div className="my-3 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full py-2 px-4 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 hover:bg-slate-900/90 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-300 text-[11px] flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            + Sugerencia de foto disponible tras{" "}
            <strong className="text-slate-200">{section.headingText || `Sección ${section.index + 1}`}</strong> ({suggestedPhoto.badgeLabel})
          </span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`my-4 rounded-xl border p-4 transition-all ${
        existingImage
          ? "bg-slate-900/95 border-emerald-700/60 shadow-lg"
          : "bg-indigo-950/25 border-indigo-500/40 border-dashed"
      }`}
    >
      {/* Cabecera del marcador de imagen */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              existingImage
                ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                : "bg-indigo-950 text-indigo-300 border border-indigo-700/60"
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            {existingImage ? "Foto Insertada en el Artículo" : "📍 Aquí conviene insertar una foto"}
          </span>
          <Badge variant="indigo" size="xs">
            {suggestedPhoto.badgeLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {existingImage && (
            <button
              type="button"
              onClick={() => onInsertOrUpdateImage(section.id, undefined)}
              className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/50 hover:bg-rose-950 px-2.5 py-1 rounded-lg border border-rose-800/60 flex items-center gap-1 transition cursor-pointer"
              title="Quitar imagen de esta sección"
            >
              <Trash2 className="w-3 h-3" />
              <span>Quitar foto</span>
            </button>
          )}
          {!existingImage && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded cursor-pointer"
            >
              Ocultar sugerencia
            </button>
          )}
        </div>
      </div>

      {/* Explicación editorial de por qué va una foto aquí */}
      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
        {suggestedPhoto.editorialReason}
      </p>

      {/* Si ya hay imagen insertada, mostrar previsualización en vivo + pie de foto editable */}
      {existingImage && (
        <div className="mb-4 bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-3">
          <div className="relative aspect-video max-h-72 w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
            <img
              src={existingImage.imageUrl}
              alt={altText}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                Pie de foto visible (Figcaption)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  onInsertOrUpdateImage(section.id, {
                    ...existingImage,
                    caption: e.target.value
                  });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                Texto Alternativo SEO (Alt Text)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => {
                  setAltText(e.target.value);
                  onInsertOrUpdateImage(section.id, {
                    ...existingImage,
                    altText: e.target.value
                  });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bloque del Prompt IA sugerido y acciones del generador */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prompt sugerido para el Generador de Imágenes IA (editable):</span>
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as "16:9" | "4:3" | "1:1")}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[10px] rounded-md px-2 py-1 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="16:9">16:9 Panorámica</option>
              <option value="4:3">4:3 Técnica</option>
              <option value="1:1">1:1 Cuadrada</option>
            </select>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            >
              {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedPrompt ? "Copiado" : "Copiar Prompt"}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
        />

        {localError && (
          <p className="text-[11px] text-rose-400 bg-rose-950/50 border border-rose-800/60 rounded-lg px-2.5 py-1.5">
            {localError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="xs"
              onClick={handleGenerateInlineImage}
              isLoading={isGenerating}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 border-indigo-500 font-bold"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {existingImage ? "Regenerar Foto con este Prompt" : "Generar e Insertar Foto Aquí"}
            </Button>

            {onOpenImageStudio && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => onOpenImageStudio(prompt)}
                leftIcon={<ExternalLink className="w-3 h-3" />}
              >
                Abrir Prompt en Estudio Visual
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowUrlInput((prev) => !prev)}
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{showUrlInput ? "Cerrar URL manual" : "Pegar URL de imagen"}</span>
          </button>
        </div>

        {showUrlInput && (
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://storage.googleapis.com/... o URL de foto técnica"
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <Button type="button" variant="secondary" size="xs" onClick={handleApplyCustomUrl}>
              Insertar URL en esta sección
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
