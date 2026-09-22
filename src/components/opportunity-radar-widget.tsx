"use client";

import React, { useState } from "react";
import { 
  Radar, 
  TrendingUp, 
  Package, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  Flame, 
  Award, 
  CheckCircle2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Shuffle,
  Target,
  Send,
  X,
  FileText,
  DollarSign,
  Zap,
  Info
} from "lucide-react";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { BusinessGoal } from "@/lib/types/editorial-controls";

export const BUSINESS_GOAL_PILLS: Array<{ id: BusinessGoal; label: string }> = [
  { id: "ALL_OPPORTUNITIES", label: "⚡ Todas" },
  { id: "WIFI7_MULTIGIG_EXPANSION", label: "🚀 Expansión Wi-Fi 7 & Multi-Gig" },
  { id: "HOSPITALITY_SOLUTIONS", label: "🏨 Soluciones Hospitality" },
  { id: "SWITCHING_POE_BACKBONE", label: "🔌 Switching PoE & Backbone" },
  { id: "STOCK_CLEARANCE_PROMO", label: "📦 Liquidación & Alta Rotación" }
];

interface OpportunityRadarWidgetProps {
  opportunities: ProductOpportunityRecord[];
  isLoading: boolean;
  onSelectOpportunity?: (opp: ProductOpportunityRecord) => void;
  onLaunchCampaign?: (opp: ProductOpportunityRecord) => void;
  launchingSku?: string | null;
  onRegenerateRadar?: () => void;
  isRegeneratingRadar?: boolean;
  onReplaceOpportunity?: (
    opp: ProductOpportunityRecord,
    newSku?: string,
    customDirective?: string,
    newAngle?: "ROI" | "PERFORMANCE" | "OPERATIONS"
  ) => void;
  isReplacingSku?: string | null;
  selectedBusinessGoal?: BusinessGoal;
  onSelectBusinessGoal?: (goal: BusinessGoal) => void;
  compact?: boolean;
}

