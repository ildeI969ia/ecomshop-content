"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Upload, 
  Mic, 
  Square, 
  FileText, 
  Image as ImageIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  HelpCircle,
  Volume2,
  Trash2,
  Zap,
  Tag,
  Target
} from "lucide-react";
import { CampaignRecommendation, MultimodalAdvisorResponse } from "@/lib/multimodal-advisor";

interface MultimodalAdvisorProps {
  apiKey?: string;
  onApplyRecommendation: (rec: CampaignRecommendation) => void;
  onRecordFinops: (record: {
    action: "gemini_multimodal_advisor";
    details: string;
    tokensInput?: number;
    tokensOutput?: number;
  }) => void;
}

export function MultimodalAdvisor({
  apiKey,
  onApplyRecommendation,
  onRecordFinops
}: MultimodalAdvisorProps) {
  const [operatorPrompt, setOperatorPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  // Grabación de Audio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados de consulta a la API
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<MultimodalAdvisorResponse | null>(null);

  // Manejo de drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (selectedFile?.previewUrl) URL.revokeObjectURL(selectedFile.previewUrl);
    };
  }, [audioUrl, selectedFile]);

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(",")[1];
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile({
        file,
        previewUrl,
        base64: base64Data,
        mimeType: file.type || "application/octet-stream"
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Grabación de audio con el micrófono del navegador
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convertir a base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(",")[1];
          setSelectedFile({
            file: new File([audioBlob], "nota-de-voz.webm", { type: "audio/webm" }),
            previewUrl: url,
            base64: base64Audio,
            mimeType: "audio/webm"
          });
        };
        reader.readAsDataURL(audioBlob);

        // Detener pistas de audio
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("No se pudo acceder al micrófono. Por favor permite el acceso en el navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setAudioBlob(null);
    setAudioUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!operatorPrompt && !selectedFile) {
      setErrorMsg("Por favor adjunta una imagen, audio o describe la situación que quieres abordar.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch("/api/advisor/multimodal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPrompt: operatorPrompt,
          mediaBase64: selectedFile?.base64,
          mimeType: selectedFile?.mimeType,
          apiKey: apiKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo en el servicio multimodal");
      }

      setResult(data.data);

      onRecordFinops({
        action: "gemini_multimodal_advisor",
        details: `Asesor Multimodal: ${data.data.detectedEquipmentOrNeed || "Análisis general"} (${selectedFile ? selectedFile.mimeType : "Texto"})`,
        tokensInput: data.data.tokensInput,
        tokensOutput: data.data.tokensOutput
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la petición con Gemini.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Director de Marketing Preventa Multimodal • Google Gemini 1.5 Flash
          </div>
          <h2 className="text-2xl font-bold font-editorial text-white mb-2">
            ¿Sin ideas claras sobre qué promocionar? Deja que la IA analice la realidad técnica.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Sube la foto de un rack o instalación, el esquema de red de un cliente, una captura de la competencia, un PDF técnico o simplemente <strong>graba una nota de voz con tu micrófono</strong>. El agente diagnosticará el dolor de ingeniería y te entregará 3 propuestas comerciales listas para lanzar con un solo clic.
          </p>
        </div>
      </div>

      {/* Panel de Entrada Multimodal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Input Multimodal */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              1. Aporta el Material Técnico
            </h3>

            {/* Zona Drag & Drop */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Arrastra una foto, esquema, captura o PDF
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Formatos JPG, PNG, WEBP o PDF (Max 15MB)
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 relative flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  {selectedFile.mimeType.startsWith("image/") ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                    />
                  ) : selectedFile.mimeType.startsWith("audio/") ? (
                    <div className="w-14 h-14 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {selectedFile.mimeType} • {(selectedFile.file.size / 1024).toFixed(1)} KB
                    </p>
                    {selectedFile.mimeType.startsWith("audio/") && audioUrl && (
                      <audio src={audioUrl} controls className="h-6 mt-1 w-44" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Grabadora de Voz Integrada */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  O dicta una nota de voz rápida
                </span>
                {isRecording && (
                  <span className="text-[11px] font-mono text-rose-600 font-bold animate-pulse flex items-center gap-1">
                    ● Grabando: {recordingSeconds}s
                  </span>
                )}
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200"
                >
                  <Mic className="w-4 h-4" />
                  Iniciar Grabación de Voz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm animate-bounce"
                >
                  <Square className="w-4 h-4" />
                  Detener y Adjuntar Audio
                </button>
              )}
            </div>

            {/* Prompt de Contexto Opcional */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notas adicionales u observaciones del operador (opcional)
              </label>
              <textarea
                value={operatorPrompt}
                onChange={(e) => setOperatorPrompt(e.target.value)}
                placeholder="Ej: El cliente se queja de caídas continuas en horas punta. Quiere saber si con EnGenius Cloud resolverá las saturaciones sin pagar licencias anuales..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none h-20"
              />
            </div>

            {/* Botón de Enviar a Gemini */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isRecording}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando con Gemini 1.5 Flash...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Desbloquear Ideas & Generar Propuestas
                </>
              )}
            </button>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Matriz de Propuestas */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs min-h-[380px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-slate-900">
                  Esperando material para análisis estratégico
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Sube una foto de un equipo o instalación, un audio explicativo o escribe el dolor de un cliente. Gemini 1.5 procesará las señales técnicas y formulará 3 propuestas concretas transferibles directamente al generador multicanal.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs min-h-[380px]">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Gemini está examinando la instalación y los detalles técnicos...
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Decodificando equipos, topología, puntos de dolor y elaborando 3 ángulos comerciales B2B.
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Diagnóstico Preliminar */}
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-xs bg-gradient-to-b from-indigo-50/40 to-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="p-1 rounded bg-indigo-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Diagnóstico de Ingeniería Preventa
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {result.analysisSummary}
                </p>
                <div className="mt-2.5 pt-2 border-t border-indigo-100/60 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-semibold text-slate-500">Detectado:</span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    {result.detectedEquipmentOrNeed}
                  </span>
                </div>
              </div>

              {/* Lista de 3 Propuestas Accionables */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                  Matriz de Propuestas Estratégicas (Elige y transfiere a 1 Clic)
                </h4>

                {result.recommendations.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 p-4.5 transition shadow-xs hover:shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Propuesta {idx + 1}: {rec.suggestedAngle}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">
                            {rec.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-950 font-editorial">
                          {rec.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => onApplyRecommendation(rec)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        Transferir al Generador
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-700 italic">
                      "{rec.hookText}"
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="font-bold text-slate-500 block">Equipos Sugeridos:</span>
                        <span className="font-semibold text-slate-800">
                          {rec.recommendedProducts.join(", ") || "Solución EnGenius Cloud"}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 block">Llamada a la Acción (CTA):</span>
                        <span className="font-semibold text-slate-800">{rec.recommendedCtaText}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100 font-medium">
                      💡 <strong>Por qué funciona:</strong> {rec.whyThisWorks}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
