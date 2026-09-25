"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Camera,
  Upload,
  Shield,
  Maximize2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Trash2,
  Download,
  Check,
  ChevronDown,
  Layers,
  Search,
  ExternalLink,
  SlidersHorizontal,
  X
} from "lucide-react";
import { STAR_PRODUCTS, StarProduct } from "@/lib/knowledge";
import { ECOMSHOP_CATALOG, getCatalogDevice, getAllCatalogDevices, getEcomshopOnlyDevices, catalogDeviceToStarProduct, CatalogDevice } from "@/lib/catalog";
import { PRESET_IMAGE_PROMPTS } from "@/lib/image-generator";
import { PromptRefinementCard, PromptRefinementData } from "@/components/PromptRefinementCard";
import { compressImageToDataUrl } from "@/lib/image-compressor";

import { ImageGalleryGrid } from "@/components/media/ImageGalleryGrid";
import { ImageUploadZone } from "@/components/media/ImageUploadZone";
import { useImageDownloader } from "@/hooks/useImageDownloader";

export interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  sourceType?: string;
  warning?: string;
  storageStatus?: string;
  title?: string;
  source?: string;
}

interface ImageStudioViewProps {
  // Galería
  images: GeneratedImageItem[];
  selectedImageIds: string[];
  onSelectImage: (id: string, selected: boolean) => void;
  onSelectAll: (selectAll: boolean) => void;
  onClearAll: () => void;
  onRefreshDatabase: () => void;
  loadingDatabaseAssets: boolean;
  assetsSyncError?: string | null;
  onOpenLightbox: (img: GeneratedImageItem) => void;
  onDeleteImage: (id: string) => void;
  onApplyToCampaignBlog: (img: GeneratedImageItem) => void;
  onUseAsBase: (url: string) => void;
  onReuseInLinkedIn: (img: GeneratedImageItem) => void;

  // Parámetros y Generador
  imagePrompt: string;
  onChangePrompt: (prompt: string) => void;
  imageAspectRatio: "16:9" | "1:1" | "4:3";
  onChangeAspectRatio: (ratio: "16:9" | "1:1" | "4:3") => void;
  imageBase: string | null;
  onSetImageBase: (base: string | null) => void;
  generatingImage: boolean;
  onGenerateImage: (mode: "ai" | "curated") => void;
  imageNotice: string | null;

  // Director de Arte & Refinamiento
  onOpenInterrogatorModal: () => void;
  refiningPrompt: boolean;
  promptRefinement: PromptRefinementData | null;
  onRefinePrompt: () => void;
  onApplyRefinedPrompt: (refined: string) => void;
  onApplyAndGenerateRefinedPrompt: (refined: string) => void;
  onDismissRefinement: () => void;

  // Plantillas Técnicas
  presetTemplates: typeof PRESET_IMAGE_PROMPTS;
  onVarySingleTemplate: (template: (typeof PRESET_IMAGE_PROMPTS)[number], e?: React.MouseEvent) => void;
  varyingTemplateId: string | null;
  isRegeneratingTemplates: boolean;
  onRegenerateAllTemplates: () => void;
  onRestoreDefaultTemplates: () => void;

