"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[EcomShop Client Error Boundary]", error);
  }, [error]);

  const handleClearCacheAndReset = () => {
    try {
      localStorage.removeItem("ecomshop_generated_images");
      localStorage.removeItem("ecomshop_article_history");
    } catch {}
    reset();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-slate-100 mb-1">
          Sesión Visual Restablecida
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Se detectó una excepción en la carga de recursos gráficos en memoria.
          Puedes reintentar inmediatamente o limpiar la caché local para restaurar la interfaz sin perder tus datos de configuración.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar Carga de Página
          </button>

          <button
            onClick={handleClearCacheAndReset}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Limpiar Caché de Imágenes y Reiniciar
          </button>

          <a
            href="/"
            className="text-[11px] text-slate-500 hover:text-slate-300 mt-2 flex items-center justify-center gap-1 transition"
          >
            <Home className="w-3 h-3" />
            Volver a la Portada
          </a>
        </div>
      </div>
    </div>
  );
}
