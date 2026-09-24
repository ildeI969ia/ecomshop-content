"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  FileText,
  Share2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Database,
  Sliders,
  History,
  Download,
  Zap
} from "lucide-react";
import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { MarketingPackage, MarketingRun, ProductEvidence, QualityReport, MarketingBatch } from "@/server/orchestrator/marketing-types";
import { apiFetch } from "@/lib/api-client";

interface VersionHistoryRecord {
  version: number;
  runId: string;
  createdAt: string;
  marketingPackage: MarketingPackage;
}

interface ProductMarketingWorkspaceProps {
  onCreateCampaign?: (product: CatalogProduct, pkg?: MarketingPackage | null) => void;
  initialTab?: "pipeline" | "package" | "evidence" | "quality" | "history" | "batch";
}

export function ProductMarketingWorkspace({ onCreateCampaign, initialTab }: ProductMarketingWorkspaceProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>("ECW536");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"pipeline" | "package" | "evidence" | "quality" | "history" | "batch">(initialTab || "pipeline");

  // Pipeline execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRun, setCurrentRun] = useState<MarketingRun | null>(null);
  const [activePackage, setActivePackage] = useState<MarketingPackage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockDetails, setBlockDetails] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [versions, setVersions] = useState<VersionHistoryRecord[]>([]);

  // Batch generation state
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [activeBatch, setActiveBatch] = useState<MarketingBatch | null>(null);
  const [batchSelectedSkus, setBatchSelectedSkus] = useState<string[]>(["ECW536", "ECS2512FP", "RUTX50"]);
  const [generatedPackagesMap, setGeneratedPackagesMap] = useState<Record<string, MarketingPackage>>({});

  // Cargar paquetes existentes al montar para mapa determinista de estados
  useEffect(() => {
    apiFetch<{ packages?: MarketingPackage[] }>("/api/marketing/export?format=json")
      .then((data) => {
        if (data.packages && Array.isArray(data.packages)) {
          const map: Record<string, MarketingPackage> = {};
          for (const pkg of data.packages) {
            map[pkg.product.sku] = pkg;
          }
          setGeneratedPackagesMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Deterministic status resolver
  const getProductStatus = (sku: string): { label: string; color: string } => {
    if (isGenerating && selectedSku === sku) return { label: "RUNNING", color: "bg-indigo-950 text-indigo-300 border-indigo-700" };
    if (activeBatch && activeBatch.items[sku]?.status === "PROCESSING") return { label: "RUNNING", color: "bg-indigo-950 text-indigo-300 border-indigo-700" };
    if (activeBatch && activeBatch.items[sku]?.status === "BLOCKED") return { label: "BLOCKED", color: "bg-amber-950 text-amber-300 border-amber-800" };
    if (activeBatch && activeBatch.items[sku]?.status === "FAILED") return { label: "FAILED", color: "bg-rose-950 text-rose-300 border-rose-800" };

    const pkg = generatedPackagesMap[sku] || (selectedSku === sku ? activePackage : null);
    if (pkg) {
      if (pkg.quality.overallStatus === "PASS") return { label: `GENERATED (v${pkg.contentVersion})`, color: "bg-emerald-950 text-emerald-300 border-emerald-800" };
      if (pkg.quality.overallStatus === "WARN") return { label: "READY_WITH_WARNINGS", color: "bg-amber-950 text-amber-300 border-amber-800" };
      return { label: "BLOCKED", color: "bg-rose-950 text-rose-300 border-rose-800" };
    }

    return { label: "READY", color: "bg-slate-900 text-slate-400 border-slate-800" };
  };

  // Filtrado de catálogo comercial canónico
  const filteredProducts = ECOMSHOP_FULL_CATALOG.filter((p) => {
    const matchSearch =
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "ALL" || p.deviceType === selectedCategory;
    return matchSearch && matchCat;
  });

  const selectedProduct: CatalogProduct | undefined =
    ECOMSHOP_FULL_CATALOG.find((p) => p.sku === selectedSku) || ECOMSHOP_FULL_CATALOG[0];

  // Ejecutar generación real
  const handleGenerate = async (forceRegenerate = false) => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setBlockDetails(null);

    try {
      const res = await apiFetch<{
        status: "SUCCESS" | "CACHED" | "ERROR";
        run?: MarketingRun;
        package?: MarketingPackage;
        message?: string;
      }>("/api/marketing/runs", {
        method: "POST",
        body: JSON.stringify({
          sku: selectedProduct.sku,
          provider: "antigravity",
          forceRegenerate
        })
      });

      if (res.status === "ERROR" || !res.package) {
        setErrorMessage(res.message || "Error durante la ejecución del pipeline");
        if (res.message?.includes("QUALITY_GATE_BLOCKED")) {
          setBlockDetails(res.message);
        }
        return;
      }

      setCurrentRun(res.run || null);
      setActivePackage(res.package);

      // Guardar en historial de versiones local
      setVersions((prev) => {
        const nextVer = prev.length + 1;
        const newRecord: VersionHistoryRecord = {
          version: nextVer,
          runId: res.run?.runId || `run-${Date.now()}`,
          createdAt: new Date().toLocaleTimeString("es-ES"),
          marketingPackage: res.package!
        };
        setSelectedVersion(nextVer);
        return [newRecord, ...prev];
      });

      setActiveTab("package");
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo en la llamada al servidor");
      if (err.message?.includes("QUALITY_GATE_BLOCKED") || err.message?.includes("BLOCKED")) {
        setBlockDetails(err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Ejecutar generación por lotes (Batch)
  const handleRunBatch = async () => {
    if (batchSelectedSkus.length === 0) return;
    setIsBatchRunning(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch<{
        status: "SUCCESS" | "ERROR";
        batch?: MarketingBatch;
        message?: string;
      }>("/api/marketing/batches", {
        method: "POST",
        body: JSON.stringify({
          skus: batchSelectedSkus,
          provider: "antigravity"
        })
      });

      if (res.status === "ERROR" || !res.batch) {
        setErrorMessage(res.message || "Error al procesar el lote");
        return;
      }

      setActiveBatch(res.batch);
      setActiveTab("batch");
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo en la llamada al procesar lote");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Reintentar fallidos en el lote
  const handleRetryBatch = async () => {
    if (!activeBatch) return;
    setIsBatchRunning(true);

    try {
      const res = await apiFetch<{
        status: "SUCCESS" | "ERROR";
        batch?: MarketingBatch;
        message?: string;
      }>(`/api/marketing/batches/${activeBatch.batchId}/retry`, {
        method: "POST"
      });

      if (res.batch) {
        setActiveBatch(res.batch);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al reintentar lote");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Generar los 27 SKUs Canónicos en un único lote operacional
  const handleGenerateAll27 = async () => {
    const all27Skus = ECOMSHOP_FULL_CATALOG.map((p) => p.sku);
    const confirmed = window.confirm(
      `¿Confirmar lanzamiento de GENERATE ALL 27?\n\nSe procesarán ${all27Skus.length} productos de forma independiente con aislamiento, idempotencia y tolerancia a fallos.`
    );
    if (!confirmed) return;

    setBatchSelectedSkus(all27Skus);
    setIsBatchRunning(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch<{
        status: "SUCCESS" | "ERROR";
        batch?: MarketingBatch;
        message?: string;
      }>("/api/marketing/batches", {
        method: "POST",
        body: JSON.stringify({
          skus: all27Skus,
          provider: "antigravity"
        })
      });

      if (res.status === "ERROR" || !res.batch) {
        setErrorMessage(res.message || "Error al procesar lote de 27 SKUs");
        return;
      }

      setActiveBatch(res.batch);
      setActiveTab("batch");
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo al iniciar lote de 27 SKUs");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Exportar a CSV o JSON
  const handleExport = (format: "csv" | "json") => {
    window.open(`/api/marketing/export?format=${format}`, "_blank");
  };

  const pipelineSteps = [
    { key: "PRODUCT_RESOLUTION", label: "Resolución Canónica" },
    { key: "KNOWLEDGE_RETRIEVAL", label: "Evidencias & Datasheets" },
    { key: "PRODUCT_INTELLIGENCE", label: "Inteligencia Técnica" },
    { key: "POSITIONING", label: "Posicionamiento B2B" },
    { key: "SEO", label: "Arquitectura SEO" },
    { key: "PRODUCT_COPY", label: "Redacción Comercial" },
    { key: "SOCIAL_COPY", label: "Ecosistema Social" },
    { key: "CREATIVE_BRIEF", label: "Briefing Creativo" },
    { key: "QUALITY_GATE", label: "Quality Gate (9 Checks)" },
    { key: "FINAL_PACKAGE", label: "Marketing Package" }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto w-full p-6 text-slate-100">
      {/* HEADER DE MÓDULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">EcomShop Marketing OS</h1>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700">
                Antigravity Agent Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pipeline Autónomo B2B con Grounding Documental y 9 Comprobaciones Estrictas de Ingeniería
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateAll27}
            disabled={isBatchRunning}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Layers className={`w-4 h-4 ${isBatchRunning ? "animate-spin" : ""}`} />
            <span>{isBatchRunning ? "Procesando 27 SKUs..." : "GENERATE ALL 27"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || !selectedProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Agente..." : "GENERAR SKU"}</span>
          </button>

          {onCreateCampaign && selectedProduct && (
            <button
              type="button"
              onClick={() => onCreateCampaign(selectedProduct, activePackage)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>CREAR CAMPAÑA</span>
            </button>
          )}

          {activePackage && (
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={isGenerating}
              title="Crea una nueva versión sin sobreescribir la anterior"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar (v+)</span>
            </button>
          )}

          {/* Exportar */}
          <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="px-2.5 py-2 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
              title="Descargar resumen comercial CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <span className="w-px h-4 bg-slate-700" />
            <button
              type="button"
              onClick={() => handleExport("json")}
              className="px-2.5 py-2 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              title="Descargar paquetes JSON completos"
            >
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR Y QUALITY GATE BLOCKED NOTIFICATION */}
      {errorMessage && (
        <div className="p-4 rounded-xl border bg-rose-950/50 border-rose-800 text-rose-200 flex items-start gap-3 shadow-md">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-sm text-rose-300">
              {blockDetails ? "QUALITY GATE BLOCKED — EJECUCIÓN RECHAZADA" : "ERROR DE EJECUCIÓN"}
            </span>
            <p>{errorMessage}</p>
            {blockDetails && (
              <p className="text-[11px] text-rose-400/90 font-mono mt-1 bg-rose-950 p-2 rounded-lg border border-rose-900">
                {blockDetails}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL: 2 COLUMNAS (SELECTOR DE CATÁLOGO + WORKSPACE ACTIVO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA 1: SELECTOR DE PRODUCTOS CANÓNICOS (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Catálogo Canónico ({filteredProducts.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Homologado
              </span>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por SKU o modelo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Todos</option>
                <option value="ACCESS_POINT">Wi-Fi AP</option>
                <option value="SWITCH">Switches</option>
                <option value="GATEWAY">Gateways</option>
                <option value="ROUTER_CELLULAR">Celular 5G</option>
              </select>
            </div>

            {/* Lista Scrollable de Productos */}
            <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isSelected = p.sku === selectedSku;
                const statusInfo = getProductStatus(p.sku);
                return (
                  <button
                    key={p.sku}
                    type="button"
                    onClick={() => setSelectedSku(p.sku)}
                    className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/50 scale-[1.01]"
                        : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 hover:scale-[1.005]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-300 tracking-wide">{p.sku}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300">
                          {p.deviceType}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 line-clamp-1">{p.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-800/40">
                      <span className="font-medium text-slate-300">{p.brand}</span>
                      <span className="font-mono font-bold text-emerald-400">{p.priceEur}€</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: WORKSPACE DE MARKETING (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* PRODUCT IDENTITY & EVIDENCIAS HERO */}
          {selectedProduct && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold tracking-wider">
                    {selectedProduct.brand} • {selectedProduct.deviceType}
                  </span>
                  <h2 className="text-lg font-bold text-white">{selectedProduct.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedProduct.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"
                  >
                    <span>Ficha EcomShop</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Especificaciones Clave de Ingeniería */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Alimentación / PoE</span>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedProduct.powerRequirements}</p>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Interfaces Físicas</span>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedProduct.interfaces.join(", ")}</p>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Fuente Oficial NotebookLM</span>
                  <p className="font-medium text-indigo-300 truncate mt-0.5">{selectedProduct.notebookSource.title}</p>
                </div>
              </div>
            </div>
          )}

          {/* TABS DEL WORKSPACE (PIPELINE / PACKAGE / EVIDENCIAS / QUALITY / VERSIONES) */}
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("pipeline")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "pipeline" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Pipeline Stages</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("package")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "package" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Marketing Package</span>
              {activePackage && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("evidence")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "evidence" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Evidencias Documentales</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quality")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "quality" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quality Gate (9 Checks)</span>
              {activePackage && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {activePackage.quality.score}%
                </span>
              )}
            </button>

            {versions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "history" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Versiones ({versions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "batch" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Generación Batch</span>
              {activeBatch && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {activeBatch.completedItems}/{activeBatch.totalItems}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: PIPELINE STAGES VIEW */}
          {activeTab === "pipeline" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Etapas del Pipeline Autónomo
                </span>
                <span className="text-xs text-slate-400">
                  {isGenerating ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> En progreso...
                    </span>
                  ) : activePackage ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% Completado
                    </span>
                  ) : (
                    "Listo para iniciar"
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pipelineSteps.map((step, idx) => {
                  const isCompleted = Boolean(activePackage);
                  const isCurrent = isGenerating && idx === 3;
                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isCompleted
                          ? "bg-slate-950 border-emerald-900/60 text-slate-200"
                          : isCurrent
                          ? "bg-indigo-950/40 border-indigo-500 animate-pulse text-indigo-200"
                          : "bg-slate-950/50 border-slate-800/80 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-[10px] font-mono font-bold text-slate-500">0{idx + 1}.</span>
                        <span>{step.label}</span>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-indigo-400 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CANONICAL MARKETING PACKAGE VIEW */}
          {activeTab === "package" && activePackage && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-lg">
              {/* Posicionamiento y Propuesta de Valor */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Posicionamiento B2B</span>
                <p className="text-sm font-semibold text-white">{activePackage.positioning}</p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 mt-1">
                  <span className="font-bold text-indigo-300">Propuesta de Valor: </span>
                  {activePackage.valueProposition}
                </div>
              </div>

              {/* Beneficios Clave */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Beneficios Clave</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activePackage.keyBenefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Arquitectura SEO */}
              <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Arquitectura SEO</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-white text-sm">{activePackage.seo.title}</span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Keyword Principal: {activePackage.seo.primaryKeyword}
                  </span>
                  <p className="text-slate-300 mt-1">{activePackage.seo.metaDescription}</p>
                </div>
              </div>

              {/* Social Copy & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Copia LinkedIn</span>
                  <p className="text-slate-300 whitespace-pre-line line-clamp-6">{activePackage.social.linkedin}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Llamada a la Acción (CTA)</span>
                    <p className="text-sm font-bold text-white mt-1">{activePackage.cta.primary}</p>
                    <p className="text-slate-400 text-xs">{activePackage.cta.secondary}</p>
                  </div>
                  <a
                    href={activePackage.cta.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                  >
                    Ver URL Oficial de Conversión
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCIAS DOCUMENTALES VIEW */}
          {activeTab === "evidence" && activePackage && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Evidencias de Ingeniería Verificadas ({activePackage.verifiedClaims.length})
                </span>
                <span className="text-xs font-mono text-emerald-400">Zero Hallucinations Guarantee</span>
              </div>

              <div className="flex flex-col gap-3">
                {activePackage.verifiedClaims.map((claim, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{claim.claim}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800">
                        {claim.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg font-mono">{claim.value}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Fuente ID: {claim.sourceId} ({claim.sourceType})</span>
                      {claim.sourceUrl && (
                        <a href={claim.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                          Ver Documento Original
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUALITY GATE 9 CHECKS VIEW */}
          {activeTab === "quality" && activePackage && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Comprobaciones Reales de Calidad
                  </span>
                </div>
                <div className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ESTADO: {activePackage.quality.overallStatus} ({activePackage.quality.score}/100)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePackage.quality.checks.map((check) => (
                  <div
                    key={check.name}
                    className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                      check.status === "PASS"
                        ? "bg-slate-950 border-emerald-900/60 text-slate-200"
                        : check.status === "WARN"
                        ? "bg-slate-950 border-amber-900/60 text-amber-200"
                        : "bg-slate-950 border-rose-900/60 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{check.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          check.status === "PASS"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : check.status === "WARN"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{check.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HISTORIAL DE VERSIONES VIEW */}
          {activeTab === "history" && versions.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">
                Historial de Generaciones (Inmutable)
              </span>

              <div className="flex flex-col gap-3">
                {versions.map((ver) => (
                  <div
                    key={ver.version}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      selectedVersion === ver.version
                        ? "bg-indigo-950/40 border-indigo-500 shadow-md"
                        : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                    }`}
                    onClick={() => {
                      setSelectedVersion(ver.version);
                      setActivePackage(ver.marketingPackage);
                      setActiveTab("package");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-indigo-400">V{ver.version}</span>
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-white">{ver.marketingPackage.product.name}</span>
                        <span className="text-slate-400 text-[11px]">{ver.marketingPackage.seo.title}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {ver.createdAt} • Run ID: {ver.runId.substring(0, 14)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: GENERACIÓN BATCH VIEW */}
          {activeTab === "batch" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Generación Autónoma por Lotes (Batch Runner)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Procesamiento de múltiples SKUs con aislamiento estricto, idempotencia y tolerancia a fallos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunBatch}
                    disabled={isBatchRunning || batchSelectedSkus.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isBatchRunning ? "animate-spin" : ""}`} />
                    <span>{isBatchRunning ? "Procesando Lote..." : `Ejecutar Lote (${batchSelectedSkus.length})`}</span>
                  </button>

                  {activeBatch && (activeBatch.failedItems > 0 || activeBatch.blockedItems > 0) && (
                    <button
                      type="button"
                      onClick={handleRetryBatch}
                      disabled={isBatchRunning}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBatchRunning ? "animate-spin" : ""}`} />
                      <span>Reintentar Fallidos</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de SKUs para el Batch */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Seleccionar SKUs para el Lote ({batchSelectedSkus.length} seleccionados):
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {ECOMSHOP_FULL_CATALOG.map((p) => {
                    const isChecked = batchSelectedSkus.includes(p.sku);
                    return (
                      <button
                        key={p.sku}
                        type="button"
                        onClick={() => {
                          setBatchSelectedSkus((prev) =>
                            isChecked ? prev.filter((s) => s !== p.sku) : [...prev, p.sku]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                          isChecked
                            ? "bg-indigo-950 text-indigo-200 border-indigo-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {p.sku}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado del Batch Activo */}
              {activeBatch && (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total SKUs</span>
                      <p className="font-bold text-white text-base mt-0.5">{activeBatch.totalItems}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold">Completados</span>
                      <p className="font-bold text-emerald-400 text-base mt-0.5">{activeBatch.completedItems}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-amber-400 uppercase font-semibold">Bloqueados Gate</span>
                      <p className="font-bold text-amber-400 text-base mt-0.5">{activeBatch.blockedItems}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-rose-400 uppercase font-semibold">Fallidos</span>
                      <p className="font-bold text-rose-400 text-base mt-0.5">{activeBatch.failedItems}</p>
                    </div>
                  </div>

                  {/* Tabla de items del Batch */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-300">Detalle de Ejecución por SKU:</span>
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                      {Object.values(activeBatch.items).map((item) => (
                        <div
                          key={item.sku}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-indigo-300">{item.sku}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === "COMPLETED"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : item.status === "PROCESSING"
                                  ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                  : item.status === "BLOCKED"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-rose-950 text-rose-300 border border-rose-800"
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.qualityScore !== undefined && (
                              <span className="text-[11px] text-slate-400">Score: {item.qualityScore}/100</span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                            {item.error ? (
                              <span className="text-rose-400">{item.error}</span>
                            ) : item.runId ? (
                              <span className="font-mono text-slate-500">Run: {item.runId.substring(0, 16)}...</span>
                            ) : (
                              "Pendiente de ejecución"
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