  // Catálogo Oficial
  currentUserRole?: string;
  onUseRealProductPhoto: (product: StarProduct) => void;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  images,
  selectedImageIds,
  onSelectImage,
  onSelectAll,
  onClearAll,
  onRefreshDatabase,
  loadingDatabaseAssets,
  assetsSyncError,
  onOpenLightbox,
  onDeleteImage,
  onApplyToCampaignBlog,
  onUseAsBase,
  onReuseInLinkedIn,
  imagePrompt,
  onChangePrompt,
  imageAspectRatio,
  onChangeAspectRatio,
  imageBase,
  onSetImageBase,
  generatingImage,
  onGenerateImage,
  imageNotice,
  onOpenInterrogatorModal,
  refiningPrompt,
  promptRefinement,
  onRefinePrompt,
  onApplyRefinedPrompt,
  onApplyAndGenerateRefinedPrompt,
  onDismissRefinement,
  presetTemplates,
  onVarySingleTemplate,
  varyingTemplateId,
  isRegeneratingTemplates,
  onRegenerateAllTemplates,
  onRestoreDefaultTemplates,
  currentUserRole = "editor",
  onUseRealProductPhoto
}) => {
  const { downloadingId, downloadImage } = useImageDownloader();
  const [activeTab, setActiveTab] = useState<"ai" | "official">("ai");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedProductSku, setSelectedProductSku] = useState<string>(ECOMSHOP_CATALOG[0]?.sku || "ECW536");
  const [urlInput, setUrlInput] = useState<string>('');
  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const isAdmin = currentUserRole.toLowerCase() === "admin";
  const isAllSelected = images.length > 0 && images.every((img) => selectedImageIds.includes(img.id));

  return (
    <div className="flex-1 max-w-[1780px] 2xl:max-w-[1920px] mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-5rem)]">
      {/* ========================================================================= */}
      {/* PANEL IZQUIERDO: HUB DE CREACIÓN & CONTROLES (5 Cols / Pestañas Organizadas) */}
      {/* ========================================================================= */}
      <aside className="lg:col-span-5 xl:col-span-5 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          {/* Header del Panel */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-editorial text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                Estudio Visual de Activos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Genera imágenes con IA o importa fotografías oficiales del catálogo EnGenius.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              ~0,004 € / img
            </span>
          </div>

          {/* Selector de Pestañas Principales */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "ai"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Crear con IA</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("official")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "official"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>Foto oficial (0€)</span>
            </button>
          </div>

          {activeTab === "ai" ? (
            /* ================= TAB 1: CREAR CON IA ================= */
            <div className="space-y-4">
              {/* 1. SELECCIÓN DE PROMPT Y RELACIÓN DE ASPECTO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    Prompt de Generación
                  </label>
                  <button
                    type="button"
                    onClick={onRefinePrompt}
                    disabled={refiningPrompt || !imagePrompt.trim()}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-1 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 px-2 py-0.5 rounded-lg transition disabled:opacity-40"
                    title="Analizar y cualificar el prompt actual con IA"
                  >
                    {refiningPrompt ? (
                      <>
                        <div className="w-2.5 h-2.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                        <span>Cualificando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>✨ Cualificar con IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Presets Rápidos B2B */}
                <div className="flex flex-wrap gap-1.5 pt-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChangePrompt("EnGenius Wi-Fi 7 Enterprise Access Point mounted on acoustic office ceiling, subtle status LED active, modern open-plan corporate headquarters, 8k commercial photography, realistic lighting");
                      onChangeAspectRatio("16:9");
                    }}
                    title="Generar escena de Access Point Wi-Fi 7 montado en techo de oficina"
                    className="text-[11px] font-semibold bg-slate-950 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/50 text-slate-200 hover:text-indigo-200 px-2.5 py-1 rounded-lg transition"
                  >
                    🏢 AP en Techo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangePrompt("Enterprise server rack 42U in climate-controlled datacenter with EnGenius Cloud Switches, organized Cat6A patch cables, active blue LEDs, professional cable management, photorealistic");
                      onChangeAspectRatio("16:9");
                    }}
                    title="Generar rack 42U con switches EnGenius y cableado profesional"
                    className="text-[11px] font-semibold bg-slate-950 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/50 text-slate-200 hover:text-indigo-200 px-2.5 py-1 rounded-lg transition"
                  >
                    🗄️ Rack 42U
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangePrompt("Isometric 3D network topology diagram of enterprise campus with gateway, core switches, PoE distribution and Wi-Fi 7 access points, sleek clean tech aesthetic, high resolution");
                      onChangeAspectRatio("16:9");
                    }}
                    title="Generar diagrama isométrico 3D de topología de red de campus"
                    className="text-[11px] font-semibold bg-slate-950 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/50 text-slate-200 hover:text-indigo-200 px-2.5 py-1 rounded-lg transition"
                  >
                    📊 Topología 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangePrompt("EnGenius IP67 weather-resistant outdoor wireless access point mounted on industrial pole in harsh outdoor environment with water droplets, ruggedized casing, heavy duty telecommunications hardware, photorealistic 8k");
                      onChangeAspectRatio("1:1");
                    }}
                    title="Generar AP de exterior en entorno resistente IP67"
                    className="text-[11px] font-semibold bg-slate-950 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/50 text-slate-200 hover:text-indigo-200 px-2.5 py-1 rounded-lg transition"
                  >
                    🌲 Outdoor IP67
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => {
                    onChangePrompt(e.target.value);
                    if (promptRefinement) onDismissRefinement();
                  }}
                  placeholder="Describe tu escena (ej: switch PoE+ de 24 puertos en rack con LEDs azules activos y cableado estructurado en data center empresarial)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
                  title={imagePrompt || "Campo de texto del prompt para la generación visual"}
                />

                {/* Asistente de Prompt Cualificado */}
                {promptRefinement && (
                  <div className="mt-2">
                    <PromptRefinementCard
                      refinement={promptRefinement}
                      loading={refiningPrompt}
                      currentPrompt={imagePrompt}
                      onRequestRefine={onRefinePrompt}
                      onApply={onApplyRefinedPrompt}
                      onApplyAndGenerate={onApplyAndGenerateRefinedPrompt}
                      onDismiss={onDismissRefinement}
                    />
                  </div>
                )}

                {/* Selector de Relación de Aspecto */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-slate-300">Formato / Relación de Aspecto</span>
                    <span className="text-[10px] text-slate-500">
                      {imageAspectRatio === "16:9" ? "Blog / Portada (16:9)" : imageAspectRatio === "1:1" ? "Redes Sociales / Feed (1:1)" : "Ficha / Doc (4:3)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["16:9", "1:1", "4:3"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onChangeAspectRatio(ratio)}
                        className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                          imageAspectRatio === ratio
                            ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aviso o Warning */}
                {imageNotice && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] leading-snug flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{imageNotice}</span>
                  </div>
                )}

                {/* BOTONES DE GENERACIÓN PRINCIPALES */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onGenerateImage("ai")}
                    disabled={generatingImage}
                    title="Genera una imagen fotorrealista única usando la API de Google Imagen 3"
                    className="w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-900/30 cursor-pointer"
                  >
                    {generatingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generando Activo con Imagen 3...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generar con Google Imagen 3 (~0,004 €)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onGenerateImage("curated")}
                    disabled={generatingImage}
                    title="Buscar imagen de stock neutra libre de derechos sin coste"
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>🖼️ Usar Banco de Stock Web (Gratis 0,00 €)</span>
                  </button>
                </div>
              </div>

              {/* RECURSOS AVANZADOS IA */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <details className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <summary className="p-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center justify-between list-none select-none transition">
                    <div className="flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>🎨 Director de Arte IA & Referencia</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {imageBase && (
                        <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold px-1.5 py-0.5 rounded">
                          Base activa
                        </span>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="p-3 pt-0 border-t border-slate-800/60 mt-2 space-y-3">
                    <button
                      type="button"
                      onClick={onOpenInterrogatorModal}
                      className="w-full bg-gradient-to-r from-indigo-950/80 to-slate-900 hover:from-indigo-900/80 hover:to-slate-800 border border-indigo-500/40 text-indigo-200 font-bold p-2.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold">Director de Arte IA</div>
                          <div className="text-[10px] text-indigo-300/80 font-normal">
                            Interrogatorio fotográfico guiado
                          </div>
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </button>

                    <ImageUploadZone
                      imageBase={imageBase}
                      onSetImageBase={onSetImageBase}
                      maxSizeMB={15}
                    />
                  </div>
                </details>

                <details className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <summary className="p-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center justify-between list-none select-none transition">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>📋 Plantillas Técnicas Preconfiguradas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{presetTemplates.length} plantillas</span>
                      <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="p-3 pt-0 border-t border-slate-800/60 mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/40">
                      <span className="text-[10px] text-slate-400">Selecciona para cargar el prompt:</span>
                      <div className="flex items-center gap-1.5">
                        {JSON.stringify(presetTemplates) !== JSON.stringify(PRESET_IMAGE_PROMPTS) && (
                          <button
                            type="button"
                            onClick={onRestoreDefaultTemplates}
                            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 transition flex items-center gap-1"
                            title="Restaurar valores de catálogo"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Restaurar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onRegenerateAllTemplates}
                          disabled={isRegeneratingTemplates}
                          className="text-[10px] text-indigo-300 hover:text-indigo-200 font-semibold px-2 py-0.5 rounded border border-indigo-700/50 bg-indigo-950 transition flex items-center gap-1 disabled:opacity-50"
                          title="Regenerar con IA"
                        >
                          {isRegeneratingTemplates ? (
                            <>
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                              <span>Regenerando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Regenerar IA</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {presetTemplates.map((p) => {
                        const isSelected = imagePrompt === p.prompt;
                        const isVarying = varyingTemplateId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              onChangePrompt(p.prompt);
                              onChangeAspectRatio(p.aspectRatio);
                            }}
                            className={`p-2 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30"
                                : "border-slate-800/80 bg-slate-900 hover:bg-slate-800/80 text-slate-300"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-200 truncate">{p.title}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-indigo-400 font-mono font-semibold bg-indigo-950 px-1 py-0.2 rounded shrink-0">
                                  {p.aspectRatio}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate" title={p.prompt}>
                                  {p.prompt}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => onVarySingleTemplate(p, e)}
                              disabled={isVarying || isRegeneratingTemplates}
                              className="shrink-0 p-1.5 rounded-md hover:bg-indigo-900/60 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-700 transition flex items-center gap-1 text-[10px] bg-slate-950 disabled:opacity-40"
                              title="Variar con IA"
                            >
                              <RefreshCw className={`w-3 h-3 ${isVarying ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ) : (
            /* ================= TAB 2: FOTO OFICIAL Y URL ================= */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Fotografías Oficiales de Fabricante (0€)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Importa imágenes reales y fichas técnicas homologadas de EcomShop ({getEcomshopOnlyDevices().length} productos en catálogo sin alucinaciones).
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={selectedProductSku}
                    onChange={(e) => setSelectedProductSku(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {getAllCatalogDevices().map((dev) => (
                      <option key={dev.sku} value={dev.sku}>
                        {dev.sku} — {dev.name} ({dev.category.replace("SWITCH_", "").replace("GATEWAY_", "")})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const dev = getCatalogDevice(selectedProductSku) || getAllCatalogDevices()[0];
                      if (dev) {
                        const star = catalogDeviceToStarProduct(dev);
                        onUseRealProductPhoto(star);
                      }
                    }}
                    title="Importar fotografía oficial directa a la galería"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shrink-0 shadow-sm cursor-pointer"
                  >
                    Importar (0€)
                  </button>
                </div>
              </div>

              {/* Ficha técnica preview */}
              {(() => {
                const activeDevice = getCatalogDevice(selectedProductSku) || getAllCatalogDevices()[0];
                if (!activeDevice) return null;
                const activeStar = catalogDeviceToStarProduct(activeDevice);

                return (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeStar.imageUrl}
                        alt={activeStar.name}
                        className="w-20 h-16 object-contain bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-white">{activeDevice.sku}</span>
                          <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950 border border-emerald-800 px-1.5 py-0.2 rounded">
                            {activeDevice.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-200 font-semibold truncate mt-0.5">{activeDevice.name}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{activeDevice.shortDesc}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="text-slate-400 truncate">
                        <span className="text-slate-500 font-semibold">Alimentación: </span>
                        <span className="text-slate-300">{activeDevice.specs.powerSource}</span>
                      </div>
                      <div className="text-slate-400 truncate">
                        <span className="text-slate-500 font-semibold">Bundle: </span>
                        <span className="text-emerald-400 font-mono">{activeDevice.recommendedBundle}</span>
                      </div>
                      <div className="text-slate-400 truncate col-span-2">
                        <span className="text-slate-500 font-semibold">Interfaces: </span>
                        <span className="text-slate-300">{activeDevice.specs.interfaces.join(" • ")}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Resolver URL de Producto */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Resolver URL de Producto (ecomshop.es)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.ecomshop.es/producto/xyz"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!urlInput) return;
                    setResolveLoading(true);
                    setResolveError(null);
                    try {
                      const res = await fetch('/api/catalog/resolve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: urlInput }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        const err = (data as any).error?.message || 'Error al resolver URL';
                        setResolveError(err);
                      } else {
                        const prod = data as any;
                        let star: any;
                        if (prod.sku) {
                          const dev = getCatalogDevice(prod.sku);
                          star = dev ? catalogDeviceToStarProduct(dev) : {
                            id: prod.sku,
                            name: prod.name || prod.title || prod.sku,
                            model: prod.sku,
                            category: prod.category || 'engenius',
                            description: prod.description || '',
                            url: prod.url,
                            imageUrl: prod.imageUrl,
                            specs: prod.specs ? Object.values(prod.specs) : [],
                          };
                        } else {
                          star = {
                            id: prod.url,
                            name: prod.name || prod.title || 'Producto',
                            model: prod.model || '',
                            category: prod.category || 'engenius',
                            description: prod.description || '',
                            url: prod.url,
                            imageUrl: prod.imageUrl,
                            specs: prod.specs ? Object.values(prod.specs) : [],
                          };
                        }
                        onUseRealProductPhoto(star);
                      }
                    } catch (e: any) {
                      setResolveError(e.message || 'Network error');
                    } finally {
                      setResolveLoading(false);
                    }
                  }}
                  disabled={resolveLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                >
                  {resolveLoading ? 'Resolviendo Ficha...' : 'Analizar Ficha Técnica'}
                </button>
                {resolveError && (
                  <p className="text-xs text-rose-400 mt-1">{resolveError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* PANEL DERECHO: GRID VISUAL MODERNO (7 Cols / Galería Responsiva)           */}
      {/* ========================================================================= */}
      <main className="lg:col-span-7 xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col shadow-xl min-h-[620px]">
        {/* Header de la Galería */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-wrap gap-2">
          <div>
            <h3 className="font-editorial text-sm font-bold text-white flex items-center gap-2">
              <span>Galería de Activos Visuales</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                {images.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fotografías oficiales de catálogo e imágenes fotorrealistas de Google Imagen 3
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {images.length > 0 && (
              <>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 cursor-pointer select-none bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900 cursor-pointer"
                  />
                  <span>Todas</span>
                </label>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-900/50 bg-rose-950/40 hover:bg-rose-900/50 text-[11px] font-semibold text-rose-300 transition"
                    title="Eliminar todas las imágenes del historial (Solo Administradores)"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Borrar todas</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onRefreshDatabase}
              disabled={loadingDatabaseAssets}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition"
              title="Recargar activos desde Firestore"
            >
              <RefreshCw className={`w-3 h-3 ${loadingDatabaseAssets ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
              <span>{loadingDatabaseAssets ? "Cargando..." : "Recargar BBDD"}</span>
            </button>
          </div>
        </div>

        {assetsSyncError && (
          <div className="mb-3 flex items-start gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 mr-2 text-rose-400" />
            <div>
              <p className="font-semibold">Error al sincronizar con Firestore</p>
              <p className="text-rose-400/80 break-all">{assetsSyncError}</p>
              <p className="text-rose-400/60 mt-0.5">Pulsa Recargar BBDD para reintentar la carga.</p>
            </div>
          </div>
        )}
        {images.filter((i) => !i.url).length > 0 && (
          <div className="mb-3 flex items-start gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 mr-2 text-amber-400" />
            <div>
              <p className="font-semibold">{images.filter((i) => !i.url).length} activo(s) sin imagen servible</p>
              <p className="text-amber-400/70">Existen en Firestore pero su binario no está verificado en GCS. Se muestran con placeholder hasta la migración.</p>
            </div>
          </div>
        )}

        {/* CONTENIDO DEL PANEL DERECHO: GRID O ESTADO VACÍO */}
        {images.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <ImageIcon className="w-7 h-7 text-indigo-400/60" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No hay imágenes generadas en esta sesión.</p>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              Escribe un prompt en el panel izquierdo y pulsa <strong>Generar con Google Imagen 3</strong>, o cambia a la pestaña <strong>Foto oficial</strong> para importar equipamiento de catálogo sin coste.
            </p>
          </div>
        ) : (
          <ImageGalleryGrid
            images={images}
            selectedImageIds={selectedImageIds}
            onSelectImage={onSelectImage}
            onOpenLightbox={onOpenLightbox}
            onDeleteImage={onDeleteImage}
            onApplyToCampaignBlog={onApplyToCampaignBlog}
            onDownloadImage={downloadImage}
            downloadingId={downloadingId}
          />
        )}

        {/* MODAL DE CONFIRMACIÓN DE BORRADO TOTAL (SOLO ADMIN) */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">¿Confirmar vaciado de galería?</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Esta acción eliminará {images.length} activos del historial local y Firestore.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300">
                Esta acción es irreversible y requiere privilegios de Administrador.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition"
                >
                  Sí, vaciar galería
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