export const OpportunityRadarWidget: React.FC<OpportunityRadarWidgetProps> = ({
  opportunities,
  isLoading,
  onSelectOpportunity,
  onLaunchCampaign,
  launchingSku,
  onRegenerateRadar,
  isRegeneratingRadar = false,
  onReplaceOpportunity,
  isReplacingSku = null,
  selectedBusinessGoal = "ALL_OPPORTUNITIES",
  onSelectBusinessGoal,
  compact = false
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);
  const [customDirectives, setCustomDirectives] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-xl animate-pulse ${compact ? "p-4 space-y-3" : "p-5 mb-6"}`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-5 h-5 bg-slate-800 rounded-full" />
          <div className="h-4 bg-slate-800 rounded w-40" />
        </div>
        <div className={compact ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${compact ? "h-24" : "h-32"} bg-slate-800/60 rounded-lg`} />
          ))}
        </div>
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) return null;

  if (compact) {
    return (
      <div className="bg-slate-950/90 border border-indigo-500/20 rounded-2xl p-4 text-white shadow-lg space-y-3.5">
        {/* Header Compacto */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Radar de Oportunidades
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-1.5 py-0.2 rounded-full border border-indigo-400/30 font-mono">
                  Autopilot
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Master Notebook + Stock</p>
            </div>
          </div>

          {onRegenerateRadar && (
            <button
              type="button"
              onClick={onRegenerateRadar}
              disabled={isRegeneratingRadar || isLoading}
              title="Regenerar Radar con IA y NotebookLM"
              className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 hover:text-white px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-indigo-300 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
              <span>{isRegeneratingRadar ? "..." : "Refrescar"}</span>
            </button>
          )}
        </div>

        {/* Selector de Objetivo B2B en Compacto */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 font-semibold shrink-0">Objetivo:</label>
          <select
            value={selectedBusinessGoal}
            onChange={(e) => onSelectBusinessGoal?.(e.target.value as BusinessGoal)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition"
          >
            {BUSINESS_GOAL_PILLS.map((pill) => (
              <option key={pill.id} value={pill.id}>
                {pill.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lista Vertical de Oportunidades - 4 Elementos Visibles + Desplegable Comercial */}
        <div className="flex flex-col gap-2.5">
          {opportunities.map((opp, idx) => {
            const score = opp.scores.totalScore;
            const isThisSkuReplacing = isReplacingSku === opp.sku;
            const isSelected = launchingSku === opp.sku;

            return (
              <div
                key={opp.id}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 transition-all flex flex-col justify-between gap-2.5 shadow-sm"
              >
                <div>
                  {/* Elemento 1 & 2: Marca, Modelo, SKU + Badge de Categoría y Score */}
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

                  {/* Elemento 3: Propuesta en 1 frase y Bundle complementario */}
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-1 leading-snug mb-1">
                    {opp.actionTitle}
                  </h4>

                  {opp.suggestedBundle && (
                    <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 text-[11px] text-slate-300 mb-2">
                      <span className="text-indigo-300 font-semibold">Bundle:</span> + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
                    </div>
                  )}

                  {/* Elemento 4: Botón Seleccionar / Lanzar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={Boolean(launchingSku) || Boolean(isThisSkuReplacing)}
                      onClick={() => {
                        if (onSelectOpportunity) {
                          onSelectOpportunity(opp);
                        }
                        if (onLaunchCampaign) {
                          onLaunchCampaign(opp);
                        }
                      }}
                      className="flex-1 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white disabled:opacity-50"
                    >
                      {isSelected ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Lanzando {opp.sku}...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-200" />
                          <span>Seleccionar {opp.sku}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Desplegable Secundario Colapsado: Análisis Comercial */}
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
                            {opp.alternativeOptions.map(alt => (
                              <button
                                key={alt.sku}
                                type="button"
                                disabled={Boolean(isThisSkuReplacing)}
                                onClick={() => onReplaceOpportunity?.(opp, alt.sku)}
                                className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 p-1.5 rounded text-[10px] text-slate-200 flex items-center justify-between group"
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
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 mb-8 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Radar de Oportunidades Diarias (Product Brain)
              </h3>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-400/30 font-mono">
                Autopilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Clasificación algorítmica por Stock, Gap de Contenido, Tendencia B2B y NotebookLM Grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onRegenerateRadar && (
            <button
              type="button"
              onClick={onRegenerateRadar}
              disabled={isRegeneratingRadar || isLoading}
              className="bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-300 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
              <span>{isRegeneratingRadar ? "Regenerando..." : "Regenerar Radar (IA + NotebookLM)"}</span>
            </button>
          )}
          <div className="hidden sm:flex items-center text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
            Actualizado con Master Notebook (20 fuentes)
          </div>
        </div>
      </div>

      {/* Selector de Objetivos de Negocio (Horizontal Pills) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-slate-800/80">
        <span className="text-xs text-slate-400 font-semibold mr-1">Objetivo B2B:</span>
        {BUSINESS_GOAL_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onSelectBusinessGoal?.(pill.id)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition ${
              selectedBusinessGoal === pill.id
                ? "bg-indigo-600 text-white shadow-md border border-indigo-400/50"
                : "bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, idx) => {
          const isExpanded = expandedId === opp.id;
          const isReplacing = replacingCardId === opp.id;
          const score = opp.scores.totalScore;
          const isThisSkuReplacing = isReplacingSku === opp.sku;

          return (
            <div
              key={opp.id}
              className={`bg-slate-950/90 hover:bg-slate-900/95 border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
                isReplacing ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-slate-800 hover:border-indigo-500/50"
              }`}
            >
              <div>
                {/* Cabecera Tarjeta: Posición, SKU, Ángulo y Score */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-950 text-indigo-200 text-xs font-mono font-bold px-2.5 py-1 rounded border border-indigo-800/80">
                      #{idx + 1} {opp.sku}
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

                {/* Desplegable Secundario Colapsado: Análisis Comercial */}
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

                {/* Panel Interactivo: "Si no te convence, cambiar propuesta" */}
                {isReplacing && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 mb-3 text-xs space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                        ¿No te convence esta propuesta?
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplacingCardId(null)}
                        className="text-slate-400 hover:text-white"
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
                          {opp.alternativeOptions.map(alt => (
                            <button
                              key={alt.sku}
                              type="button"
                              disabled={Boolean(isThisSkuReplacing)}
                              onClick={() => {
                                if (onReplaceOpportunity) {
                                  onReplaceOpportunity(opp, alt.sku);
                                  setReplacingCardId(null);
                                }
                              }}
                              className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-1.5 rounded text-[11px] transition text-slate-200 flex items-center justify-between group"
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

                    {/* Cambiar enfoque / ángulo de la misma propuesta */}
                    <div className="pt-1.5 border-t border-amber-800/40">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        O cambiar el ángulo de venta:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(["ROI", "PERFORMANCE", "OPERATIONS"] as const).map(angle => (
                          <button
                            key={angle}
                            type="button"
                            disabled={Boolean(isThisSkuReplacing) || opp.recommendedAngle === angle}
                            onClick={() => {
                              if (onReplaceOpportunity) {
                                onReplaceOpportunity(opp, undefined, undefined, angle);
                                setReplacingCardId(null);
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              opp.recommendedAngle === angle
                                ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {angle === "ROI" ? "💰 ROI / TCO" : angle === "PERFORMANCE" ? "⚡ Rendimiento" : "🛠️ Operaciones"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pedir personalización específica con directiva */}
                    <div className="pt-1.5 border-t border-amber-800/40">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        ¿Buscas algo específico? (Ej: "exterior", "switch 24p"):
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customDirectives[opp.id] || ""}
                          onChange={(e) => setCustomDirectives(prev => ({ ...prev, [opp.id]: e.target.value }))}
                          placeholder="Ej: Prefiero switch para CCTV o AP IP67..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          disabled={Boolean(isThisSkuReplacing) || !customDirectives[opp.id]}
                          onClick={() => {
                            if (onReplaceOpportunity) {
                              onReplaceOpportunity(opp, undefined, customDirectives[opp.id]);
                              setReplacingCardId(null);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold p-1 rounded transition"
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
                          {opp.notebookCitations.map(cite => (
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
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    className="text-sm text-slate-300 hover:text-white flex items-center font-medium transition"
                  >
                    {isExpanded ? (
                      <>Menos detalles <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Ver Product Brain <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReplacingCardId(isReplacing ? null : opp.id)}
                    className={`text-sm flex items-center space-x-1.5 font-medium transition ${
                      isReplacing ? "text-amber-300 font-bold" : "text-amber-400/90 hover:text-amber-300"
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isReplacing ? "Ocultar alternativas" : "Cambiar opción"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={Boolean(launchingSku) || Boolean(isThisSkuReplacing)}
                  onClick={() => {
                    if (onLaunchCampaign) {
                      onLaunchCampaign(opp);
                    } else if (onSelectOpportunity) {
                      onSelectOpportunity(opp);
                    }
                  }}
                  className={`font-semibold text-sm px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
                    launchingSku === opp.sku
                      ? "bg-indigo-700 text-indigo-100 cursor-wait"
                      : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-indigo-900/30"
                  }`}
                >
                  {launchingSku === opp.sku ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Lanzando Campaña...</span>
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
        })}
      </div>
    </div>
  );
};
