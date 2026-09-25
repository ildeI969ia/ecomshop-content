"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { ShieldAlert, Terminal, RefreshCw, FileText, CheckCircle2 } from "lucide-react";

export default function SystemLogsPage() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/orchestration/runs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.runs || ["No hay ejecuciones registradas en el orquestador."]);
      } else {
        setLogs(["Error al obtener registros de ejecuciones."]);
      }
    } catch {
      setLogs(["Error de conexión con el servicio de registros."]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchLogs();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h2 className="mt-3 text-lg font-bold">Acceso Denegado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección está restringida únicamente a usuarios con rol ADMINISTRADOR.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registros del Sistema (System Logs)</h1>
          <p className="text-sm text-muted-foreground">Trazas de ejecución de Batch Runner y depuración de Cloud Run</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition hover:bg-accent"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar logs
        </button>
      </div>

      <div className="rounded-xl border border-border bg-sidebar p-4 font-mono text-xs text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border pb-3 text-sidebar-foreground/60">
          <Terminal className="size-4 text-primary" />
          <span>Console Output / Orchestrator Tail</span>
        </div>
        <pre className="mt-4 max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-emerald-400">
          {logs.length > 0 ? logs.join("\n") : "Esperando trazas..."}
        </pre>
      </div>
    </div>
  );
}
