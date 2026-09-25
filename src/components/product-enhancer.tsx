"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Code,
  Layers,
  HelpCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye
} from "lucide-react";
import { EnhancedProductSheet, EnhancerSection } from "@/types/catalog-enhancer";
import { exportEnhancedSheetToHtml } from "@/lib/services/product-sheet-enhancer";

interface ProductEnhancerProps {
  sheet?: EnhancedProductSheet;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const ProductEnhancer: React.FC<ProductEnhancerProps> = ({
  sheet: initialSheet,
  isLoading = false,
  onRefresh
}) => {
  const [sheet, setSheet] = useState<EnhancedProductSheet | undefined>(initialSheet);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<"comparison" | "export">("comparison");

  // Mantener sheet actualizado si el prop cambia
  React.useEffect(() => {
    if (initialSheet) {
      setSheet(initialSheet);
    }
  }, [initialSheet]);

  if (!sheet) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-white mb-2">Modo «Mejorar Ficha de Producto»</h3>
        <p className="text-sm max-w-md mx-auto mb-4 text-slate-400">
          Selecciona un SKU del catálogo para analizar y optimizar la ficha con evidencia técnica grounded, JSON-LD FAQ y vista comparativa.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analizar Ficha Actual
          </button>
        )}
      </div>
    );
  }

  // Alternar aceptación por sección individual
  const toggleSectionAcceptance = (sectionKey: keyof Omit<EnhancedProductSheet, "sku" | "brand" | "claims" | "groundingValidation" | "faqJsonLd">) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const currentItem = prev[sectionKey];
      if (typeof currentItem === "object" && currentItem !== null && "accepted" in currentItem) {
        return {
          ...prev,
          [sectionKey]: {
            ...currentItem,
            accepted: !currentItem.accepted
          }
        };
      }
      return prev;
    });
  };

  const handleCopyHtml = () => {
    if (!sheet) return;
    const html = exportEnhancedSheetToHtml(sheet);
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleDownloadHtml = () => {
    if (!sheet) return;
    const html = exportEnhancedSheetToHtml(sheet);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ficha_${sheet.sku}_prestashop.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cleanHtmlExport = exportEnhancedSheetToHtml(sheet);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white space-y-6 shadow-2xl">
      {/* Header Ficha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {sheet.brand}
            </span>
            <span className="text-xs font-mono text-slate-400">SKU: {sheet.sku}</span>
            {sheet.groundingValidation?.isValid && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Claims Verificados
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Optimización de Ficha de Producto B2B
          </h2>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "comparison"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vista Comparativa
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "export"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Exportar HTML
            </button>
          </div>

          <button
            onClick={handleDownloadHtml}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
            title="Exportar HTML para Prestashop / Shopify"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar HTML para Prestashop / Shopify
          </button>
        </div>
      </div>

      {activeTab === "comparison" ? (
        <div className="space-y-6">
          {/* Leyenda de la Vista Comparativa */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center justify-between">
            <span>Compara los datos actuales del catálogo con la propuesta optimizada por IA.</span>
            <span className="text-slate-500">Haz clic en <strong>Aceptar cambio</strong> en cada sección para consolidar el bloque.</span>
          </div>

          {/* 1. Título Comercial SEO */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Título Comercial SEO (≤ 65 car.)</h3>
              </div>
              <button
                onClick={() => toggleSectionAcceptance("name")}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  sheet.name.accepted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-white"
                }`}
              >
                {sheet.name.accepted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Cambio Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Aceptar cambio
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-sm">
              <div className="p-4 bg-slate-900/40">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Actual</span>
                <p className="text-slate-300">{sheet.name.original}</p>
                <span className="text-[11px] text-slate-500 mt-2 block">Longitud: {sheet.name.original.length} caracteres</span>
              </div>
              <div className={`p-4 ${sheet.name.accepted ? "bg-emerald-950/20" : "bg-blue-950/20"}`}>
                <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Propuesta Optimizada</span>
                <p className="font-semibold text-white">{sheet.name.proposed}</p>
                <span className="text-[11px] text-blue-300/70 mt-2 block">Longitud: {sheet.name.proposed.length} caracteres (SEO ideal)</span>
              </div>
            </div>
          </div>

          {/* 2. Ventajas Clave (4-6 ventajas con claim validado) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">4-6 Ventajas Clave con Fuente/Claim Validado</h3>
              </div>
              <button
                onClick={() => toggleSectionAcceptance("advantages")}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  sheet.advantages.accepted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-white"
                }`}
              >
                {sheet.advantages.accepted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Cambio Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Aceptar cambio
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-sm">
              <div className="p-4 bg-slate-900/40">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Actual ({sheet.advantages.original.length})</span>
                <ul className="space-y-1.5 text-slate-300 text-xs list-disc pl-4">
                  {sheet.advantages.original.map((adv, idx) => (
                    <li key={idx}>{adv}</li>
                  ))}
                </ul>
              </div>
              <div className={`p-4 ${sheet.advantages.accepted ? "bg-emerald-950/20" : "bg-blue-950/20"}`}>
                <span className="text-xs font-bold text-blue-400 uppercase block mb-2">Propuesta Optimizada ({sheet.advantages.proposed.length})</span>
                <ul className="space-y-2 text-xs">
                  {sheet.advantages.proposed.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 3. Tabla de Especificaciones Pulida */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Especificaciones Técnicas Estructuradas</h3>
              </div>
              <button
                onClick={() => toggleSectionAcceptance("specs")}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  sheet.specs.accepted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-white"
                }`}
              >
                {sheet.specs.accepted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Cambio Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Aceptar cambio
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs">
              <div className="p-4 bg-slate-900/40">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Actual</span>
                <table className="w-full text-left">
                  <tbody>
                    {Object.entries(sheet.specs.original).map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-800/50">
                        <td className="py-1.5 font-medium text-slate-400">{key}</td>
                        <td className="py-1.5 text-slate-300">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`p-4 ${sheet.specs.accepted ? "bg-emerald-950/20" : "bg-purple-950/20"}`}>
                <span className="text-xs font-bold text-purple-300 uppercase block mb-2">Propuesta Optimizada</span>
                <table className="w-full text-left">
                  <tbody>
                    {Object.entries(sheet.specs.proposed).map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-800/50">
                        <td className="py-1.5 font-medium text-purple-200">{key}</td>
                        <td className="py-1.5 text-slate-100 font-semibold">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. FAQ en formato JSON-LD FAQPage */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Preguntas Frecuentes (FAQ + JSON-LD FAQPage)</h3>
              </div>
              <button
                onClick={() => toggleSectionAcceptance("faq")}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  sheet.faq.accepted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-white"
                }`}
              >
                {sheet.faq.accepted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Cambio Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Aceptar cambio
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs">
              <div className="p-4 bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase block">Actual</span>
                {sheet.faq.original.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <p className="font-semibold text-slate-300 mb-1">{item.question}</p>
                    <p className="text-slate-400">{item.answer}</p>
                  </div>
                ))}
              </div>
              <div className={`p-4 space-y-3 ${sheet.faq.accepted ? "bg-emerald-950/20" : "bg-emerald-950/10"}`}>
                <span className="text-xs font-bold text-emerald-400 uppercase block">Propuesta con Rich Snippets JSON-LD</span>
                {sheet.faq.proposed.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2.5 rounded border border-emerald-500/20">
                    <p className="font-semibold text-emerald-200 mb-1">{item.question}</p>
                    <p className="text-slate-300">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Tabla Comparativa vs. Modelo Cercano */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Comparativa vs. Modelo Cercano ({sheet.comparison.proposed.closestModel})</h3>
              </div>
              <button
                onClick={() => toggleSectionAcceptance("comparison")}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  sheet.comparison.accepted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-white"
                }`}
              >
                {sheet.comparison.accepted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Cambio Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Aceptar cambio
                  </>
                )}
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <p className="text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                {sheet.comparison.proposed.diffText}
              </p>

              {sheet.comparison.proposed.comparisonTable && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                        <th className="p-2 font-medium">Característica</th>
                        <th className="p-2 font-bold text-blue-400">{sheet.sku} (Actual)</th>
                        <th className="p-2 font-medium text-slate-300">{sheet.comparison.proposed.closestModel} (Comparado)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sheet.comparison.proposed.comparisonTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-2 font-medium text-slate-300">{row.feature}</td>
                          <td className="p-2 font-semibold text-emerald-300">{row.currentModel}</td>
                          <td className="p-2 text-slate-400">{row.closestModel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Vista de Exportación HTML Limpio (Sin Estilos Inline) */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">HTML Limpio para Prestashop / Shopify</h3>
              <p className="text-xs text-slate-400">Sin estilos inline, preparado para clases semánticas de e-commerce e incluyendo JSON-LD FAQ.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyHtml}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedHtml ? "¡Copiado!" : "Copiar HTML"}
              </button>
              <button
                onClick={handleDownloadHtml}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar .html
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto max-h-[500px]">
            <code>{cleanHtmlExport}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
