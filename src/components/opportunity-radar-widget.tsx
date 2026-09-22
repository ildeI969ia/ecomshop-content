"use client";

import React from "react";
import { Radar, RefreshCw } from "lucide-react";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { BusinessGoal } from "@/lib/types/editorial-controls";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  if (isLoading) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-xl animate-pulse ${compact ? "p-4 space-y-3" : "p-5 mb-6"}`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-5 h-5 bg-slate-800 rounded-full" />
          <div className="h-4 bg-slate-800 rounded w-40" />
        </div>
        <div className={compact ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
          {[1, 2, 3].map((i) => (
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
                <Badge variant="indigo" size="xs">
                  Autopilot
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400">Master Notebook + Stock</p>
            </div>
          </div>

          {onRegenerateRadar && (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={onRegenerateRadar}
              disabled={isRegeneratingRadar || isLoading}
              title="Regenerar Radar con IA y NotebookLM"
              className="border-indigo-500/40 text-indigo-200 hover:text-white"
            >
              <RefreshCw className={`w-3 h-3 text-indigo-300 mr-1 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
              <span>{isRegeneratingRadar ? "..." : "Refrescar"}</span>
            </Button>
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

        {/* Lista Vertical de Oportunidades mediante OpportunityCard reutilizable */}
        <div className="flex flex-col gap-2.5">
          {opportunities.map((opp, idx) => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              index={idx}
              compact={true}
              onSelectOpportunity={onSelectOpportunity}
              onLaunchCampaign={onLaunchCampaign}
              launchingSku={launchingSku}
              onReplaceOpportunity={onReplaceOpportunity}
              isReplacingSku={isReplacingSku}
            />
          ))}
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
              <Badge variant="indigo" size="xs">
                Autopilot
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Clasificación algorítmica por Stock, Gap de Contenido, Tendencia B2B y NotebookLM Grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onRegenerateRadar && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRegenerateRadar}
              disabled={isRegeneratingRadar || isLoading}
              className="border-indigo-500/40 text-indigo-200 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-300 mr-1.5 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
              <span>{isRegeneratingRadar ? "Regenerando..." : "Regenerar Radar (IA + NotebookLM)"}</span>
            </Button>
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
            className={`text-xs px-3 py-1 rounded-full font-medium transition cursor-pointer ${
              selectedBusinessGoal === pill.id
                ? "bg-indigo-600 text-white shadow-md border border-indigo-400/50"
                : "bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Grid de Oportunidades mediante OpportunityCard reutilizable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, idx) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            index={idx}
            compact={false}
            onSelectOpportunity={onSelectOpportunity}
            onLaunchCampaign={onLaunchCampaign}
            launchingSku={launchingSku}
            onReplaceOpportunity={onReplaceOpportunity}
            isReplacingSku={isReplacingSku}
          />
        ))}
      </div>
    </div>
  );
};
