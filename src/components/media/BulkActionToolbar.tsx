"use client";

import React from "react";
import { Trash2, X, CheckSquare, Loader2 } from "lucide-react";

export interface BulkActionToolbarProps {
  selectedCount: number;
  itemType: "images" | "documents";
  onClearSelection: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  itemType,
  onClearSelection,
  onBulkDelete,
  isDeleting = false
}: BulkActionToolbarProps) {
  if (selectedCount <= 0) return null;

  const itemLabel = itemType === "images" 
    ? selectedCount === 1 ? "imagen seleccionada" : "imágenes seleccionadas"
    : selectedCount === 1 ? "documento seleccionado" : "documentos seleccionados";

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="pointer-events-auto flex items-center justify-between gap-4 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 max-w-xl w-full">
        {/* Count & Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="font-mono text-amber-300">{selectedCount}</span> {itemLabel}
            </div>
            <span className="text-[10px] text-slate-400">
              Acción masiva disponible
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isDeleting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Deseleccionar todos"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={onBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-950/40 disabled:opacity-50"
            title={`Eliminar los ${selectedCount} elementos seleccionados`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Borrando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
