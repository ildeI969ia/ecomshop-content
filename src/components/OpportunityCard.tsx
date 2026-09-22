"use client";

import React, { useState } from "react";
import {
  Flame,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  RefreshCw,
  Package,
  UserCheck,
  AlertTriangle,
  Shuffle,
  X,
  Send,
  Sparkles,
  BookOpen
} from "lucide-react";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";

interface OpportunityCardProps {
  opp: ProductOpportunityRecord;
  index: number;
  compact?: boolean;
  onSelectOpportunity?: (opp: ProductOpportunityRecord) => void;
  onLaunchCampaign?: (opp: ProductOpportunityRecord) => void;
  launchingSku?: string | null;
  onReplaceOpportunity?: (
    opp: ProductOpportunityRecord,
    newSku?: string,
    customDirective?: string,
    newAngle?: "ROI" | "PERFORMANCE" | "OPERATIONS"
  ) => void;
  isReplacingSku?: string | null;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opp,
  index,
  compact = false,
  onSelectOpportunity,
  onLaunchCampaign,
  launchingSku,
  onReplaceOpportunity,
  isReplacingSku
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [customDirective, setCustomDirective] = useState("");
  const [changingAngle, setChangingAngle] = useState<"ROI" | "PERFORMANCE" | "OPERATIONS" | null>(null);

  const score = opp.scores.totalScore;
  const isThisSkuLaunching = launchingSku === opp.sku;
  const isThisSkuReplacing = isReplacingSku === opp.sku;
  const isBusy = Boolean(launchingSku) || Boolean(isReplacingSku);

  const handleAngleChange = async (angle: "ROI" | "PERFORMANCE" | "OPERATIONS") => {
    if (!onReplaceOpportunity || isThisSkuReplacing || opp.recommendedAngle === angle) return;
    setChangingAngle(angle);
    try {
      await onReplaceOpportunity(opp, undefined, undefined, angle);
      setIsReplacing(false);
    } finally {
      setChangingAngle(null);
    }
  };

  const handleDirectiveSubmit = () => {
    if (!onReplaceOpportunity || !customDirective.trim() || isThisSkuReplacing) return;
    onReplaceOpportunity(opp, undefined, customDirective.trim());
    setIsReplacing(false);
  };

  const handleCardClick = () => {
    if (onSelectOpportunity) onSelectOpportunity(opp);
    if (onLaunchCampaign) onLaunchCampaign(opp);
  };

