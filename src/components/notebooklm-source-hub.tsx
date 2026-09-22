"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Check, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Search, 
  Cpu, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Sliders,
  RefreshCw,
  Zap,
  Info
} from "lucide-react";
import { HighlightedNotebookSource } from "@/lib/services/notebook-intelligence";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { getCatalogDevice } from "@/lib/catalog";
import { HardwareIntelligenceCard } from "@/components/HardwareIntelligenceCard";

interface NotebookLMSourceHubProps {
  selectedSku: string;
  onSelectSku: (sku: string) => void;
  sources: HighlightedNotebookSource[];
  selectedSourceIds: string[];
  onToggleSourceId: (sourceId: string) => void;
  onSelectAllSources: () => void;
  onDeselectAllSources: () => void;
  editorialControls: EditorialControls;
  onChangeEditorialControls: (controls: EditorialControls) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenOutline?: () => void;
  isGeneratingOutline?: boolean;
  onPreviewSource?: (source: HighlightedNotebookSource) => void;
  onOpenRadar?: () => void;
}

const STAR_SKUS = [
  { sku: "ECW510", label: "ECW510 (Wi-Fi 7 Micro-AP)", category: "AP Wi-Fi 7" },
  { sku: "ECW536", label: "ECW536 (Wi-Fi 7 4x4 Enterprise)", category: "AP Wi-Fi 7" },
  { sku: "ECW546", label: "ECW546 (Wi-Fi 7 IP67 Outdoor)", category: "AP Wi-Fi 7" },
  { sku: "ECS1528FP", label: "ECS1528FP (Switch 24p PoE+)", category: "Switch Cloud" },
  { sku: "ECS2512FP", label: "ECS2512FP (Switch Multi-Gig 2.5G)", category: "Switch Cloud" },
  { sku: "ECS5512FP", label: "ECS5512FP (Switch 10GbE Core)", category: "Switch Cloud" }
];

