"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Camera,
  X,
  Check,
  ArrowRight,
  RefreshCw,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compressor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ImageCreativeRecommendation,
  ImageIntentAnalysis,
  ImageInterviewQuestion,
} from "@/lib/types/image-intelligence";

interface ImageInterrogatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (
    prompt: string,
    aspectRatio: "16:9" | "1:1" | "4:3",
    baseImage?: string,
  ) => void;
  currentBaseImage?: string | null;
}

type Step = "idea" | "analysis" | "questions" | "result";

interface PromptResult {
  suggestedPrompt: string;
  recommendedAspectRatio: "16:9" | "1:1" | "4:3";
  technicalNotes: string;
}

async function postCreative(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch("/api/images/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "No se pudo procesar la idea visual.";
    throw new Error(error);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Respuesta inválida del Director de Arte IA.");
  }

  return payload as Record<string, unknown>;
}

export function ImageInterrogatorModal({
  isOpen,
  onClose,
  onApplyPrompt,
  currentBaseImage,
}: ImageInterrogatorModalProps) {
  const [step, setStep] = useState<Step>("idea");
  const [userIdea, setUserIdea] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(currentBaseImage || null);
  const [analysis, setAnalysis] = useState<ImageIntentAnalysis | null>(null);
  const [questions, setQuestions] = useState<ImageInterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<PromptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBaseImage(currentBaseImage || null);
      setErrorMessage(null);
    }
  }, [currentBaseImage, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBaseImage(await compressImageToDataUrl(file));
    } catch {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const value = loadEvent.target?.result;
        if (typeof value === "string") setBaseImage(value);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyze = async () => {
    if (!userIdea.trim()) {
      setErrorMessage("Describe primero qué quieres conseguir con la imagen.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await postCreative({
        mode: "analyze",
        userIdea: userIdea.trim(),
        baseImage: baseImage || undefined,
        requestedAspectRatio: "16:9",
      });

      const parsedAnalysis = data.analysis as ImageIntentAnalysis;
      const parsedQuestions = Array.isArray(data.questions)
        ? (data.questions as ImageInterviewQuestion[])
        : [];

      setAnalysis(parsedAnalysis);
      setQuestions(parsedQuestions);
      setAnswers({});

      if (parsedQuestions.length > 0 && !parsedAnalysis.qualification.readyForGeneration) {
        setStep("questions");
      } else {
        setStep("analysis");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo analizar la idea.");
    } finally {
      setLoading(false);
    }
  };

  const compile = async () => {
    if (!analysis) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await postCreative({
        mode: "synthesize",
        userIdea: userIdea.trim(),
        baseImage: baseImage || undefined,
        answers,
        analysis,
        requestedAspectRatio: analysis.recommendation.aspectRatio,
      });

      const result = (data.data || data.result) as PromptResult;
      if (!result?.suggestedPrompt) {
        throw new Error("El compilador no devolvió un prompt utilizable.");
      }

      setResultData(result);
      setStep("result");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo compilar el prompt.");
    } finally {
      setLoading(false);
    }
  };

  const recommendation = analysis?.recommendation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Director de Arte IA</h3>
                <Badge variant="indigo" size="xs">Multimodal</Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Convierte una idea del cliente en una dirección fotográfica profesional.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose} className="p-1 text-slate-400">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === "idea" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  ¿Qué quieres conseguir?
                </label>
                <textarea
                  rows={4}
                  value={userIdea}
                  onChange={(event) => setUserIdea(event.target.value)}
                  placeholder="Ej.: necesito generar un punto de acceso puesto en la pared y que la gente se conecte."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">Imagen de referencia</span>
                  {baseImage && (
                    <button
                      type="button"
                      onClick={() => setBaseImage(null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                {baseImage ? (
                  <div className="relative w-full h-48 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
                    <img src={baseImage} alt="Referencia del producto" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-6 h-6 text-indigo-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">Subir producto o referencia</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === "analysis" && analysis && recommendation && (
            <RecommendationView
              analysis={analysis}
              recommendation={recommendation}
              onBack={() => setStep("idea")}
            />
          )}

          {step === "questions" && analysis && recommendation && (
            <div className="space-y-5">
              <RecommendationView
                analysis={analysis}
                recommendation={recommendation}
                compact
                onBack={() => setStep("idea")}
              />

              <div className="border-t border-slate-800 pt-4">
                <div className="text-xs font-bold text-indigo-300 mb-3">
                  Solo necesitamos estos detalles para cerrar la dirección
                </div>

                {questions.map((question) => (
                  <div key={question.id} className="space-y-2 mb-5">
                    <h4 className="text-xs font-bold text-slate-200">{question.question}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option) => {
                        const selected = answers[question.id] === option.label;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: option.label }))}
                            className={`p-3 rounded-xl border text-left transition flex justify-between gap-2 ${
                              selected
                                ? "bg-indigo-950/60 border-indigo-500 text-indigo-100"
                                : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">{option.label}</div>
                              <div className="text-[10px] text-slate-400 mt-1">{option.detail}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "result" && resultData && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                <div className="text-xs font-bold text-emerald-300 mb-1">Prompt profesional listo</div>
                <div className="text-[11px] text-emerald-200/80">{resultData.technicalNotes}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Prompt optimizado</label>
                <textarea
                  rows={8}
                  value={resultData.suggestedPrompt}
                  onChange={(event) =>
                    setResultData((previous) =>
                      previous ? { ...previous, suggestedPrompt: event.target.value } : null,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="font-semibold text-slate-400">Formato:</span>
                <Badge variant="indigo" size="xs">{resultData.recommendedAspectRatio}</Badge>
                {baseImage && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ImageIcon className="w-3.5 h-3.5" /> Referencia vinculada
                  </span>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-800/70 bg-rose-950/40 text-[11px] text-rose-200">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>

          {step === "idea" && (
            <Button type="button" variant="primary" size="sm" onClick={analyze} disabled={loading}>
              {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {loading ? "Analizando idea..." : "Analizar con IA"}
              {!loading && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
            </Button>
          )}

          {step === "analysis" && (
            <Button type="button" variant="primary" size="sm" onClick={compile} disabled={loading}>
              {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {loading ? "Construyendo prompt..." : "Construir prompt profesional"}
            </Button>
          )}

          {step === "questions" && (
            <Button type="button" variant="primary" size="sm" onClick={compile} disabled={loading}>
              {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {loading ? "Compilando..." : "Aplicar dirección creativa"}
            </Button>
          )}

          {step === "result" && resultData && (
            <Button type="button" variant="primary" size="sm" onClick={() => {
              onApplyPrompt(resultData.suggestedPrompt, resultData.recommendedAspectRatio, baseImage || undefined);
              onClose();
            }} className="bg-emerald-600 hover:bg-emerald-500">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Transferir al Estudio
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationView({
  analysis,
  recommendation,
  compact = false,
  onBack,
}: {
  analysis: ImageIntentAnalysis;
  recommendation: ImageCreativeRecommendation;
  compact?: boolean;
  onBack: () => void;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">La IA ha entendido</div>
          <h4 className="text-sm font-bold text-white mt-1">{analysis.intent}</h4>
        </div>
        <button type="button" onClick={onBack} className="text-[11px] text-slate-400 hover:text-white underline">
          Modificar idea
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Info label="Objetivo" value={recommendation.objective} />
        <Info label="Producto" value={analysis.detectedProduct} />
        <Info label="Escena" value={recommendation.scene} />
        <Info label="Acción" value={recommendation.action} />
        <Info label="Mensaje" value={recommendation.message} />
        <Info label="Composición" value={recommendation.composition} />
      </div>

      {!compact && (
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50">
          <div className="text-xs font-bold text-indigo-300 mb-1">Dirección creativa propuesta</div>
          <div className="text-[11px] text-slate-300 leading-relaxed">{recommendation.rationale}</div>
          <div className="text-[11px] text-slate-400 mt-2">
            Cámara: {recommendation.camera} · Luz: {recommendation.lighting}
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500">
        Confianza de análisis: {Math.round(analysis.confidence * 100)}% · Formato recomendado: {recommendation.aspectRatio}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
      <div className="text-[11px] text-slate-200 mt-1 leading-relaxed">{value}</div>
    </div>
  );
}
