"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Wrench, Coins, Building2, Edit3, RefreshCw, CheckCircle2 } from "lucide-react";
import { EditorialAngle } from "@/app/api/editorial/suggest-angles/route";

interface EditorialAnglesSelectorProps {
  sku: string;
  selectedAngle: EditorialAngle | null;
  onSelectAngle: (angle: EditorialAngle | null, isFreeTopic?: boolean) => void;
  freeTopicTitle?: string;
  onFreeTopicChange?: (title: string) => void;
  brand?: string;
  model?: string;
  category?: string;
  specs?: string[];
}

export const EditorialAnglesSelector: React.FC<EditorialAnglesSelectorProps> = ({
  sku,
  selectedAngle,
  onSelectAngle,
  freeTopicTitle = "",
  onFreeTopicChange,
  brand,
  model,
  category,
  specs
}) => {
  const [angles, setAngles] = useState<EditorialAngle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreeTopic, setIsFreeTopic] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!sku) return;

    async function fetchAngles() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/editorial/suggest-angles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, brand, model, category, specs })
        });
        const data = await res.json();
        if (isMounted) {
          if (data.angles && Array.isArray(data.angles)) {
            setAngles(data.angles);
            // Seleccionar por defecto el primer ángulo si ninguno está seleccionado
            if (!selectedAngle && !isFreeTopic) {
              onSelectAngle(data.angles[0], false);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError("No se pudieron cargar los ángulos sugeridos.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAngles();
    return () => {
      isMounted = false;
    };
  }, [sku]);

  const handleAngleClick = (angle: EditorialAngle) => {
    setIsFreeTopic(false);
    onSelectAngle(angle, false);
  };

  const handleFreeTopicClick = () => {
    setIsFreeTopic(true);
    onSelectAngle(null, true);
  };

  const getAngleIcon = (intent: string) => {
    if (intent.includes("PROBLEMAS") || intent.includes("INGENIERIA")) {
      return <Wrench className="w-4 h-4 text-amber-400" />;
    }
    if (intent.includes("ROI") || intent.includes("TCO")) {
      return <Coins className="w-4 h-4 text-emerald-400" />;
    }
    return <Building2 className="w-4 h-4 text-sky-400" />;
  };

  const getAngleBadge = (intent: string) => {
    if (intent.includes("PROBLEMAS") || intent.includes("INGENIERIA")) {
      return "Resolución de Problemas / Ingeniería";
    }
    if (intent.includes("ROI") || intent.includes("TCO")) {
      return "Retorno de Inversión & TCO";
    }
    return "Caso de Uso Sectorial";
  };

  return (
    <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Brain de Intención Editorial ({sku})
          </h4>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">3 Ángulos sugeridos por Gemini</span>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Investigando dolores técnicos y ángulos para {sku}...</span>
        </div>
      ) : error ? (
        <div className="text-xs text-rose-400 p-3 bg-rose-950/40 rounded-lg border border-rose-800">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {angles.map((angle) => {
            const isSelected = !isFreeTopic && selectedAngle?.id === angle.id;

            return (
              <div
                key={angle.id}
                onClick={() => handleAngleClick(angle)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                  isSelected
                    ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                      {getAngleIcon(angle.intent)}
                      <span>{getAngleBadge(angle.intent)}</span>
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>

                  <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {angle.title}
                  </h5>

                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {angle.hook}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Target: {angle.targetAudience}</span>
                </div>
              </div>
            );
          })}

          {/* Opción Tema Libre */}
          <div
            onClick={handleFreeTopicClick}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
              isFreeTopic
                ? "bg-slate-900 border-sky-500 ring-2 ring-sky-500/40 shadow-lg"
                : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-sky-300 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tema Libre</span>
                </span>
                {isFreeTopic && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </div>

              <h5 className="text-xs font-bold text-white leading-snug">
                Redacción Personalizada
              </h5>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Define manualmente el título y enfoque que desees para este producto.
              </p>

              {isFreeTopic && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={freeTopicTitle}
                    onChange={(e) => onFreeTopicChange?.(e.target.value)}
                    placeholder="Escribe el título personalizado..."
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
              <span>Personalizado por usuario</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