  // VISTA COMPACTA
  if (compact) {
    return (
      <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 transition-all flex flex-col justify-between gap-2.5 shadow-sm">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="bg-indigo-950 text-indigo-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-800/80 shrink-0">
                EnGenius {opp.sku}
              </span>
              <span className="text-[10px] font-semibold uppercase text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 truncate">
                {opp.category || opp.recommendedAngle}
              </span>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold shrink-0">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{score}/100</span>
            </div>
          </div>

          {/* Título */}
          <h4 className="text-xs font-bold text-slate-100 line-clamp-1 leading-snug mb-1">
            {opp.actionTitle}
          </h4>

          {/* Bundle */}
          {opp.suggestedBundle && (
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 text-[11px] text-slate-300 mb-2">
              <span className="text-indigo-300 font-semibold">Bundle:</span> + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
            </div>
          )}

          {/* Botón de acción con diferenciación clara de loading */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleCardClick}
              className="flex-1 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white disabled:opacity-50 cursor-pointer"
            >
              {isThisSkuLaunching ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Lanzando {opp.sku}...</span>
                </>
              ) : isThisSkuReplacing ? (
                <>
                  <div className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                  <span>Sustituyendo {opp.sku}...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-200" />
                  <span>Seleccionar {opp.sku}</span>
                </>
              )}
            </button>
          </div>

          {/* Desplegable comercial */}
          <details className="group mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
            <summary className="text-[11px] text-indigo-300 hover:text-indigo-200 font-medium flex items-center justify-between cursor-pointer list-none select-none">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-400" />
                ℹ️ Ver análisis comercial
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 space-y-2 pt-1 text-slate-300 animate-fadeIn">
              {opp.narrativeAnchor && (
                <div className="bg-indigo-950/40 border border-indigo-800/40 p-2 rounded text-[10px] text-indigo-200">
                  <strong className="text-indigo-300">Pitch 30s:</strong> {opp.narrativeAnchor.pitch30s}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Segmento: <strong className="text-slate-200">{opp.targetSegment}</strong></span>
                <span className="font-mono text-emerald-300">{opp.pricingCondition || "Tarifa B2B"}</span>
              </div>
              {opp.alternativeOptions && opp.alternativeOptions.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">Sustituir por:</span>
                  <div className="flex flex-col gap-1">
                    {opp.alternativeOptions.map((alt) => (
                      <button
                        key={alt.sku}
                        type="button"
                        disabled={isBusy}
                        onClick={() => onReplaceOpportunity?.(opp, alt.sku)}
                        className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 p-1.5 rounded text-[10px] text-slate-200 flex items-center justify-between group cursor-pointer disabled:opacity-40"
                      >
                        <span className="font-semibold text-amber-300">{alt.sku} - {alt.model}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-500 group-hover:text-amber-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // VISTA ESTÁNDAR COMPLETA (3 Columnas)
  return (
    <div
      className={`bg-slate-950/90 hover:bg-slate-900/95 border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
        isReplacing ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-slate-800 hover:border-indigo-500/50"
      }`}
    >
      <div>
        {/* Cabecera Tarjeta: Posición, SKU, Ángulo y Score */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-950 text-indigo-200 text-xs font-mono font-bold px-2.5 py-1 rounded border border-indigo-800/80">
              #{index + 1} {opp.sku}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
              {opp.recommendedAngle}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-base font-bold text-white font-mono">{score}/100</span>
          </div>
        </div>

        {/* NotebookLM Citations Pill */}
        {opp.notebookCitations && opp.notebookCitations.length > 0 && (
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-950/70 border border-indigo-700/50 text-indigo-200 px-2.5 py-1 rounded font-mono">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[320px]">
                {opp.notebookCitations[0].id}: {opp.notebookCitations[0].title}
              </span>
            </span>
          </div>
        )}

        {/* Título de Campaña y Target */}
        <h4 className="text-base font-bold text-slate-100 line-clamp-1 mb-1.5">
          {opp.actionTitle}
        </h4>
        <div className="flex items-center justify-between text-sm text-slate-300 mb-2.5">
          <span>Target: <strong className="text-white font-semibold">{opp.targetSegment}</strong></span>
          <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded shrink-0">
            {opp.pricingCondition || "Tarifa B2B (Consultar)"}
          </span>
        </div>

        {/* Bundle Cross-sell */}
        <div className="bg-slate-900/90 rounded-lg border border-slate-800/80 p-3 mb-3 text-sm">
          <div className="flex items-center text-xs font-semibold text-indigo-300 mb-1">
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Bundle Sugerido:
          </div>
          <div className="text-slate-100 font-semibold text-sm">
            + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
          </div>
          <div className="text-xs text-slate-400 mt-1 leading-normal">
            {opp.suggestedBundle.rationale}
          </div>
        </div>

        {/* Desplegable Secundario: Análisis Comercial */}
        {(opp.narrativeAnchor || opp.editorialFit) && (
          <details className="group mb-3 border border-slate-800/80 bg-slate-950/60 rounded-lg p-2 text-xs">
            <summary className="text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold flex items-center justify-between cursor-pointer list-none select-none">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                ℹ️ Ver análisis comercial
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 space-y-2 pt-1 border-t border-slate-800/60 text-slate-300 animate-fadeIn">
              {opp.narrativeAnchor && (
                <div className="text-xs text-indigo-100 bg-indigo-950/40 p-2 rounded leading-relaxed">
                  <strong className="text-indigo-300">⚓ Ancla:</strong> {opp.narrativeAnchor.pitch30s}
                </div>
              )}
              {opp.editorialFit && (
                <div className="text-xs text-sky-200 bg-sky-950/40 p-2 rounded leading-relaxed">
                  🎯 {opp.editorialFit}
                </div>
              )}
            </div>
          </details>
        )}

        {/* Panel Interactivo: Cambiar propuesta */}
        {isReplacing && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 mb-3 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
              <span className="flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                ¿No te convence esta propuesta?
              </span>
              <button
                type="button"
                onClick={() => setIsReplacing(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alternativas rápidas de catálogo */}
            {opp.alternativeOptions && opp.alternativeOptions.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">
                  Sustituir por otra opción del Master Notebook:
                </span>
                <div className="flex flex-col gap-1.5">
                  {opp.alternativeOptions.map((alt) => (
                    <button
                      key={alt.sku}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (onReplaceOpportunity) {
                          onReplaceOpportunity(opp, alt.sku);
                          setIsReplacing(false);
                        }
                      }}
                      className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-1.5 rounded text-[11px] transition text-slate-200 flex items-center justify-between group cursor-pointer disabled:opacity-40"
                    >
                      <div>
                        <span className="font-semibold text-amber-300">{alt.sku}</span> - {alt.model}
                        <div className="text-[10px] text-slate-400">{alt.pitchPreview}</div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-amber-300 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cambiar ángulo con loading individual y anti-doble clic */}
            <div className="pt-1.5 border-t border-amber-800/40">
              <span className="text-[10px] text-slate-400 block mb-1">
                O cambiar el ángulo de venta:
              </span>
              <div className="flex flex-wrap gap-1">
                {(["ROI", "PERFORMANCE", "OPERATIONS"] as const).map((angle) => {
                  const isAngleLoading = changingAngle === angle || (isThisSkuReplacing && opp.recommendedAngle !== angle);
                  return (
                    <button
                      key={angle}
                      type="button"
                      disabled={isBusy || opp.recommendedAngle === angle || changingAngle !== null}
                      onClick={() => handleAngleChange(angle)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                        opp.recommendedAngle === angle
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {isAngleLoading && (
                        <div className="w-2.5 h-2.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      )}
                      <span>
                        {angle === "ROI" ? "💰 ROI / TCO" : angle === "PERFORMANCE" ? "⚡ Rendimiento" : "🛠️ Operaciones"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Directiva personalizada con contador visible */}
            <div className="pt-1.5 border-t border-amber-800/40">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>¿Buscas algo específico? (Ej: "exterior", "switch 24p"):</span>
                <span className="font-mono text-[9px] text-slate-500">{customDirective.length}/100</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={100}
                  value={customDirective}
                  onChange={(e) => setCustomDirective(e.target.value)}
                  placeholder="Ej: Prefiero switch para CCTV o AP IP67..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={isBusy || !customDirective.trim()}
                  onClick={handleDirectiveSubmit}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold p-1 rounded transition cursor-pointer"
                  title="Enviar directiva"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detalle Product Brain Expandible */}
        {isExpanded && opp.productBrainProfile && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2">
            <div className="text-indigo-400 font-semibold flex items-center">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Pitch 30s ({opp.productBrainProfile.buyerPersonas[0]?.name.split(" ")[0]}):
            </div>
            <p className="text-slate-300 text-[11px] italic bg-slate-900 p-2 rounded border border-slate-800">
              "{opp.productBrainProfile.buyerPersonas[0]?.pitchIn30Seconds}"
            </p>

            <div className="text-amber-400 font-semibold flex items-center pt-1">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Objeción Comercial Frecuente:
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded">
              <span className="text-slate-300 font-medium">P:</span> {opp.productBrainProfile.objectionLedger[0]?.objection}
              <div className="mt-1 text-emerald-300">
                <span className="font-semibold">R:</span> {opp.productBrainProfile.objectionLedger[0]?.counterArgument}
              </div>
            </div>

            {opp.notebookCitations && opp.notebookCitations.length > 1 && (
              <div className="pt-1">
                <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1">
                  Fuentes Master Notebook Citadas:
                </div>
                <ul className="space-y-1 text-[10px] text-slate-400">
                  {opp.notebookCitations.map((cite) => (
                    <li key={cite.id} className="flex items-start gap-1">
                      <span className="text-indigo-400 font-mono">[{cite.id}]</span>
                      <span>{cite.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botonera de Acción Inferior */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-slate-300 hover:text-white flex items-center font-medium transition cursor-pointer"
          >
            {isExpanded ? (
              <>Menos detalles <ChevronUp className="w-4 h-4 ml-1" /></>
            ) : (
              <>Ver Product Brain <ChevronDown className="w-4 h-4 ml-1" /></>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsReplacing(!isReplacing)}
            className={`text-sm flex items-center space-x-1.5 font-medium transition cursor-pointer ${
              isReplacing ? "text-amber-300 font-bold" : "text-amber-400/90 hover:text-amber-300"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isReplacing ? "Ocultar alternativas" : "Cambiar opción"}</span>
          </button>
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={handleCardClick}
          className={`font-semibold text-sm px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer ${
            isThisSkuLaunching
              ? "bg-indigo-700 text-indigo-100 cursor-wait"
              : isThisSkuReplacing
              ? "bg-amber-700 text-amber-100 cursor-wait"
              : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-indigo-900/30"
          }`}
        >
          {isThisSkuLaunching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Lanzando Campaña...</span>
            </>
          ) : isThisSkuReplacing ? (
            <>
              <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
              <span>Sustituyendo SKU...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>🚀 Lanzar Campaña</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
