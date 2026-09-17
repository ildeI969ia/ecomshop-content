"use client";

import React, { useState } from "react";
import { 
  Layers, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  HardDrive, 
  FileText, 
  Send, 
  Download, 
  ArrowLeft,
  DollarSign,
  Cpu
} from "lucide-react";

interface CampaignWorkspaceProps {
  onBack: () => void;
  onOpenContentStudio: () => void;
}

export function CampaignWorkspace({ onBack, onOpenContentStudio }: CampaignWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"briefing" | "content" | "finops">("content");

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-mono font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>VOLVER AL COMMAND CENTER</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-xs">
            ESTADO: EN EJECUCIÓN (ACTIVE)
          </span>
        </div>
      </div>

      {/* Header Band */}
      <div className="bg-white border border-slate-200 rounded-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">CAMP-2026-WIFI7</span>
            <h1 className="text-2xl font-serif font-bold text-slate-900 mt-1">
              Q3 Enterprise Wi-Fi 7 & 10G PoE Switch Rollout
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Target: Integradores de Telecomunicaciones y Directores TIC de Cadenas Hoteleras en España
            </p>
          </div>

          <div className="flex items-center gap-4 text-right font-mono shrink-0">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm">
              <span className="text-[10px] text-slate-500 block">PIPELINE OBJETIVO</span>
              <span className="text-sm font-bold text-slate-900">€180.000</span>
            </div>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm">
              <span className="text-[10px] text-slate-500 block">GASTO TOTAL / IA</span>
              <span className="text-sm font-bold text-emerald-700">€1.850 / €14.82</span>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs font-mono">
          <button
            onClick={() => setActiveTab("content")}
            className={`pb-2 font-bold uppercase transition-colors relative ${
              activeTab === "content" ? "text-sky-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Matriz de Entregables (4)
            {activeTab === "content" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-700" />}
          </button>
          <button
            onClick={() => setActiveTab("briefing")}
            className={`pb-2 font-bold uppercase transition-colors relative ${
              activeTab === "briefing" ? "text-sky-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Briefing & Hardware Vinculado
            {activeTab === "briefing" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-700" />}
          </button>
          <button
            onClick={() => setActiveTab("finops")}
            className={`pb-2 font-bold uppercase transition-colors relative ${
              activeTab === "finops" ? "text-sky-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            FinOps & Atribución
            {activeTab === "finops" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-700" />}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-slate-900">Entregables de la Campaña</h3>
              <button
                onClick={onOpenContentStudio}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase rounded-sm"
              >
                + Generar Nuevo Contenido
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Canal / Formato</th>
                    <th className="px-4 py-3">Título del Contenido</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 font-mono text-right">Coste IA</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-sky-700">BLOG (DURABLE)</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      Guía Definitiva Wi-Fi 7 en Hoteles de Alta Densidad: Dimensionamiento PoE++
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold rounded-xs">
                        APROBADO
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-slate-600">€0.0032</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <button onClick={onOpenContentStudio} className="text-sky-700 hover:underline">Ver</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">MAILCHIMP</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      Boletín Técnico: 3 razones por las que tu switch actual saturará tus APs Wi-Fi 7
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-mono text-[10px] font-bold rounded-xs">
                        LISTO PARA ENVÍO
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-slate-600">€0.0028</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <button onClick={onOpenContentStudio} className="text-sky-700 hover:underline">Ver</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-800">LINKEDIN B2B</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      Post de Opinión Técnica: ¿Por qué 1G de uplink es el mayor error en 2026?
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono text-[10px] font-bold rounded-xs">
                        EN REVISIÓN
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-slate-600">€0.0018</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <button onClick={onOpenContentStudio} className="text-sky-700 hover:underline">Ver</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "briefing" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
            <h3 className="font-serif font-bold text-sm text-slate-900">Dolores del Cliente Técnico (ICP)</h3>
            <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside leading-relaxed">
              <li>Cuellos de botella de ancho de banda al mezclar clientes Wi-Fi 7 con switches 1G antiguos.</li>
              <li>Falta de presupuesto de potencia PoE (se requieren 60W 802.3bt por punto de acceso).</li>
              <li>Sobrecostes masivos de licencias recurrentes anuales en soluciones como Cisco Meraki.</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
            <h3 className="font-serif font-bold text-sm text-slate-900">Hardware Vinculado & Stock en España</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">EnGenius ECW536 (Wi-Fi 7 AP)</span>
                  <span className="text-[11px] text-slate-500 block">Tri-Band 4x4, puerto 10GbE PoE++</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">140 uds (Entrega 24h)</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">Switch ECS2512FP (Multi-Gigabit)</span>
                  <span className="text-[11px] text-slate-500 block">8x 2.5G PoE++ (740W) + 4x 10G SFP+</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">42 uds (Entrega 24h)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "finops" && (
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="font-serif font-bold text-sm text-slate-900 mb-2">Desglose de Costes de la Campaña</h3>
          <p className="text-xs text-slate-600 mb-4">
            Telemetría de tokens procesados con Gemini 2.5 Flash y prompts cacheados para esta campaña.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Tokens de Entrada:</span>
              <span className="font-bold text-slate-900">42.800 tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tokens de Salida:</span>
              <span className="font-bold text-slate-900">18.400 tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Caché Hit Rate:</span>
              <span className="font-bold text-emerald-700">76.4%</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-900">Coste Total de IA:</span>
              <span className="font-bold text-emerald-700">€0.0142</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
