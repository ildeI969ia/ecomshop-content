import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fsSync from "node:fs";
import path from "node:path";
import { AgentExecutionResult, OrchestrationTask } from "./types";

const execFileAsync = promisify(execFile);

export interface ValidationGateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationGate {
  /**
   * Ejecuta la compuerta de validación independiente para una tarea ejecutada en su worktree.
   */
  public async validate(
    task: OrchestrationTask,
    result: AgentExecutionResult,
    worktreePath: string
  ): Promise<ValidationGateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validar exit code
    if (result.exitCode !== 0) {
      errors.push(`El agente finalizó con código de salida no nulo: ${result.exitCode}`);
    }

    if (result.timedOut) {
      errors.push(`La ejecución del agente excedió el tiempo límite (timeout)`);
    }

    // 2. Si el worktree no existe físicamente, abortar con error
    if (!fsSync.existsSync(worktreePath)) {
      errors.push(`El directorio de worktree no existe: ${worktreePath}`);
      return { valid: false, errors, warnings };
    }

    // 3. Inspeccionar git status y git diff en el worktree
    let changedFiles: string[] = [];
    try {
      const { stdout: statusOut } = await execFileAsync("git", ["status", "--porcelain"], {
        cwd: worktreePath
      });
      changedFiles = statusOut
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 2 && !l.includes(".agent-output") && !l.includes(".orchestrator") && !l.includes("backups/"))
        .map((l) => l.substring(2).trim());
    } catch (gitErr) {
      warnings.push(`No se pudo obtener git status en worktree: ${String(gitErr)}`);
    }

    // 4. Si la tarea es READ_ONLY, prohibir cualquier modificación de archivos
    if (task.mode === "READ_ONLY" && changedFiles.length > 0) {
      errors.push(`La tarea ${task.id} es de tipo READ_ONLY pero modificó archivos: ${changedFiles.join(", ")}`);
    }

    // 5. Validar que no existan archivos modificados fuera de filesAllowed
    if (task.mode === "WRITE" && task.filesAllowed.length > 0 && !task.filesAllowed.includes("*")) {
      for (const file of changedFiles) {
        const isAllowed = task.filesAllowed.some((pattern) => {
          if (pattern.endsWith("/**")) {
            const prefix = pattern.slice(0, -3);
            return file.startsWith(prefix);
          }
          return file === pattern;
        });

        if (!isAllowed) {
          errors.push(`Archivo modificado fuera del scope permitido (${file}) en tarea ${task.id}`);
        }
      }
    }

    // 6. Validar git diff --check para detectar espacios en blanco o conflictos residuales
    try {
      await execFileAsync("git", ["diff", "--check"], { cwd: worktreePath });
    } catch (diffErr) {
      errors.push(`Fallo en git diff --check: ${String(diffErr)}`);
    }

    // 7. Validar artefactos esperados si se declararon
    if (task.expectedArtifacts && task.expectedArtifacts.length > 0) {
      for (const art of task.expectedArtifacts) {
        const artPath = path.isAbsolute(art) ? art : path.join(worktreePath, art);
        if (!fsSync.existsSync(artPath)) {
          errors.push(`Artefacto esperado ausente: ${art}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
