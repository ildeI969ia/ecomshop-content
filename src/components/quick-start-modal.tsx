"use client";

import React from "react";
import { Check, Package, X } from "lucide-react";

interface QuickStartProduct {
  sku: string;
  name: string;
  category: string;
}

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (sku: string) => void;
  products: QuickStartProduct[];
}

export function QuickStartModal({
  isOpen,
  onClose,
  onSelectProduct,
  products,
}: QuickStartModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-start-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-400">
              <Package className="h-4 w-4" />
              Inicio rápido
            </div>
            <h2 id="quick-start-title" className="text-xl font-bold text-white">
              Selecciona un producto
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Elige el producto con el que quieres trabajar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {products.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-400">
              No hay productos disponibles.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <button
                  key={product.sku}
                  type="button"
                  onClick={() => onSelectProduct(product.sku)}
                  className="group rounded-xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:border-indigo-500/60 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-400">
                        {product.category}
                      </p>
                      <h3 className="mt-1 font-semibold text-white group-hover:text-indigo-200">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        SKU: {product.sku}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-500 transition group-hover:border-indigo-500/50 group-hover:text-indigo-300">
                      <Check className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
