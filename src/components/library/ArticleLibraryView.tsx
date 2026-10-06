"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ArrowUpDown,
  BookOpen,
  Send,
  X
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { HistoricalContentItem } from "@/components/historical-content-list";
import { ContentOutput } from "@/lib/schema";

interface ArticleLibraryViewProps {
  items: HistoricalContentItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenInWorkspace: (item: HistoricalContentItem) => void;
  userRole?: string;
}

export function ArticleLibraryView({
  items,
  isLoading,
  error,
  onRefresh,
  onOpenInWorkspace,
  userRole
}: ArticleLibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest" | "updated" | "title">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [inspectingItem, setInspectingItem] = useState<HistoricalContentItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Extracción dinámica de categorías
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtrado multivariable y ordenación
  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.productId && item.productId.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.preview && item.preview.toLowerCase().includes(q));

      const s = (item.rawStatus || item.status).toUpperCase();
      const matchesStatus =
        selectedStatus === "ALL" ||
        s === selectedStatus ||
        (selectedStatus === "REVIEWED" && (s === "IN_REVIEW" || s === "REVIEWED"));

      const matchesCategory =
        selectedCategory === "ALL" ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesStatus && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sortOrder === "recent") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortOrder === "updated") {
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      }
      if (sortOrder === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [items, searchQuery, selectedStatus, selectedCategory, sortOrder]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: string, rawStatus?: string) => {
    const s = (rawStatus || status).toUpperCase();
    switch (s) {
      case "PUBLISHED":
        return <Badge variant="success" size="xs">Publicado</Badge>;
      case "APPROVED":
        return <Badge variant="cyan" size="xs">Aprobado</Badge>;
      case "IN_REVIEW":
      case "REVIEWED":
        return <Badge variant="warning" size="xs">En Revisión</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="neutral" size="xs">Borrador</Badge>;
    }
  };

  const getIntegrityBadge = (integrity?: "VALID" | "CORRUPTED" | "LEGACY_NEEDS_REPAIR") => {
    if (integrity === "CORRUPTED") {
      return (
        <Badge variant="danger" size="xs" className="bg-rose-950/80 text-rose-300 border-rose-800">
          ⚠️ Corrupto
        </Badge>
      );
    }
    if (integrity === "LEGACY_NEEDS_REPAIR") {
      return (
        <Badge variant="warning" size="xs" className="bg-amber-950/80 text-amber-300 border-amber-800">
          Requiere Reparación
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Biblioteca de Artículos Persistidos
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {items.length} totales &bull; {filteredItems.length} filtrados
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Fuente de verdad en Firestore. Lectura y consulta con coste de IA = 0 €.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
          >
            Actualizar
          </Button>

          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                viewMode === "grid" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                viewMode === "table" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, título, slug, extracto o categoría..."
            className="w-full bg-slate-950 border border-slate-800 text-white text-xs pl-9 pr-8 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-mono transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Estado:
          </span>
          {["ALL", "PUBLISHED", "APPROVED", "IN_REVIEW", "DRAFT"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 text-xs rounded-lg transition font-mono border whitespace-nowrap ${
                selectedStatus === st
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              {st === "ALL" ? "TODOS" : st === "IN_REVIEW" ? "REVISIÓN" : st}
            </button>
          ))}
        </div>

        {/* Selector de Ordenación */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" /> Orden:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "recent" | "oldest" | "updated" | "title")}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
          >
            <option value="recent">Más recientes</option>
            <option value="updated">Última modificación</option>
            <option value="oldest">Más antiguos</option>
            <option value="title">Título (A-Z)</option>
          </select>
        </div>

        {/* Filtro de Categoría */}
        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas las Categorías ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Estado Vacío */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No se encontraron artículos</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL"
              ? "Prueba a cambiar o limpiar los filtros seleccionados."
              : "Aún no se han persistido artículos para este espacio de trabajo en Firestore."}
          </p>
        </div>
      )}

      {/* VISTA 1: GRID DE TARJETAS */}
      {viewMode === "grid" && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between group shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(item.status, item.rawStatus)}
                    {getIntegrityBadge(item.integrityStatus)}
                    {item.productId && (
                      <span className="text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                        SKU: {item.productId}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("es-ES") : ""}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.preview || "Sin vista previa disponible."}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingItem(item)}
                  className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Inspeccionar
                </button>

                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onOpenInWorkspace(item)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Abrir / Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 2: TABLA DE DATOS */}
      {viewMode === "table" && filteredItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">SKU / ID</th>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap space-x-1.5">
                      {getStatusBadge(item.status, item.rawStatus)}
                      {getIntegrityBadge(item.integrityStatus)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      {item.productId ? (
                        <span className="text-indigo-400 font-bold">{item.productId}</span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">{item.id.slice(0, 12)}...</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-md truncate">
                      {item.title}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {item.category || "General"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("es-ES") : ""}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setInspectingItem(item)}
                        leftIcon={<Eye className="w-3 h-3" />}
                      >
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onOpenInWorkspace(item)}
                        leftIcon={<Edit3 className="w-3 h-3" />}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER DE INSPECCIÓN COMPLETA DE ARTÍCULO */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {getStatusBadge(inspectingItem.status, inspectingItem.rawStatus)}
                <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-lg">
                  {inspectingItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
              {/* Metadatos Rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">ID:</span>
                  <span className="text-slate-300 truncate block">{inspectingItem.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SKU Vinculado:</span>
                  <span className="text-indigo-400 font-bold block">{inspectingItem.productId || "Ninguno"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Categoría:</span>
                  <span className="text-slate-300 block">{inspectingItem.category || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Última Modificación:</span>
                  <span className="text-slate-300 block">
                    {inspectingItem.updatedAt ? new Date(inspectingItem.updatedAt).toLocaleString("es-ES") : ""}
                  </span>
                </div>
              </div>

              {/* Extracto / Preview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Extracto Editorial
                </h4>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {inspectingItem.preview || "Sin extracto registrado."}
                </div>
              </div>

              {/* Contenido HTML Maquetado si existe */}
              {(() => {
                const blogObj = (inspectingItem.content as Record<string, unknown> | null | undefined)?.blog as Record<string, unknown> | undefined;
                const html = typeof blogObj?.htmlContent === "string" ? blogObj.htmlContent : "";
                if (!html) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Cuerpo del Artículo (HTML)
                      </h4>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(html, "html")}
                        leftIcon={
                          copiedKey === "html" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />
                        }
                      >
                        {copiedKey === "html" ? "¡Copiado!" : "Copiar HTML"}
                      </Button>
                    </div>
                    <div
                      className="p-4 bg-slate-950 rounded-lg border border-slate-800 max-h-72 overflow-y-auto text-xs text-slate-300 prose prose-invert prose-xs max-w-none"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingItem(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const it = inspectingItem;
                  setInspectingItem(null);
                  onOpenInWorkspace(it);
                }}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Abrir en Workspace Editorial
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
