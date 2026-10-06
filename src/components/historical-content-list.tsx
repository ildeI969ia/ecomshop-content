"use client";

import React, { useState } from "react";
import {
  History,
  RefreshCw,
  Search,
  Clock,
  FileText,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { Badge, Button } from "@/components/ui";

export interface HistoricalContentItem {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  status: "draft" | "reviewed" | "approved" | "published";
  rawStatus?: string;
  integrityStatus?: "VALID" | "CORRUPTED" | "LEGACY_NEEDS_REPAIR";
  createdAt: string;
  updatedAt: string;
  productId?: string | null;
  campaignId?: string | null;
  preview?: string;
  category?: string;
  content?: Record<string, unknown> | null;
}

interface HistoricalContentListProps {
  items: HistoricalContentItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectContent: (item: HistoricalContentItem) => void;
  activeContentId?: string | null;
}

export function HistoricalContentList({
  items,
  isLoading,
  error,
  onRefresh,
  onSelectContent,
  activeContentId
}: HistoricalContentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.productId && item.productId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      item.status.toUpperCase() === statusFilter.toUpperCase() ||
      (item.rawStatus && item.rawStatus.toUpperCase() === statusFilter.toUpperCase());

    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Cabecera */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Historial de Contenidos Guardados
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                {items.length} persistidos
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Recuperados directamente de Firestore para este espacio de trabajo.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={onRefresh}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-sky-400" : ""}`} />}
        >
          {isLoading ? "Cargando..." : "Actualizar"}
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/80 flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, título o categoría..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Todos" },
            { id: "DRAFT", label: "Borradores" },
            { id: "APPROVED", label: "Aprobados" },
            { id: "PUBLISHED", label: "Publicados" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === f.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estados UX: LOADING / ERROR / EMPTY / LIST */}
      <div className="min-h-[220px] max-h-[360px] overflow-y-auto divide-y divide-slate-800/60 p-1">
        {isLoading && items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">
              Cargando contenidos generados anteriormente desde Firestore...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="p-2.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 inline-block">
              <AlertTriangle className="w-5 h-5 mx-auto" />
            </div>
            <p className="text-xs font-semibold text-rose-300">
              No hemos podido recuperar tu contenido histórico: {error}
            </p>
            <Button type="button" variant="secondary" size="xs" onClick={onRefresh}>
              Reintentar carga
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="p-2 rounded-full bg-slate-800 text-slate-400 inline-block">
              <FileText className="w-5 h-5 mx-auto" />
            </div>
            <p className="text-xs font-medium text-slate-300">
              {items.length === 0
                ? "Aún no tienes contenido generado en este espacio de trabajo."
                : "No hay contenidos que coincidan con los filtros aplicados."}
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {items.length === 0
                ? "Selecciona un producto del catálogo abajo y pulsa 'Lanzar Campaña' para generar tu primer paquete multicanal."
                : "Prueba a cambiar el término de búsqueda o el filtro de estado."}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = activeContentId === item.id;
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "Fecha no disponible";

            return (
              <div
                key={item.id}
                onClick={() => onSelectContent(item)}
                className={`p-3 rounded-lg flex items-start justify-between gap-3 transition cursor-pointer hover:bg-slate-800/60 ${
                  isActive
                    ? "bg-indigo-950/40 border border-indigo-500/50 ring-1 ring-indigo-500/30"
                    : "bg-transparent border border-transparent"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.productId && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {item.productId}
                      </span>
                    )}
                    {getStatusBadge(item.status, item.rawStatus)}
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate hover:text-indigo-300 transition">
                    {item.title}
                  </h4>

                  {item.preview && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed">
                      {item.preview}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                    isActive ? "text-indigo-400" : "text-slate-400"
                  }`}>
                    {isActive ? "Abierto" : "Abrir"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
