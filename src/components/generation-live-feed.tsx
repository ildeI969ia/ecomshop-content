"use client";

import React from "react";
import { Terminal } from "lucide-react";
import type { GenerationStage } from "./campaign-stepper";

/** Mensajes de progreso por etapa (informativos; no son tokens reales del modelo). */
const STAGE_MESSAGES: Partial<Record<GenerationStage, string[]>> = {
  EXTRACTING: [
    "Validando SKU contra el feed de EcomShop…",
    "Cargando ficha técnica y Product Truth…",
    "Bloqueando identidad del producto (SKU lock)…"
  ],
  NOTEBOOK_GROUNDING: [
    "Alineando audiencia objetivo…",
    "Construyendo matriz de objeciones y tesis editorial…",
    "Seleccionando ángulo editorial sin colisiones…"
  ],
  GENERATING_CHANNELS: [
    "Redactando artículo de blog con análisis técnico…",
    "Desarrollando argumentos, casos de uso y criterios de decisión…",
    "Escribiendo post de LinkedIn orientado a decisores…",
    "Preparando mensaje de WhatsApp y newsletter…",
    "Generando artículo GEO con preguntas frecuentes…",
    "Revisando coherencia entre canales…"
  ],
  FACT_CHECKING: [
    "Contrastando afirmaciones con evidencia verificable…",
    "Comprobando contaminación entre productos…",
    "Aplicando Quality Gate editorial…"
  ]
};

const TYPE_INTERVAL_MS = 22;
const LINE_PAUSE_MS = 900;

interface GenerationLiveFeedProps {
  stage: GenerationStage;
}

export const GenerationLiveFeed: React.FC<GenerationLiveFeedProps> = ({ stage }) => {
  const [lines, setLines] = React.useState<string[]>([]);
  const [typing, setTyping] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);

  const active = stage !== "IDLE" && stage !== "ERROR" && stage !== "COMPLETED";

  // Temporizador de tiempo transcurrido
  React.useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Efecto de escritura por etapa
  React.useEffect(() => {
    if (!active) return;
    const messages = STAGE_MESSAGES[stage] ?? [];
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const typeLine = (index: number, char: number) => {
      if (cancelled) return;
      const msg = messages[index % messages.length];
      if (!msg) return;
      if (char <= msg.length) {
        setTyping(msg.slice(0, char));
        timer = setTimeout(() => typeLine(index, char + 1), TYPE_INTERVAL_MS);
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        setLines((prev) => [...prev.slice(-5), msg]);
        setTyping("");
        // Tras recorrer las líneas de la etapa, se repiten para indicar que sigue trabajando
        typeLine(index + 1, 0);
      }, LINE_PAUSE_MS);
    };

    typeLine(0, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stage, active]);

  if (!active) return null;

  return (
    <div
      className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-[11px] text-slate-300 select-text"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between text-slate-500">
        <span className="flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-sky-400" /> Actividad en vivo
        </span>
        <span>{elapsed}s</span>
      </div>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={`${i}-${line}`} className="text-emerald-400/80">
            ✓ {line}
          </p>
        ))}
        <p className="text-sky-300">
          › {typing}
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-sky-300 align-middle" />
        </p>
      </div>
    </div>
  );
};
