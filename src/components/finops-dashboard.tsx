"use client";

import React, { useState, useEffect } from "react";
import { GlobalFinOpsSummary } from "@/types/finops";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FinOpsDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const [summary, setSummary] = useState<GlobalFinOpsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/finops/global-summary?month=${selectedMonth}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Acceso denegado. Se requiere rol de Administrador para visualizar este cuadro de mando.");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status}: No se pudo cargar el resumen FinOps.`);
        }
        const data: GlobalFinOpsSummary = await res.json();
        setSummary(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con la API de FinOps.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [selectedMonth]);

  const budgetLimit = summary?.budgetLimitEur ?? 100.0;
  const currentSpent = summary?.totalCostEur ?? 0;
  const pctUsed = Math.min(100, Math.round((currentSpent / (budgetLimit || 1)) * 100));

  let progressColor = "bg-emerald-500";
  let badgeVariant: "success" | "warning" | "danger" = "success";

  if (pctUsed >= 90) {
    progressColor = "bg-rose-500";
    badgeVariant = "danger";
  } else if (pctUsed >= 75) {
    progressColor = "bg-amber-500";
    badgeVariant = "warning";
  }

  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const userEntries = summary?.byUser ? Object.entries(summary.byUser) : [];
  const modelEntries = summary?.byModel ? Object.entries(summary.byModel) : [];

  return (
    <div className="space-y-6">
      {/* Cabecera & Selector de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">FinOps & Control de Costes B2B</h2>
          <p className="text-xs text-slate-400 mt-1">
            Auditoría global de consumo de modelos de Inteligencia Artificial y proyección presupuestaria corporativa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="month-select" className="text-xs font-medium text-slate-300">
            Periodo fiscal:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-xs">
          <strong>Error de Autenticación/Permisos:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
          Cargando métricas del resumen FinOps global...
        </div>
      ) : summary ? (
        <>
          {/* Tarjetas Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Gasto Total vs Presupuesto */}
            <Card variant="highlight" className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Gasto Mensual Acumulado</CardTitle>
                  <Badge variant={badgeVariant}>{pctUsed}% Consumido</Badge>
                </CardHeader>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-white">
                    {currentSpent.toFixed(2)} €
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Límite mensual asignado: <span className="text-slate-200 font-semibold">{budgetLimit.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${pctUsed}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0.00 €</span>
                  <span>{budgetLimit.toFixed(2)} €</span>
                </div>
              </div>
            </Card>

            {/* Bento Card 2: Proyección Fin de Mes */}
            <Card variant="subtle" className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Proyección Fin de Mes</CardTitle>
                  <Badge variant="indigo">Estimación Run-rate</Badge>
                </CardHeader>
                <CardDescription>
                  Estimación de gasto al cierre de mes según el ritmo actual de ejecución de operaciones.
                </CardDescription>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold font-mono text-indigo-400">
                    {(summary.monthEndProjectionEur ?? currentSpent).toFixed(2)} €
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {summary.monthEndProjectionEur && summary.monthEndProjectionEur > budgetLimit ? (
                      <span className="text-rose-400 font-medium">⚠️ Riesgo de sobrecoste presupuestario</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">✓ Ritmo dentro de límites seguros</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
                <span>Tokens In/Out:</span>
                <span className="font-mono text-slate-300">
                  {(summary.totalInputTokens / 1000).toFixed(1)}k / {(summary.totalOutputTokens / 1000).toFixed(1)}k
                </span>
              </div>
            </Card>

            {/* Bento Card 3: Coste Medio por Campaña */}
            <Card variant="subtle" className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Coste Medio por Campaña</CardTitle>
                  <Badge variant="success">Eficiencia Operativa</Badge>
                </CardHeader>
                <CardDescription>
                  Coste medio unitario de generación de contenidos e inteligencia por campaña B2B.
                </CardDescription>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold font-mono text-emerald-400">
                    {(summary.avgCostPerCampaignEur ?? 0.045).toFixed(3)} €
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Generaciones de Imagen: <span className="text-slate-200 font-semibold">{summary.totalImageGenerations}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
                <span>Última actualización:</span>
                <span className="text-slate-300">
                  {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Ahora"}
                </span>
              </div>
            </Card>
          </div>

          {/* Desglose por Modelo & Tabla por Usuario */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Tabla Detallada por Usuario */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Consumo por Usuario del Equipo</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detalle de operaciones ejecutadas y gasto acumulado por cuenta corporativa.
                  </p>
                </div>
                <Badge variant="neutral">{userEntries.length} Usuarios</Badge>
              </div>

              {userEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay registros de uso de IA de usuarios para este periodo.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 tracking-wider">
                      <tr>
                        <th className="p-2.5 rounded-l-lg">Usuario / Email</th>
                        <th className="p-2.5 text-center">Operaciones</th>
                        <th className="p-2.5 text-right font-mono">Gasto (€)</th>
                        <th className="p-2.5 text-right rounded-r-lg">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {userEntries.map(([uid, uData]) => {
                        const userPct = currentSpent > 0 ? Math.round((uData.costEur / currentSpent) * 100) : 0;
                        return (
                          <tr key={uid} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-medium text-slate-200">
                              <div>{uData.displayName || uData.email}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{uData.email}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono">{uData.operationsCount}</td>
                            <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                              {uData.costEur.toFixed(4)} €
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-400">{userPct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Desglose por Modelo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Desglose por Modelo AI</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Distribución de costes por API / Modelo.
                  </p>
                </div>
              </div>

              {modelEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Sin datos registrados por modelo.
                </div>
              ) : (
                <div className="space-y-3">
                  {modelEntries.map(([modelKey, mData]) => {
                    const modelPct = currentSpent > 0 ? Math.round((mData.costEur / currentSpent) * 100) : 0;
                    return (
                      <div key={modelKey} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-indigo-300 font-mono">{modelKey}</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{mData.costEur.toFixed(4)} €</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-2">
                          <span>{mData.calls} llamadas</span>
                          <span>{modelPct}% del total</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${modelPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
