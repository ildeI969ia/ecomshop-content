"use client";

import React, { useState } from "react";
import {
  X,
  Save,
  Globe,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertCircle,
  FileText,
  Tag
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { ContentOutput } from "@/lib/schema";

interface ArticleInlineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentOutput;
  contentId?: string | null;
  sku: string;
  onSaveContent: (updatedContent: ContentOutput) => Promise<void>;
  onOpenImageStudio?: (prompt: string) => void;
}

export function ArticleInlineEditorModal({
  isOpen,
  onClose,
  content: initialContent,
  contentId,
  sku,
  onSaveContent,
  onOpenImageStudio
}: ArticleInlineEditorModalProps) {
  const [title, setTitle] = useState(initialContent.blog?.title || initialContent.geo?.title || "");
  const [metaDescription, setMetaDescription] = useState(
    initialContent.blog?.metaDescription || initialContent.geo?.metaDescription || ""
  );
  const [slug, setSlug] = useState(initialContent.blog?.slug || "");
  const [readingTimeMinutes, setReadingTimeMinutes] = useState(
    initialContent.blog?.readingTimeMinutes || 5
  );
  const [targetKeywords, setTargetKeywords] = useState(
    (initialContent.blog?.targetKeywords || []).join(", ")
  );
  const [featuredImageUrl, setFeaturedImageUrl] = useState(
    initialContent.blog?.featuredImageUrl ||
      initialContent.blog?.editorialLayout?.photoPlacements?.find((p) => p.imageUrl)?.imageUrl ||
      ""
  );
  const [imageAltText, setImageAltText] = useState(
    initialContent.blog?.editorialLayout?.photoPlacements?.[0]?.altText || `${sku} imagen destacada`
  );
  const [htmlContent, setHtmlContent] = useState(
    initialContent.blog?.htmlContent || initialContent.geo?.htmlContent || ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusNotice(null);
    setErrorMessage(null);

    try {
      const keywordsArray = targetKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const existingPlacements = initialContent.blog?.editorialLayout?.photoPlacements || [];
      const updatedPlacements = [...existingPlacements];

      if (featuredImageUrl) {
        const heroIndex = updatedPlacements.findIndex((p) => p.photoType === "PRODUCT_HERO");
        const heroPlacement = {
          id: heroIndex >= 0 ? updatedPlacements[heroIndex].id : `hero-${Date.now()}`,
          placementAfterHeading: "Introducción",
          position: "BEFORE_SECTION" as const,
          photoType: "PRODUCT_HERO" as const,
          aspectRatio: "16:9",
          description: `Imagen destacada para ${title}`,
          imagen3Prompt: `Professional photographic shot of ${sku}`,
          productSku: sku,
          altText: imageAltText,
          caption: imageAltText,
          imageUrl: featuredImageUrl,
          status: "GENERATED" as const
        };

        if (heroIndex >= 0) {
          updatedPlacements[heroIndex] = { ...updatedPlacements[heroIndex], ...heroPlacement };
        } else {
          updatedPlacements.unshift(heroPlacement);
        }
      }

      const updatedContent: ContentOutput = {
        ...initialContent,
        blog: {
          ...initialContent.blog,
          title,
          metaDescription,
          slug,
          readingTimeMinutes: Number(readingTimeMinutes) || 5,
          targetKeywords: keywordsArray,
          featuredImageUrl: featuredImageUrl || undefined,
          htmlContent,
          editorialLayout: {
            ...initialContent.blog?.editorialLayout,
            photoPlacements: updatedPlacements
          }
        },
        geo: initialContent.geo
          ? {
              ...initialContent.geo,
              title,
              metaDescription,
              htmlContent
            }
          : undefined
      };

      await onSaveContent(updatedContent);
      setStatusNotice("Cambios guardados con éxito en la versión del artículo.");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error guardando cambios: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateHeroWithAI = async () => {
    setIsRegeneratingImage(true);
    setStatusNotice(null);
    setErrorMessage(null);

    try {
      const prompt = `Professional high-end B2B photography of ${sku} networking hardware in clean modern datacenter, sharp focus, 8k resolution, studio lighting.`;
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio: "16:9",
          mode: "ai",
          autoImprove: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar la imagen");
      }

      if (data.imageUrl) {
        setFeaturedImageUrl(data.imageUrl);
        setImageAltText(`${sku} - Vista técnica de infraestructura y conectividad`);
        setStatusNotice("Nueva imagen generada y asignada como destacada.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error generando imagen: ${msg}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera del Editor */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Editor de Publicación & SEO</h3>
                <Badge variant="indigo" size="xs">
                  SKU: {sku}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Modifica el texto, palabras clave y la imagen destacada que se renderiza en el blog público.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Estado */}
        {statusNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 px-6 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{statusNotice}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-950/90 border-b border-rose-800 px-6 py-2.5 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cuerpo del Formulario */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {/* Fila 1: Título y Slug */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-300">Título del Artículo (H1 / SEO)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Slug URL</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-indigo-300 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 2: Meta Descripción y Tiempo de Lectura */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1.5">
              <label className="font-semibold text-slate-300">
                Meta Descripción (Google Search Snippet & OpenGraph)
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Minutos de Lectura</label>
              <input
                type="number"
                min={1}
                max={60}
                value={readingTimeMinutes}
                onChange={(e) => setReadingTimeMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 3: Palabras Clave */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Palabras Clave Objetivo (separadas por comas)</span>
            </label>
            <input
              type="text"
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
              placeholder="WiFi 6, EnGenius, switches gestionables, PoE 802.3bt"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Fila 4: Imagen Destacada del Artículo (Hero) */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-sm">Imagen Destacada del Post (Hero)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={handleRegenerateHeroWithAI}
                  isLoading={isRegeneratingImage}
                  disabled={isRegeneratingImage}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                >
                  Regenerar con IA
                </Button>
                {onOpenImageStudio && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      onOpenImageStudio(`Professional B2B render of ${sku} in server rack`);
                      onClose();
                    }}
                  >
                    Estudio Visual
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {featuredImageUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                  <img
                    src={featuredImageUrl}
                    alt={imageAltText}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 gap-1">
                  <ImageIcon className="w-6 h-6 opacity-40" />
                  <span className="text-[10px]">Sin imagen destacada</span>
                </div>
              )}

              <div className="sm:col-span-2 space-y-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium text-[11px]">URL de Imagen Destacada</label>
                  <input
                    type="url"
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder="https://storage.googleapis.com/... o https://images.unsplash.com/..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium text-[11px]">
                    Texto Alternativo (Alt Text para Accesibilidad y Google Lens)
                  </label>
                  <input
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="Descripción técnica del dispositivo y entorno..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fila 5: Editor del Cuerpo HTML */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">
                Cuerpo del Artículo (HTML / Secciones técnicas)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {htmlContent.length} caracteres
              </span>
            </div>
            <textarea
              rows={12}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pie con Acciones */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 border-indigo-500 font-bold px-6"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