export const NotebookLMSourceHub: React.FC<NotebookLMSourceHubProps> = ({
  selectedSku,
  onSelectSku,
  sources,
  selectedSourceIds,
  onToggleSourceId,
  onSelectAllSources,
  onDeselectAllSources,
  editorialControls,
  onChangeEditorialControls,
  onGenerate,
  isGenerating,
  onOpenOutline,
  isGeneratingOutline = false,
  onPreviewSource,
  onOpenRadar
}) => {
  const [customSkuInput, setCustomSkuInput] = useState("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const selectedDevice = getCatalogDevice(selectedSku);

  const handleCustomSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkuInput.trim()) {
      onSelectSku(customSkuInput.trim().toUpperCase());
      setCustomSkuInput("");
    }
  };

  const updateControls = <K extends keyof EditorialControls>(field: K, value: EditorialControls[K]) => {
    onChangeEditorialControls({
      ...editorialControls,
      [field]: value
    });
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* Cabecera del Hub: Master NotebookLM */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-4.5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>NotebookLM Source Hub</span>
              </h2>
              <p className="text-[11px] text-indigo-200/70 font-mono">
                EcomShop Master Grounding
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            59 Fuentes Sincronizadas
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Las directivas de hardware, compatibilidad de switches PoE y reglas de precios B2B se contrastan directamente contra las fichas oficiales del catálogo.
        </p>
      </div>

      {/* PASO 1: SELECTOR DE SKU / PRODUCTO PRINCIPAL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Equipo Foco de Campaña
            </h3>
          </div>

          {onOpenRadar && (
            <button
              type="button"
              onClick={onOpenRadar}
              className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Ver Radar Oportunidades</span>
            </button>
          )}
        </div>

        {/* Chips de SKUs Estrella */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STAR_SKUS.map((item) => {
            const isSelected = selectedSku.toUpperCase() === item.sku.toUpperCase();
            return (
              <button
                key={item.sku}
                type="button"
                onClick={() => onSelectSku(item.sku)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-600/30 border-indigo-400 text-white ring-2 ring-indigo-500/40 shadow-sm"
                    : "bg-slate-950/60 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-mono font-bold text-xs">{item.sku}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-1">
                  {item.label.split("(")[1]?.replace(")", "") || item.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input para SKU o Búsqueda Libre */}
        <form onSubmit={handleCustomSkuSubmit} className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customSkuInput}
              onChange={(e) => setCustomSkuInput(e.target.value)}
              placeholder={`Otro SKU o modelo (Activo: ${selectedSku})...`}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-semibold rounded-xl transition"
          >
            Fijar
          </button>
        </form>

        {selectedDevice && (
          <HardwareIntelligenceCard selectedDevice={selectedDevice} />
        )}
      </div>

      {/* PASO 2: FUENTES ACTIVAS DE NOTEBOOKLM */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span>Fuentes Técnicas Vinculadas</span>
                <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-indigo-800">
                  {selectedSourceIds.length}/{sources.length}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <button
              type="button"
              onClick={onSelectAllSources}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Todas
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={onDeselectAllSources}
              className="text-slate-400 hover:text-slate-300 underline"
            >
              Ninguna
            </button>
          </div>
        </div>

        {/* Lista de Fuentes con Checkbox */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {sources.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              Cargando fuentes del repositorio para {selectedSku}...
            </p>
          ) : (
            sources.map((source) => {
              const isChecked = selectedSourceIds.includes(source.id);
              return (
                <div
                  key={source.id}
                  className={`p-2.5 rounded-xl border transition-all text-xs flex items-start gap-2.5 cursor-pointer ${
                    isChecked
                      ? "bg-slate-950/80 border-indigo-500/50 hover:border-indigo-400"
                      : "bg-slate-950/30 border-slate-800/60 opacity-60 hover:opacity-80"
                  }`}
                  onClick={() => onToggleSourceId(source.id)}
                >
                  <button
                    type="button"
                    className="shrink-0 mt-0.5 text-indigo-400"
                    aria-label={isChecked ? "Deseleccionar" : "Seleccionar"}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-mono text-[10px] text-indigo-300 font-bold bg-indigo-950/70 px-1.5 py-0.2 rounded border border-indigo-800/60">
                        {source.id.toUpperCase()}
                      </span>
                      <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {source.type}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {source.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {source.excerpt || source.description}
                    </p>
                  </div>

                  {onPreviewSource && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewSource(source);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 shrink-0 mt-0.5"
                      title="Ver extracto de evidencia"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PASO 3: CALIBRACIÓN ASISTIDA COMPACTA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Calibración Asistida
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvancedSettings ? "Menos" : "Más Ajustes"}</span>
          </button>
        </div>

        {/* Sector Vertical Chips */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Sector Vertical Objetivo:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "ENTERPRISE_OFFICE", label: "🏢 Enterprise & Sedes" },
              { id: "HOSPITALITY", label: "🏨 Hospitality & Hoteles" },
              { id: "LOGISTICS_INDUSTRY", label: "🏭 Logística e Industria" },
              { id: "EDUCATION_CAMPUS", label: "🎓 Campus & Educación" }
            ].map((sector) => {
              const active = editorialControls.targetSector === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => updateControls("targetSector", sector.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-left text-[11px] font-medium border transition ${
                    active
                      ? "bg-indigo-600/30 border-indigo-400 text-white font-semibold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {sector.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tono Editorial Chips */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Tono & Perspectiva de Venta:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "ENGINEERING_PREVENTA", label: "🛠️ Preventa / Ingeniería" },
              { id: "C_LEVEL_TCO", label: "💼 C-Level ROI & FinOps" },
              { id: "CHANNEL_INSTALLER", label: "⚡ Instalador / Canal" },
              { id: "CASE_STUDY", label: "📖 Caso de Despliegue" }
            ].map((tone) => {
              const active = editorialControls.editorialTone === tone.id;
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => updateControls("editorialTone", tone.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-left text-[11px] font-medium border transition ${
                    active
                      ? "bg-indigo-600/30 border-indigo-400 text-white font-semibold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {tone.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ajustes Avanzados Desplegables */}
        {showAdvancedSettings && (
          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Contraste Competitivo:
              </label>
              <select
                value={editorialControls.competitorFocus}
                onChange={(e) => updateControls("competitorFocus", e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="MERAKI">Cisco Meraki (Cero Licencias Obligatorias)</option>
                <option value="UNIFI">Ubiquiti UniFi (Soporte Oficial & Robustez B2B)</option>
                <option value="LEGACY_1G">Redes 1G / Wi-Fi 5 (Migración a 10G Multi-Gig)</option>
                <option value="NONE">Sin mención de competidor</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-300">
                Prescribir Switch Uplink Recomendado
              </span>
              <input
                type="checkbox"
                checked={editorialControls.emphasizeUplinkSwitching}
                onChange={(e) => updateControls("emphasizeUplinkSwitching", e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER STICKY: CTA GENERAR Y GUION/OUTLINE */}
      <div className="sticky bottom-4 z-20 bg-slate-950/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl space-y-2 mt-auto">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || selectedSourceIds.length === 0}
          className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-98 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generando con Grounding de NotebookLM...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>🚀 Generar con Grounding de NotebookLM</span>
            </>
          )}
        </button>

        {onOpenOutline && (
          <button
            type="button"
            onClick={onOpenOutline}
            disabled={isGenerating || isGeneratingOutline}
            className="w-full bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            {isGeneratingOutline ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin" />
                <span>Creando Outline Técnico...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>📋 Personalizar Guión Técnico (Outline)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
