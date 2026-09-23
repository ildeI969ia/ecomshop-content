import { spawn, ChildProcess } from "node:child_process";
import { AgentExecutionManifest, AgentExecutionResult } from "./types";
import { sanitizeEnvironmentForAgent } from "./security";

export interface AgentProviderOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
  allowedExecutables?: Set<string>;
}

export interface IAgentProvider {
  execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult>;
}

export const DEFAULT_ALLOWED_EXECUTABLES = new Set([
  "node",
  "node.exe",
  "git",
  "git.exe",
  "npm",
  "npm.cmd",
  "npx",
  "npx.cmd"
]);

export class SecureProcessAgentProvider implements IAgentProvider {
  private timeoutMs: number;
  private maxBufferBytes: number;
  private allowedExecutables: Set<string>;

  constructor(options: AgentProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 120000;
    this.maxBufferBytes = options.maxBufferBytes ?? 512 * 1024; // 512 KB
    this.allowedExecutables = options.allowedExecutables ?? DEFAULT_ALLOWED_EXECUTABLES;
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const { taskId, workspacePath } = manifest;

    // Ejecutable predeterminado seguro para invocación de tareas estructuradas
    const command = "node";
    if (!this.allowedExecutables.has(command)) {
      throw new Error(`Ejecutable no autorizado en la allowlist de seguridad: ${command}`);
    }

    const cleanEnv = sanitizeEnvironmentForAgent(process.env, {
      ORCHESTRATOR_RUN_ID: manifest.runId,
      ORCHESTRATOR_TASK_ID: manifest.taskId,
      ORCHESTRATOR_ENV: manifest.environment
    });

    return new Promise<AgentExecutionResult>((resolve) => {
      let stdoutAcc = "";
      let stderrAcc = "";
      let isTimedOut = false;

      // Invocación con shell=false estricto y cwd explícito
      const child: ChildProcess = spawn(command, ["-e", "console.log('AGENT_MANIFEST_READY');"], {
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
        resolve({
          taskId,
          exitCode: code ?? (isTimedOut ? -1 : 1),
          stdout: stdoutAcc.slice(0, this.maxBufferBytes),
          stderr: stderrAcc.slice(0, this.maxBufferBytes),
          timedOut: isTimedOut,
          summary: `Ejecución de tarea ${taskId} completada con exitCode ${code}`
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
          summary: `Error al iniciar proceso para tarea ${taskId}`
        });
      });
    });
  }
}

/**
 * MockAgentProvider para desarrollo seguro y pruebas unitarias sin dependencias externas.
 */
export class MockAgentProvider implements IAgentProvider {
  private customHandlers: Map<string, (manifest: AgentExecutionManifest) => Promise<AgentExecutionResult>> = new Map();

  public setHandler(taskId: string, handler: (manifest: AgentExecutionManifest) => Promise<AgentExecutionResult>): void {
    this.customHandlers.set(taskId, handler);
  }

  public async execute(manifest: AgentExecutionManifest): Promise<AgentExecutionResult> {
    const handler = this.customHandlers.get(manifest.taskId);
    if (handler) {
      return handler(manifest);
    }

    return {
      taskId: manifest.taskId,
      exitCode: 0,
      stdout: `[MockAgent] Tarea ${manifest.taskId} completada con éxito`,
      stderr: "",
      timedOut: false,
      filesChanged: manifest.filesAllowed.length > 0 ? [manifest.filesAllowed[0]] : [],
      summary: `Mock completion for ${manifest.taskId}`
    };
  }
}
