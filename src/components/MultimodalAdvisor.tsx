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
  Network
} from "lucide-react";
import { CampaignRecommendation, MultimodalAdvisorResponse } from "@/lib/multimodal-advisor";

export interface FieldScenarioInspiration {
  id: string;
  badge: string;
  title: string;
  prompt: string;
  suggestedCategory: "wifi" | "switches" | "fibra" | "engenius";
  icon: "zap" | "warning" | "network" | "layers" | "file";
}

export const FIELD_SCENARIOS: FieldScenarioInspiration[] = [
  {
    id: "sc-bottleneck-wifi7",
    badge: "CUELLO DE BOTELLA 1G",
    title: "APs Wi-Fi 7 conectados a switches antiguos 1 GbE",
    prompt: "El cliente ha adquirido puntos de acceso Wi-Fi 7 pero los mantiene conectados a switches antiguos de 1 GbE, limitando el caudal a 940 Mbps netos. Necesita justificación técnica para migrar la conmutación a puertos 2.5G/10G PoE++ (ECS2512FP) para no estrangular la modulación 4096-QAM.",
    suggestedCategory: "switches",
    icon: "zap"
  },
  {
    id: "sc-poe-drop",
    badge: "CAÍDA DE TENSIÓN POE++",
    title: "Reinicios cíclicos en cámaras PTZ o APs en tiradas largas",
    prompt: "El instalador reporta reinicios aleatorios en cámaras domo PTZ y APs de 4 cadenas en tiradas de más de 60 metros. Sospecha de caída de tensión por cableado de cobre fino (AWG 26) y déficit en el PoE Budget. Necesita cálculo de PoE++ 802.3bt y recomendación de switches con margen holgado.",
    suggestedCategory: "switches",
    icon: "warning"
  },
  {
    id: "sc-dfs-radar",
    badge: "SATURACIÓN DFS",
    title: "Cortes de señal en naves industriales por radares meteorológicos",
    prompt: "En una nave logística próxima a aeropuerto o costa, las radios de 5 GHz sufren desconexiones continuas porque el radar meteorológico fuerza el salto de canales DFS. Explicar cómo Wi-Fi 7 con banda limpia de 6 GHz y Preamble Puncturing elimina las caídas sin perder ancho de banda.",
    suggestedCategory: "wifi",
    icon: "network"
  },
  {
    id: "sc-meraki-tco",
    badge: "AHORRO 42% TCO",
    title: "Fuga de presupuesto por licencias anuales tipo Cisco Meraki",
    prompt: "Director TIC con parque de 35 puntos de acceso cuyas licencias anuales de suscripción cloud vencen en 3 meses con costes abusivos. Busca migrar a EnGenius Cloud Enterprise para obtener gestión en la nube profesional con 0€ en licencias recurrentes y sustitución en 24h de EcomSpain.",
    suggestedCategory: "engenius",
    icon: "layers"
  },
  {
    id: "sc-roaming-hospitality",
    badge: "ROAMING & LATENCIA",
    title: "Microcortes en telefonía VoIP y tablets al moverse entre plantas",
    prompt: "En un hotel y oficinas corporativas, el personal reporta microcortes en llamadas de voz IP y tablets al desplazarse entre coberturas de APs. Explicar cómo configurar roaming 802.11k/v/r y la ventaja de Multi-Link Operation (MLO) en EnGenius Cloud para evitar caídas de sesión.",
    suggestedCategory: "wifi",
    icon: "network"
  },
  {
    id: "sc-fiber-sfp",
    badge: "TRONCAL 10G",
    title: "Saturación del enlace troncal entre racks y plantas",
    prompt: "Saturación severa en el enlace troncal entre el rack principal y la planta de producción en horas punta. Explicar cómo desplegar un enlace troncal con módulos transceptores 10G SFP+ y fibra óptica OM3/OM4 junto al switch de agregación ECS5512FP sin interrupción del servicio.",
    suggestedCategory: "fibra",
    icon: "file"
  }
];

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

  const handleSelectScenario = (scenario: FieldScenarioInspiration) => {
    setSelectedScenarioId(scenario.id);
    setOperatorPrompt(scenario.prompt);
    setErrorMsg(null);
  };

  const handleSurpriseMe = () => {
    const randomScenario = FIELD_SCENARIOS[Math.floor(Math.random() * FIELD_SCENARIOS.length)];
    handleSelectScenario(randomScenario);
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
      <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-50 text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Inspiraciones Rápidas de Campo (Diagnósticos Reales de Obra B2B)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSurpriseMe}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors self-start sm:self-auto"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>🎲 Sorpréndeme</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          ¿No tienes material ni notas a mano? Selecciona un escenario habitual en instalaciones de telecomunicaciones:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {FIELD_SCENARIOS.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-400/30 shadow-xs"
                    : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {sc.badge}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                  {sc.title}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
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
