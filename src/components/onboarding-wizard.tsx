"use client";

import React, { useState } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Sparkles,
  Package,
  Zap
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bienvenido a EcomSpain Marketing OS",
    description: "En 3 pasos simples generarás campañas profesionales para tus productos.",
    icon: Sparkles,
  },
  {
    id: "product",
    title: "Paso 1: Selecciona un Producto",
    description: "Elige de nuestro catálogo de 40+ equipos de networking. Todos están documentados en Google NotebookLM.",
    icon: Package,
  },
  {
    id: "generate",
    title: "Paso 2: Genera tu Campaña",
    description: "Con un clic generamos contenido para Blog, LinkedIn, WhatsApp y Email. El motor IA lo grounding con documentación oficial.",
    icon: Zap,
  },
  {
    id: "export",
    title: "Paso 3: Copia y Publica",
    description: "Copia el contenido en Markdown o HTML listo para publicar. Sin formatos rotos, sin sorpresas.",
    icon: CheckCircle2,
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl flex flex-col gap-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-indigo-950/40 border border-indigo-800/60">
            <Icon className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">{step.title}</h2>
          <p className="text-sm text-slate-400">{step.description}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx <= currentStep ? "bg-indigo-600" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition border border-slate-700"
          >
            Saltar
          </button>
          {!isLast ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              Empezar <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
