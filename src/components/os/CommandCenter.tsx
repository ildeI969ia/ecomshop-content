"use client";

import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Cpu, 
  Database, 
  Wifi, 
  HardDrive,
  RefreshCw
} from "lucide-react";

interface CommandCenterProps {
  user: { email: string; role: string; workspaceId: string };
  onNavigateToContent: () => void;
  onNavigateToCampaign: () => void;
  onNavigateToDiagnostic: () => void;
  onSyncFirestore: () => void;
  syncing: boolean;
}

export function CommandCenter({
  user,
  onNavigateToContent,
  onNavigateToCampaign,
  onNavigateToDiagnostic,
  onSyncFirestore,
  syncing
}: CommandCenterProps) {
  return (
    <div className="space-y-6">
      {/* Top Telemetry Ribbon */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">SYSTEM STATUS</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-900">OPERATIONAL // NOC NORMAL</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">WORKSPACE</span>
            <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">{user.workspaceId}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">SESSION ROLE</span>
            <span className="text-xs font-mono font-bold text-sky-700 mt-0.5 block">{user.role}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSyncFirestore}
            disabled={syncing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-sm text-xs font-mono font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-sky-600" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Sincronizar a Firestore"}</span>
          </button>
        </div>
      </div>

      {/* KPI Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">GASTO IA MTD</span>
            <Cpu className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">€14.82</div>
          <div className="text-[11px] font-mono text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>29.6% del cupo mensual (€50.00)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">CAMPAÑAS ACTIVAS</span>
            <Layers className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">3</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Q3 Wi-Fi 7, PoE CCTV, EnGenius Cloud
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">CONTENIDOS GENERADOS</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">84</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Coste medio: €0.176 / entregable
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">STOCK ESPAÑA (24H)</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">140 APs</div>
          <div className="text-[11px] font-mono text-emerald-600 mt-1">
            ECW536 Wi-Fi 7 disponible en almacén
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center (8 cols): Campañas Activas & Quick Actions */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900">Campañas Estratégicas B2B</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control de ejecución, pipeline objetivo y entregables</p>
              </div>
              <button 
                onClick={onNavigateToCampaign}
                className="text-xs font-mono font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1"
              >
                <span>VER WORKSPACE</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-mono font-bold rounded-xs">
                      CAMP-2026-W7
                    </span>
                    <span className="text-xs font-bold text-slate-900">Despliegue Enterprise Wi-Fi 7 & Switches 10G PoE</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Target: Integradores IT, Directores Hoteleros | Objetivo: €180.000 Pipeline
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-700 font-bold block">€1.850 / €4.200</span>
                  <span className="text-[10px] text-slate-500">4 de 6 contenidos listos</span>
                </div>
              </div>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-xs">
                      CAMP-2026-POE
                    </span>
                    <span className="text-xs font-bold text-slate-900">Dimensionamiento PoE++ para Videovigilancia y CCTV</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Target: Empresas de Seguridad Electrónica | Objetivo: €95.000 Pipeline
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-700 font-bold block">€840 / €2.000</span>
                  <span className="text-[10px] text-slate-500">Completada (100%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Generation Trigger Banner */}
          <div className="bg-slate-900 text-white rounded-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase block">CANONICAL ENGINE</span>
              <h4 className="font-serif text-lg font-bold mt-1">Generar Nuevo Paquete Multicanal B2B</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Redacta un artículo de blog técnico para Durable, campaña Mailchimp, broadcast WhatsApp y publicación LinkedIn con rigor de ingeniería y cálculo de presupuesto PoE.
              </p>
            </div>
            <button
              onClick={onNavigateToContent}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm shrink-0 flex items-center gap-2 transition-colors"
            >
              <span>Abrir Content Studio</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right (4 cols): Attention Inbox & Multimodal Diagnostic Shortcut */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-sm text-slate-900">Attention Inbox (Cola de Acción)</h3>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-mono font-bold rounded-xs">
                2 PENDIENTES
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Aprobación Técnica Pendiente</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Artículo "Guía PoE++ 802.3bt" requiere validación de consumos por Ingeniero Preventa.
                </p>
              </div>

              <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Programación Mailchimp</span>
                </div>
                <p className="text-[11px] text-sky-800 mt-1 leading-relaxed">
                  Campaña para instaladores IT lista para enviar el Jueves a las 09:30 CET.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <h3 className="font-serif font-bold text-sm text-slate-900 mb-1">Multimodal Diagnostic Lab</h3>
            <p className="text-xs text-slate-600 mb-4">
              Sube fotos de armarios rack o notas de voz para diagnóstico automático de cuellos de botella PoE y propuesta EnGenius con 1 clic.
            </p>
            <button
              onClick={onNavigateToDiagnostic}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold uppercase rounded-sm flex items-center justify-center gap-2 transition-colors border border-slate-300"
            >
              <span>Abrir Laboratorio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
