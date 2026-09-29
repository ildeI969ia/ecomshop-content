"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Package,
  ArrowRight,
  Zap,
  ClipboardList,
  BookOpen,
} from "lucide-react";

interface SimplifiedDashboardProps {
  onGenerateCampaign: () => void;
  onViewHistory: () => void;
  onViewRadar: () => void;
  recentCampaigns?: Array<{ id: string; title: string; date: string }>;
}

export function SimplifiedDashboard({
  onGenerateCampaign,
  onViewHistory,
  onViewRadar,
  recentCampaigns = [],
}: SimplifiedDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-800/40 rounded-2xl p-8 text-white">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold">Marketing OS EcomSpain</h1>
          </div>
          <p className="text-lg text-slate-300 max-w-2xl">
            Genera campañas profesionales en 3 pasos: <strong>selecciona producto → genera contenido → copia y publica</strong>.
          </p>
        </div>
      </div>

      {/* 3-Step Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-slate-700 transition">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold text-indigo-400">1</div>
              <h3 className="font-bold text-white mt-2">Selecciona Producto</h3>
            </div>
            <Package className="w-5 h-5 text-indigo-400 mt-1" />
          </div>
          <p className="text-sm text-slate-400">
            Elige de nuestro catálogo de 40+ productos de networking. Todos documentados automáticamente.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-slate-700 transition">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold text-indigo-400">2</div>
              <h3 className="font-bold text-white mt-2">Genera Campaña</h3>
            </div>
            <Zap className="w-5 h-5 text-amber-400 mt-1" />
          </div>
          <p className="text-sm text-slate-400">
            Obtén contenido para Blog, LinkedIn, WhatsApp, Email y Ficha de Producto con un clic.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 hover:border-slate-700 transition">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold text-indigo-400">3</div>
              <h3 className="font-bold text-white mt-2">Copia y Publica</h3>
            </div>
            <ClipboardList className="w-5 h-5 text-emerald-400 mt-1" />
          </div>
          <p className="text-sm text-slate-400">
            Copia en Markdown o HTML. Todo listo para publicar sin reformatear.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onGenerateCampaign}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-lg hover:shadow-xl"
        >
          <Sparkles className="w-5 h-5" />
          <span>Generar Nueva Campaña</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={onViewRadar}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition border border-slate-700"
        >
          <Zap className="w-5 h-5 text-amber-400" />
          <span>Ver Oportunidades B2B</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Recent Campaigns */}
      {recentCampaigns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Campañas Recientes
            </h3>
            <button
              onClick={onViewHistory}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Ver todas →
            </button>
          </div>
          <div className="space-y-2">
            {recentCampaigns.slice(0, 3).map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{campaign.title}</p>
                  <p className="text-xs text-slate-500">{campaign.date}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="font-bold text-white">¿Necesitas ayuda?</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>🎯 <strong>Primer uso:</strong> Selecciona un producto del catálogo y haz clic en "Generar"</li>
          <li>📋 <strong>Exportar contenido:</strong> Cada pestaña tiene un botón "Copiar Markdown" o "Copiar HTML"</li>
          <li>🔄 <strong>Regenerar canales:</strong> Si no te gusta el resultado, puedes regenerar cada canal por separado</li>
          <li>💾 <strong>Guardar campaña:</strong> Haz clic en "Guardar" para mantener un historial</li>
        </ul>
      </div>
    </div>
  );
}
