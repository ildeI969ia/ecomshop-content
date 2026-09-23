import { spawn, ChildProcess } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { IAgentProvider } from "./agent-provider";
import { sanitizeEnvironmentForAgent } from "./security";

export interface AntigravityPythonProviderOptions {
  pythonPath?: string;
  runnerScriptPath?: string;
  timeoutMs?: number;
  maxBufferBytes?: number;
  model?: string;
  project?: string;
  location?: string;
}

export interface RunnerResponseEvent {
  type: "result" | "error";
  success: boolean;
  text?: string;
  conversationId?: string;
  runId?: string;
  taskId?: string;
  errorType?: string;
  message?: string;
}

/**
 * Busca de forma segura una ruta ejecutable de Python compatible.
 */
export function resolvePythonExecutable(preferredPath?: string): string {
  if (preferredPath && fs.existsSync(preferredPath)) {
    return preferredPath;
  }

  // 1. Variable de entorno explícita (validando que sea un ejecutable python legítimo)
  if (process.env.ANTIGRAVITY_PYTHON && fs.existsSync(process.env.ANTIGRAVITY_PYTHON)) {
    const baseName = path.basename(process.env.ANTIGRAVITY_PYTHON).toLowerCase();
    if (baseName === "python.exe" || baseName === "python" || baseName === "python3" || baseName === "python3.exe") {
      return process.env.ANTIGRAVITY_PYTHON;
    }
  }

  // 2. Virtualenv temporal verificado con google-antigravity
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const defaultVenvWin = path.join(home, ".antigravity-sdk-test", "venv", "Scripts", "python.exe");
  if (defaultVenvWin && fs.existsSync(defaultVenvWin)) {
    return defaultVenvWin;
  }

  // 3. Fallback al Python del sistema
  return "python";
}

/**
 * Proveedor real de agentes basado en el SDK oficial google-antigravity.
 * Implementa la interfaz IAgentProvider existente sin alterar el contrato.
 */
export class AntigravityPythonSdkProvider implements IAgentProvider {
  private pythonPath: string;
  private runnerScriptPath: string;
  private timeoutMs: number;
  private maxBufferBytes: number;
  private model: string;
  private project: string;
  private location: string;

  constructor(options: AntigravityPythonProviderOptions = {}) {
    this.pythonPath = resolvePythonExecutable(options.pythonPath);
    this.runnerScriptPath =
      options.runnerScriptPath ??
      path.resolve(process.cwd(), "scripts", "agent-runner.py");
    this.timeoutMs = options.timeoutMs ?? 180000; // 3 minutos para inferencia y generación
    this.maxBufferBytes = options.maxBufferBytes ?? 1024 * 1024; // 1 MB
    this.model = options.model ?? "gemini-2.5-flash";
    this.project = options.project ?? process.env.GOOGLE_CLOUD_PROJECT ?? "ecomshop-marketing-prod";
    this.location = options.location ?? process.env.GOOGLE_CLOUD_REGION ?? "us-central1";
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, runId, workspacePath, prompt } = manifest;

    // Verificar si el SDK está habilitado administrativamente
    const isEnabled = process.env.ANTIGRAVITY_SDK_ENABLED === "true";
    if (!isEnabled) {
      return {
        taskId,
        exitCode: 1,
        stdout: "",
        stderr: "ANTIGRAVITY_SDK_DISABLED: Provider execution refused because ANTIGRAVITY_SDK_ENABLED is not 'true'",
        timedOut: false,
        summary: `Ejecución rechazada: ANTIGRAVITY_SDK_ENABLED está desactivado`
      };
    }

    if (!fs.existsSync(this.runnerScriptPath)) {
      return {
        taskId,
        exitCode: 1,
        stdout: "",
        stderr: `Runner script not found: ${this.runnerScriptPath}`,
        timedOut: false,
        summary: `Error de configuración: agent-runner.py no encontrado`
      };
    }

    const payload = {
      prompt,
      cwd: workspacePath,
      systemInstructions: `Eres un agente de marketing técnico de EcomShop. Tu rol es ${manifest.agentRole}. Produce respuestas estructuradas sin inventar especificaciones no verificadas.`,
      runId,
      taskId,
      model: this.model,
      vertex: true,
      project: this.project,
      location: this.location
    };

    const cleanEnv = sanitizeEnvironmentForAgent(process.env, {
      ORCHESTRATOR_RUN_ID: runId,
      ORCHESTRATOR_TASK_ID: taskId,
      ORCHESTRATOR_ENV: manifest.environment,
      GOOGLE_CLOUD_PROJECT: this.project,
      GOOGLE_CLOUD_REGION: this.location
    });

    return new Promise<AgentExecutionResult>((resolve) => {
      let stdoutAcc = "";
      let stderrAcc = "";
      let isTimedOut = false;

      // Invocación segura sin shell (shell: false)
      const child: ChildProcess = spawn(this.pythonPath, [this.runnerScriptPath], {
        cwd: workspacePath,
        shell: false,
        env: cleanEnv as NodeJS.ProcessEnv
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        child.kill("SIGKILL");
      }, this.timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        if (stdoutAcc.length < this.maxBufferBytes) {
          stdoutAcc += chunk.toString("utf8");
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        if (stderrAcc.length < this.maxBufferBytes) {
          stderrAcc += chunk.toString("utf8");
        }
      });

      child.on("close", (code: number | null) => {
        clearTimeout(timer);

        // Procesar salida JSONL
        let resultText = stdoutAcc.trim();
        let parsedResult: RunnerResponseEvent | null = null;

        const lines = stdoutAcc.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as RunnerResponseEvent;
            if (parsed.type === "result" || parsed.type === "error") {
              parsedResult = parsed;
              break;
            }
          } catch {
            // Ignorar líneas no JSON si las hubiera
          }
        }

        const effectiveExitCode = code ?? (isTimedOut ? -1 : 1);
        const success = effectiveExitCode === 0 && parsedResult?.success === true;

        resolve({
          taskId,
          exitCode: success ? 0 : (effectiveExitCode === 0 ? 1 : effectiveExitCode),
          stdout: parsedResult?.text ?? resultText,
          stderr: parsedResult?.message ? `${stderrAcc}\n[RunnerError]: ${parsedResult.message}` : stderrAcc,
          timedOut: isTimedOut,
          filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
          summary: success
            ? `Agente Antigravity completó tarea ${taskId} (conversation: ${parsedResult?.conversationId ?? "local"})`
            : `Fallo en ejecución de agente para tarea ${taskId}`
        });
      });

      child.on("error", (err: Error) => {
        clearTimeout(timer);
        resolve({
          taskId,
          exitCode: 1,
          stdout: stdoutAcc,
          stderr: `${stderrAcc}\n[SpawnError]: ${err.message}`,
          timedOut: false,
          summary: `Error al invocar Python runner para tarea ${taskId}`
        });
      });

      // Escribir payload JSON en stdin con codificación UTF-8 estricta
      child.stdin?.setDefaultEncoding("utf8");
      child.stdin?.write(JSON.stringify(payload) + "\n", "utf8");
      child.stdin?.end();
    });
  }
}
