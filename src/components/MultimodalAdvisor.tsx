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
import { Button, Badge, Card, EmptyState } from "@/components/ui";

export type { FieldScenarioInspiration };
export const FIELD_SCENARIOS = CURATED_FIELD_SCENARIOS_POOL;


interface MultimodalAdvisorProps {
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

  // Seguimiento de tiempo transcurrido real y estado de la petición
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setElapsedSeconds(0);
      setProgressText("Analizando evidencias técnicas y telemetría de campo...");
      interval = setInterval(() => {
        setElapsedSeconds((sec) => {
          const next = sec + 1;
          if (next >= 4 && next < 8) {
            setProgressText("Cruzando con el Master NotebookLM de EcomShop (59 fuentes de ingeniería)...");
          } else if (next >= 8) {
            setProgressText("Formulando 3 propuestas estratégicas B2B con SKUs y ángulos...");
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const handleFileChange = (file: File) => {
    setErrorMsg(null);

    // Validación real de tamaño máximo (15MB)
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(`El archivo seleccionado supera el límite de 15 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB). Por favor, comprímelo o selecciona otro.`);
      return;
    }

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
    reader.onerror = () => {
      setErrorMsg("Error al leer el archivo seleccionado.");
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

  // Grabación de audio con el micrófono del navegador y diagnóstico contextual
  const startRecording = async () => {
    try {
      setErrorMsg(null);

      // Comprobar disponibilidad de API mediaDevices y protocolo seguro HTTPS
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setErrorMsg("El acceso al micrófono requiere una conexión segura HTTPS según la política del navegador.");
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("Tu navegador no soporta grabación de audio o está bloqueada por la política de seguridad.");
        return;
      }

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
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Permiso de micrófono denegado. Habilita el acceso en el candado de la barra de direcciones.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No se detectó ningún micrófono conectado en tu equipo.");
      } else if (err.name === "SecurityError") {
        setErrorMsg("Acceso al micrófono denegado por política de seguridad (origen no seguro o iframe restringido).");
      } else {
        setErrorMsg(`No se pudo acceder al micrófono (${err.message || "error desconocido"}). Verifica los permisos del navegador.`);
      }
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
        return <Layers className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
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
          category: activeCategory
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
          details: `Generación de ideas de campo IA (${activeCategory}): ${newItems.length} casos de obra (tokens estimados)`,
          tokensInput: data.meta?.tokensInput ?? 650,
          tokensOutput: data.meta?.tokensOutput ?? 450
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
          scenarioId: selectedScenarioId || undefined,
          category: activeCategory !== "ALL" ? activeCategory : undefined
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
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Inspiraciones Rápidas de Campo (Diagnósticos Reales de Obra B2B)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ¿No tienes material ni notas a mano? Explora o genera casos cotidianos de ingeniería de telecomunicaciones:
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Botón Generar Más Ideas con IA (CTA Principal) */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleGenerateMoreScenarios}
              disabled={generatingMoreScenarios}
              isLoading={generatingMoreScenarios}
              leftIcon={!generatingMoreScenarios ? <RefreshCw className="w-3.5 h-3.5" /> : undefined}
              title="Consultar al Master NotebookLM para sintetizar nuevos dolores técnicos de obra"
            >
              {generatingMoreScenarios ? "Sintetizando ideas..." : "Generar Más Ideas con IA"}
            </Button>

            {/* Botón Mezclar (Secundario Atenuado) */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleShuffleScenarios}
              leftIcon={<Shuffle className="w-3.5 h-3.5 text-slate-400" />}
              title="Mezclar el orden de las inspiraciones"
            >
              <span className="hidden md:inline">Mezclar</span>
            </Button>

            {/* Botón Sorpréndeme (Secundario Atenuado) */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSurpriseMe}
              leftIcon={<Dices className="w-3.5 h-3.5 text-indigo-400" />}
              title="Elegir un escenario aleatorio"
            >
              Sorpréndeme
            </Button>
          </div>
        </div>

        {/* Pestañas de Filtrado por Categoría Técnica */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-800">
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
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? "bg-indigo-700 text-white" : "bg-slate-900 text-slate-400"
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback Banner cuando se generan nuevas ideas */}
        {scenarioFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <span className="font-medium">{scenarioFeedback}</span>
            <button
              type="button"
              onClick={() => setScenarioFeedback(null)}
              className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Grid de Escenarios Filtrados con line-clamp-3 y Dark Navy */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {filteredScenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 group cursor-pointer ${
                  isSelected
                    ? "bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg"
                    : "bg-slate-950/60 hover:bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    {getScenarioIcon(sc.icon)}
                    <Badge variant="neutral" size="xs">
                      {sc.badge}
                    </Badge>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Usar caso →
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                  {sc.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
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
          <Card variant="default" padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
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
                    ? "border-indigo-500 bg-indigo-950/30"
                    : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/50 bg-slate-950/30"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">
                    Arrastra una foto, esquema, captura o PDF
                  </p>
                  <p className="text-[11px] text-slate-400">
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
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFile.mimeType.startsWith("image/") ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[180px]">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(selectedFile.file.size / 1024).toFixed(1)} KB • {selectedFile.mimeType}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-rose-950/50 cursor-pointer"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Grabadora de Voz Integrada */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  O dicta una nota de voz rápida
                </span>
                {isRecording && (
                  <span className="text-[11px] font-mono text-rose-400 font-bold animate-pulse flex items-center gap-1">
                    ● Grabando: {recordingSeconds}s
                  </span>
                )}
              </div>

              {!isRecording ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-rose-300 border-rose-900/40 hover:bg-rose-950/30 hover:border-rose-800"
                  onClick={startRecording}
                  disabled={loading}
                  leftIcon={<Mic className="w-4 h-4 text-rose-400" />}
                >
                  Iniciar Grabación de Voz
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white animate-bounce"
                  onClick={stopRecording}
                  leftIcon={<Square className="w-4 h-4" />}
                >
                  Detener y Adjuntar Audio
                </Button>
              )}
            </div>

            {/* Prompt de Contexto u Observación */}
            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Notas adicionales u observaciones del operador (opcional)
              </label>
              <textarea
                value={operatorPrompt}
                onChange={(e) => {
                  setOperatorPrompt(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedScenarioId(null);
                  }
                }}
                placeholder="Ej: El cliente se queja de caídas continuas en horas punta. Quiere saber si con EnGenius Cloud resolverá las saturaciones sin pagar licencias anuales..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none h-24"
              />
            </div>

            {/* Botón de Enviar a Gemini */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={loading || isRecording || (!operatorPrompt.trim() && !selectedFile)}
              isLoading={loading}
              leftIcon={!loading ? <Sparkles className="w-4 h-4 text-indigo-200" /> : undefined}
              className="w-full py-3"
            >
              {loading ? "Procesando Diagnóstico..." : "Desbloquear Ideas & Generar Propuestas"}
            </Button>

            {errorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Columna Derecha: Matriz de Propuestas & Progreso Multi-Paso */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !loading && (
            <EmptyState
              icon={<Sparkles className="w-6 h-6 text-indigo-400" />}
              title="¿Bloqueo editorial? Genera 3 propuestas de ingeniería al instante"
              description="No necesitas redactar nada desde cero. Haz clic en cualquiera de los casos de obra arriba o pulsa 'Sorpréndeme' para que Gemini y el Master NotebookLM extraigan el diagnóstico y formulen 3 ángulos B2B directos hacia el Junia Engine."
              action={
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSurpriseMe}
                  leftIcon={<Dices className="w-4 h-4 text-sky-300" />}
                >
                  Cargar Dolor de Obra Aleatorio
                </Button>
              }
              className="min-h-[380px]"
            />
          )}

          {/* Feedback de Progreso Multi-Paso en Vivo */}
          {loading && (
            <Card variant="default" padding="lg" className="text-center flex flex-col items-center justify-center space-y-5 min-h-[380px]">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-3 border-indigo-950 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
              </div>

              <div className="space-y-2 max-w-md w-full">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>Procesando consulta</span>
                  </span>
                  <Badge variant="indigo" size="xs">
                    Tiempo transcurrido: {elapsedSeconds}s
                  </Badge>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600 h-full rounded-full animate-pulse w-full" />
                </div>
                <p className="text-xs font-bold text-slate-300 pt-1 text-center">
                  {progressText}
                </p>
              </div>
            </Card>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Diagnóstico Preliminar */}
              <Card variant="highlight" padding="md" className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Diagnóstico de Ingeniería Preventa
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {result.analysisSummary}
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-semibold text-slate-400">Detectado:</span>
                  <Badge variant="cyan" size="sm">
                    {result.detectedEquipmentOrNeed}
                  </Badge>
                </div>
              </Card>

              {/* Lista de 3 Propuestas Accionables con Integración Dual: The Junia Engine vs One-Shot */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Matriz de Propuestas Estratégicas ({result.recommendations.length})
                </h4>

                {result.recommendations.map((rec, idx) => (
                  <Card
                    key={rec.id || idx}
                    variant="interactive"
                    padding="md"
                    className="space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" size="xs">
                            Propuesta {idx + 1}: {rec.suggestedAngle}
                          </Badge>
                          <Badge variant="indigo" size="xs">
                            {rec.category}
                          </Badge>
                        </div>
                        <h3 className="text-sm font-bold text-white font-editorial">
                          {rec.title}
                        </h3>
                      </div>

                      {/* Acciones duales: The Junia Engine (Recomendado) y One-Shot */}
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        {onLaunchJuniaEngine && (
                          <Button
                            type="button"
                            variant="primary"
                            size="xs"
                            onClick={() => onLaunchJuniaEngine(rec)}
                            leftIcon={<Layers className="w-3.5 h-3.5 text-indigo-200" />}
                            title="Lanzar con The Junia Engine (Outline Interactivo y Redacción por Secciones)"
                          >
                            Outline Junia
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => onApplyRecommendation(rec)}
                          leftIcon={<Zap className="w-3 h-3 text-slate-400" />}
                          title="Transferir al generador clásico rápido"
                        >
                          One-Shot
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 text-xs text-slate-300 italic">
                      "{rec.hookText}"
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="font-bold text-slate-400 block">Equipos Sugeridos:</span>
                        <span className="font-semibold text-slate-200">
                          {rec.recommendedProducts.join(", ") || "Solución EnGenius Cloud"}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block">Llamada a la Acción (CTA):</span>
                        <span className="font-semibold text-slate-200">{rec.recommendedCtaText}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-300 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-800/50 font-medium">
                      💡 <strong>Por qué funciona:</strong> {rec.whyThisWorks}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
