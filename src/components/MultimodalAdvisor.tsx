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
  Trash2, 
  Zap, 
  Tag, 
  Layers,
  Dices,
  AlertTriangle,
  Network,
  RefreshCw,
  Shuffle,
  Lightbulb
} from "lucide-react";
import { CampaignRecommendation, MultimodalAdvisorResponse } from "@/lib/multimodal-advisor";
import { 
  CURATED_FIELD_SCENARIOS_POOL, 
  FieldScenarioInspiration 
} from "@/lib/services/field-scenarios-service";

export type { FieldScenarioInspiration };
export const FIELD_SCENARIOS = CURATED_FIELD_SCENARIOS_POOL;


interface MultimodalAdvisorProps {
  apiKey?: string;
  onApplyRecommendation: (rec: CampaignRecommendation) => void;
  onLaunchJuniaEngine?: (rec: CampaignRecommendation) => void;
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
  onLaunchJuniaEngine,
  onRecordFinops
}: MultimodalAdvisorProps) {
  const [operatorPrompt, setOperatorPrompt] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
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

  // Estados de consulta y progreso multi-paso
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  const [progressText, setProgressText] = useState("");
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

  // Simulación de pasos de progreso mientras la IA procesa
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgressStep(1);
      setProgressText("Analizando evidencias técnicas y telemetría de campo...");
      interval = setInterval(() => {
        setProgressStep((prev) => {
          if (prev === 1) {
            setProgressText("Cruzando con el Master NotebookLM de EcomShop (59 fuentes de ingeniería)...");
            return 2;
          }
          if (prev === 2) {
            setProgressText("Formulando 3 propuestas estratégicas B2B con SKUs y ángulos...");
            return 3;
          }
          return prev;
        });
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlobObj = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlobObj);
        const url = URL.createObjectURL(audioBlobObj);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.onload = () => {
          const resStr = reader.result as string;
          const b64 = resStr.split(",")[1];
          setSelectedFile({
            file: new File([audioBlobObj], "audio_nota.webm", { type: "audio/webm" }),
            previewUrl: url,
            base64: b64,
            mimeType: "audio/webm"
          });
        };
        reader.readAsDataURL(audioBlobObj);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
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

  // Inspiraciones dinámicas de campo
  const [scenarios, setScenarios] = useState<FieldScenarioInspiration[]>(CURATED_FIELD_SCENARIOS_POOL);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [generatingMoreScenarios, setGeneratingMoreScenarios] = useState(false);
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(null);

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "network":
        return <Network className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case "layers":
        return <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case "file":
        return <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case "zap":
      default:
        return <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
  };

  const filteredScenarios = scenarios.filter((sc) => {
    if (activeCategory === "ALL") return true;
    return sc.suggestedCategory === activeCategory;
  });

  const handleSelectScenario = (scenario: FieldScenarioInspiration) => {
    setSelectedScenarioId(scenario.id);
    setOperatorPrompt(scenario.prompt);
    setErrorMsg(null);
  };

  const handleGenerateMoreScenarios = async () => {
    setGeneratingMoreScenarios(true);
    setScenarioFeedback(null);
    try {
      const res = await fetch("/api/advisor/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: activeCategory,
          apiKey: apiKey || undefined
        })
      });
      const data = await res.json();
      if (data.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
        const newItems: FieldScenarioInspiration[] = data.scenarios;
        setScenarios((prev) => {
          const newIds = new Set(newItems.map((n) => n.id));
          const rest = prev.filter((p) => !newIds.has(p.id));
          return [...newItems, ...rest];
        });
        setSelectedScenarioId(newItems[0].id);
        setOperatorPrompt(newItems[0].prompt);
        setScenarioFeedback(`✨ ${newItems.length} nuevas ideas técnicas sintetizadas con el Master NotebookLM.`);
        
        onRecordFinops({
          action: "gemini_multimodal_advisor",
          details: `Generación de ideas de campo IA (${activeCategory}): ${newItems.length} casos de obra`,
          tokensInput: 650,
          tokensOutput: 450
        });
      }
    } catch (err: any) {
      console.error("Error al generar escenarios:", err);
      setScenarioFeedback("Aviso: usando pool curado local por latencia de red.");
    } finally {
      setGeneratingMoreScenarios(false);
    }
  };

  const handleShuffleScenarios = () => {
    setScenarios((prev) => [...prev].sort(() => 0.5 - Math.random()));
  };

  const handleSurpriseMe = () => {
    const pool = filteredScenarios.length > 0 ? filteredScenarios : scenarios;
    const randomScenario = pool[Math.floor(Math.random() * pool.length)];
    if (randomScenario) {
      handleSelectScenario(randomScenario);
    }
  };

  const handleSubmit = async () => {
    if (!operatorPrompt.trim() && !selectedFile) {
      setErrorMsg("Selecciona un caso real de obra o adjunta una imagen/audio para iniciar el diagnóstico.");
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
          textPrompt: operatorPrompt.trim(),
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
        details: `Asesor Multimodal: ${data.data.detectedEquipmentOrNeed || "Análisis de ingeniería"} (${selectedFile ? selectedFile.mimeType : "Dolor de obra"})`,
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Director de Marketing Preventa Multimodal • Gemini 2.5 Flash / Pro (The Junia Engine)
          </div>
          <h2 className="text-2xl font-bold font-editorial text-white mb-2">
            ¿Sin ideas claras sobre qué promocionar? Deja que la IA analice la realidad técnica.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Sube la foto de un rack o instalación, el esquema de red de un cliente, o simplemente <strong>selecciona un dolor de obra real a 1 clic</strong>. El agente diagnosticará la necesidad de ingeniería y te entregará 3 propuestas comerciales listas para lanzar con el Junia Engine.
          </p>
        </div>
      </div>

      {/* Selector de Inspiraciones de Obra cuando no se sabe qué escribir */}
      <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Inspiraciones Rápidas de Campo (Diagnósticos Reales de Obra B2B)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ¿No tienes material ni notas a mano? Explora o genera casos cotidianos de ingeniería de telecomunicaciones:
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Botón Generar Más Ideas con IA */}
            <button
              type="button"
              onClick={handleGenerateMoreScenarios}
              disabled={generatingMoreScenarios}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95"
              title="Consultar al Master NotebookLM para sintetizar nuevos dolores técnicos de obra"
            >
              {generatingMoreScenarios ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sintetizando ideas...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generar Más Ideas con IA</span>
                </>
              )}
            </button>

            {/* Botón Mezclar */}
            <button
              type="button"
              onClick={handleShuffleScenarios}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              title="Mezclar el orden de las inspiraciones"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Mezclar</span>
            </button>

            {/* Botón Sorpréndeme */}
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
              title="Elegir un escenario aleatorio"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Sorpréndeme</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Filtrado por Categoría Técnica */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
          {[
            { id: "ALL", label: "Todas las áreas", count: scenarios.length },
            { id: "wifi", label: "Wi-Fi 7 & Roaming", count: scenarios.filter(s => s.suggestedCategory === "wifi").length },
            { id: "switches", label: "Switches & PoE++", count: scenarios.filter(s => s.suggestedCategory === "switches").length },
            { id: "fibra", label: "Fibra 10G & SFP+", count: scenarios.filter(s => s.suggestedCategory === "fibra").length },
            { id: "engenius", label: "TCO & Zero Licencias", count: scenarios.filter(s => s.suggestedCategory === "engenius").length }
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback Banner cuando se generan nuevas ideas */}
        {scenarioFeedback && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
            <span className="font-medium">{scenarioFeedback}</span>
            <button
              type="button"
              onClick={() => setScenarioFeedback(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Grid de Escenarios Filtrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {filteredScenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 group ${
                  isSelected
                    ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-400/30 shadow-xs"
                    : "bg-slate-50/70 hover:bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    {getScenarioIcon(sc.icon)}
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {sc.badge}
                    </span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Usar caso →
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                  {sc.title}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                  {sc.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de Entrada Multimodal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Input Multimodal */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              1. Aporta el Material Técnico u Observación
            </h3>

            {/* Zona Drag & Drop */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Arrastra una foto, esquema, captura o PDF
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Formatos JPG, PNG, WEBP o PDF (Max 15MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFile.mimeType.startsWith("image/") ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.file.size / 1024).toFixed(1)} KB • {selectedFile.mimeType}
                    </p>
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
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200"
                >
                  <Mic className="w-4 h-4" />
                  Iniciar Grabación de Voz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm animate-bounce"
                >
                  <Square className="w-4 h-4" />
                  Detener y Adjuntar Audio
                </button>
              )}
            </div>

            {/* Prompt de Contexto u Observación */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notas adicionales u observaciones del operador (opcional)
              </label>
              <textarea
                value={operatorPrompt}
                onChange={(e) => {
                  setOperatorPrompt(e.target.value);
                  setSelectedScenarioId(null);
                }}
                placeholder="Ej: El cliente se queja de caídas continuas en horas punta. Quiere saber si con EnGenius Cloud resolverá las saturaciones sin pagar licencias anuales..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none h-24"
              />
            </div>

            {/* Botón de Enviar a Gemini */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isRecording || (!operatorPrompt.trim() && !selectedFile)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Diagnóstico...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Desbloquear Ideas & Generar Propuestas</span>
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

        {/* Columna Derecha: Matriz de Propuestas & Progreso Multi-Paso */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xs min-h-[380px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-slate-900 font-editorial">
                  ¿Bloqueo editorial? Genera 3 propuestas de ingeniería al instante
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No necesitas redactar nada desde cero. Haz clic en cualquiera de los <strong>6 casos de obra arriba</strong> o pulsa <strong>"🎲 Sorpréndeme"</strong> para que Gemini y el Master NotebookLM extraigan el diagnóstico y formulen 3 ángulos B2B directos hacia el Junia Engine.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSurpriseMe}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Dices className="w-4 h-4 text-sky-400" />
                    Cargar Dolor de Obra Aleatorio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback de Progreso Multi-Paso en Vivo */}
          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center flex flex-col items-center justify-center space-y-5 shadow-xs min-h-[380px]">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
              </div>

              <div className="space-y-2 max-w-md w-full">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-950">
                  <span>Paso {progressStep} de 3</span>
                  <span className="font-mono text-slate-500">{progressStep * 33}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressStep * 33}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-slate-800 pt-1">
                  {progressText}
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Diagnóstico Preliminar */}
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-xs bg-gradient-to-b from-indigo-50/40 to-white space-y-2">
                <div className="flex items-center gap-2">
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
                <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-semibold text-slate-500">Detectado:</span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    {result.detectedEquipmentOrNeed}
                  </span>
                </div>
              </div>

              {/* Lista de 3 Propuestas Accionables con Integración Dual: The Junia Engine vs One-Shot */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                  Matriz de Propuestas Estratégicas ({result.recommendations.length})
                </h4>

                {result.recommendations.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 p-4.5 transition shadow-xs hover:shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
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

                      {/* Acciones duales: The Junia Engine (Recomendado) y One-Shot */}
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        {onLaunchJuniaEngine && (
                          <button
                            type="button"
                            onClick={() => onLaunchJuniaEngine(rec)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            title="Lanzar con The Junia Engine (Outline Interactivo y Redacción por Secciones)"
                          >
                            <Layers className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Outline Interactivo (Junia)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onApplyRecommendation(rec)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          title="Transferir al generador clásico rápido"
                        >
                          <Zap className="w-3 h-3 text-slate-500" />
                          <span>One-Shot</span>
                        </button>
                      </div>
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
