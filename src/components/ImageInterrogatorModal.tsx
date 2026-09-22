"use client";

import React, { useState } from "react";
import { Sparkles, Camera, X, Check, HelpCircle, ArrowRight, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compressor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface QuestionOption {
  id: string;
  label: string;
  detail: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
}

interface ImageInterrogatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (prompt: string, aspectRatio: "16:9" | "1:1" | "4:3", baseImage?: string) => void;
  currentBaseImage?: string | null;
  apiKey?: string;
}

export function ImageInterrogatorModal({
  isOpen,
  onClose,
  onApplyPrompt,
  currentBaseImage,
  apiKey
}: ImageInterrogatorModalProps) {
  const [step, setStep] = useState<"idea" | "questions" | "result">("idea");
  const [userIdea, setUserIdea] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(currentBaseImage || null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [synthesizing, setSynthesizing] = useState(false);
  const [resultData, setResultData] = useState<{
    suggestedPrompt: string;
    recommendedAspectRatio: "16:9" | "1:1" | "4:3";
    technicalNotes: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setBaseImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBaseImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartInterrogation = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch("/api/images/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          userIdea,
          hasBaseImage: !!baseImage,
          apiKey
        })
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setStep("questions");
      }
    } catch (err) {
      console.error("Error iniciando interrogatorio:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSynthesizePrompt = async () => {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/images/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "synthesize",
          userIdea,
          answers: selectedAnswers,
          hasBaseImage: !!baseImage,
          apiKey
        })
      });
      const data = await res.json();
      if (data.result) {
        setResultData(data.result);
        setStep("result");
      }
    } catch (err) {
      console.error("Error sintetizando prompt:", err);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleFinish = () => {
    if (resultData) {
      onApplyPrompt(
        resultData.suggestedPrompt,
        resultData.recommendedAspectRatio,
        baseImage || undefined
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Director de Arte IA: Interrogatorio Fotográfico
                </h3>
                <Badge variant="indigo" size="xs">
                  B2B Studio
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Responde unas breves preguntas para componer una imagen técnica fotorrealista única.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Contenido según Step */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === "idea" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  1. ¿Qué idea o concepto tienes en mente?
                </label>
                <textarea
                  rows={3}
                  value={userIdea}
                  onChange={(e) => setUserIdea(e.target.value)}
                  placeholder="Ej: Quiero una foto moderna de un técnico instalando un Access Point WiFi 7 en una oficina de diseño, o un rack 42U limpio con latiguillos azules impecables..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Imagen Base Opcional */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between mb-1">
                  <span>2. Añadir Imagen Base de Referencia (Opcional)</span>
                  {baseImage && (
                    <button
                      type="button"
                      onClick={() => setBaseImage(null)}
                      className="text-[10px] text-rose-400 hover:underline font-semibold cursor-pointer"
                    >
                      Quitar imagen base
                    </button>
                  )}
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Sube una foto de un rack real, un switch de tu catálogo o una captura para que la IA la tome como base de estilo o variación.
                </p>

                {baseImage ? (
                  <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
                    <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/60 hover:bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload className="w-6 h-6 text-indigo-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">Subir foto o esquema de referencia</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG hasta 5MB</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === "questions" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  Perfilado Visual B2B: Selecciona los detalles deseados
                </span>
                <button
                  type="button"
                  onClick={() => setStep("idea")}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Modificar idea
                </button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={q.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">
                    {qIndex + 1}. {q.question}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.label;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-950/60 border-indigo-500 text-indigo-100 shadow-xs"
                              : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.detail}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === "result" && resultData && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-300">Prompt Fotográfico Compilado</div>
                  <div className="text-[11px] text-emerald-200/80">{resultData.technicalNotes}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Prompt Especializado Generado (Inglés)
                </label>
                <textarea
                  rows={5}
                  value={resultData.suggestedPrompt}
                  onChange={(e) =>
                    setResultData((prev) => (prev ? { ...prev, suggestedPrompt: e.target.value } : null))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="font-semibold text-slate-400">Formato recomendado:</span>
                <Badge variant="indigo" size="xs">
                  {resultData.recommendedAspectRatio}
                </Badge>
                {baseImage && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ImageIcon className="w-3.5 h-3.5" /> Con Imagen Base vinculada
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </Button>

          {step === "idea" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleStartInterrogation}
              disabled={loadingQuestions}
            >
              {loadingQuestions ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Interrogando con IA...
                </>
              ) : (
                <>
                  Iniciar Interrogatorio
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          )}

          {step === "questions" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSynthesizePrompt}
              disabled={synthesizing}
            >
              {synthesizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Compilando Prompt de Estudio...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Sintetizar Prompt Final
                </>
              )}
            </Button>
          )}

          {step === "result" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Transferir al Estudio de Imágenes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
