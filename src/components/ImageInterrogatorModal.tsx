"use client";

import React, { useState } from "react";
import { Sparkles, Camera, X, Check, HelpCircle, ArrowRight, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compressor";

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
          mode: "interrogate",
          userIdea,
          baseImage,
          apiKey
        })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        // Pre-seleccionar primera opción de cada una
        const initialAnswers: Record<string, string> = {};
        data.questions.forEach((q: InterviewQuestion) => {
          if (q.options.length > 0) {
            initialAnswers[q.id] = q.options[0].label;
          }
        });
        setSelectedAnswers(initialAnswers);
        setStep("questions");
      }
    } catch (err) {
      console.error(err);
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
          mode: "synthesize",
          userIdea,
          answers: selectedAnswers,
          baseImage,
          apiKey
        })
      });
      const data = await res.json();
      if (data.data) {
        setResultData(data.data);
        setStep("result");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleFinish = () => {
    if (resultData) {
      onApplyPrompt(
        resultData.suggestedPrompt,
        resultData.recommendedAspectRatio || "16:9",
        baseImage || undefined
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-editorial text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Director de Arte IA: Interrogatorio Fotográfico
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-sans font-bold">
                  B2B Studio
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Responde unas breves preguntas para componer una imagen técnica fotorrealista única.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido según Step */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === "idea" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1. ¿Qué idea o concepto tienes en mente?
                </label>
                <textarea
                  rows={3}
                  value={userIdea}
                  onChange={(e) => setUserIdea(e.target.value)}
                  placeholder="Ej: Quiero una foto moderna de un técnico instalando un Access Point WiFi 7 en una oficina de diseño, o un rack 42U limpio con latiguillos azules impecables..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white resize-none"
                />
              </div>

              {/* Imagen Base Opcional */}
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                <label className="text-xs font-bold text-purple-950 flex items-center justify-between mb-1">
                  <span>2. Añadir Imagen Base de Referencia (Opcional)</span>
                  {baseImage && (
                    <button
                      type="button"
                      onClick={() => setBaseImage(null)}
                      className="text-[10px] text-rose-600 hover:underline font-semibold"
                    >
                      Quitar imagen base
                    </button>
                  )}
                </label>
                <p className="text-[11px] text-purple-700/80 mb-3">
                  Sube una foto de un rack real, un switch de tu catálogo o una captura para que la IA la tome como base de estilo o variación.
                </p>

                {baseImage ? (
                  <div className="relative w-full h-36 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-purple-200">
                    <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white/60 hover:bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload className="w-6 h-6 text-purple-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Subir foto o esquema de referencia</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG hasta 5MB</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === "questions" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  Perfilado Visual B2B: Selecciona los detalles deseados
                </span>
                <button
                  onClick={() => setStep("idea")}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Modificar idea
                </button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={q.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">
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
                          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-purple-50 border-purple-600 text-purple-950 shadow-xs"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.detail}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />}
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">Prompt Fotográfico Compilado</div>
                  <div className="text-[11px] text-emerald-800/80">{resultData.technicalNotes}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Prompt Especializado Generado (Inglés)
                </label>
                <textarea
                  rows={5}
                  value={resultData.suggestedPrompt}
                  onChange={(e) =>
                    setResultData((prev) => (prev ? { ...prev, suggestedPrompt: e.target.value } : null))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white resize-none font-mono"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="font-semibold">Formato recomendado:</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono font-bold">
                  {resultData.recommendedAspectRatio}
                </span>
                {baseImage && (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <ImageIcon className="w-3.5 h-3.5" /> Con Imagen Base vinculada
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>

          {step === "idea" && (
            <button
              onClick={handleStartInterrogation}
              disabled={loadingQuestions}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs transition"
            >
              {loadingQuestions ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Interrogando con IA...
                </>
              ) : (
                <>
                  Iniciar Interrogatorio
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}

          {step === "questions" && (
            <button
              onClick={handleSynthesizePrompt}
              disabled={synthesizing}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs transition"
            >
              {synthesizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Compilando Prompt de Estudio...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Sintetizar Prompt Final
                </>
              )}
            </button>
          )}

          {step === "result" && (
            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              Transferir al Estudio de Imágenes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
