import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface WorktreeCreationOptions {
  runId: string;
  taskId: string;
  baseCommit: string;
}

export interface WorktreeInstance {
  runId: string;
  taskId: string;
  branchName: string;
  worktreePath: string;
  baseCommit: string;
  createdAt: number;
}

export class WorktreeManager {
  private repoRoot: string;
  private worktreesBaseDir: string;

  constructor(repoRoot: string = process.cwd()) {
    this.repoRoot = path.resolve(repoRoot);
    // Siguiendo WORKTREE_GUIDE.md y wt.ps1:
    // Vive en un directorio hermano '.worktrees' del repositorio
    const parentDir = path.dirname(this.repoRoot);
    this.worktreesBaseDir = path.join(parentDir, ".worktrees");
  }

  public getWorktreesBaseDir(): string {
    return this.worktreesBaseDir;
  }

  private cleanBranchName(name: string): string {
    return name.replace(/[\\/]/g, "-").replace(/^-+|-+$/g, "");
  }

  /**
   * Crea un worktree aislado para una tarea garantizando que parte del baseCommit.
   */
  public async createWorktree(options: WorktreeCreationOptions): Promise<WorktreeInstance> {
    const { runId, taskId, baseCommit } = options;
    const branchName = `agent/${this.cleanBranchName(runId)}/${this.cleanBranchName(taskId)}`;
    const folderName = `agent-${this.cleanBranchName(runId)}-${this.cleanBranchName(taskId)}`;
    const targetPath = path.join(this.worktreesBaseDir, folderName);

    // Asegurar directorio base de worktrees
    await fs.mkdir(this.worktreesBaseDir, { recursive: true });

    if (fsSync.existsSync(targetPath)) {
      throw new Error(`El directorio de worktree ya existe: ${targetPath}`);
    }

    // 1. git worktree add -b <branchName> <targetPath> <baseCommit>
    try {
      await execFileAsync("git", ["worktree", "add", "-b", branchName, targetPath, baseCommit], {
        cwd: this.repoRoot
      });
    } catch (err: unknown) {
      throw new Error(`Fallo al crear git worktree para ${taskId} desde baseCommit ${baseCommit}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Enlazar node_modules mediante junction NTFS (idéntico a wt.ps1) si existe en repo principal
    const mainNodeModules = path.join(this.repoRoot, "node_modules");
    const targetNodeModules = path.join(targetPath, "node_modules");
    if (fsSync.existsSync(mainNodeModules) && !fsSync.existsSync(targetNodeModules)) {
      try {
        await fs.symlink(mainNodeModules, targetNodeModules, "junction");
      } catch (linkErr) {
        console.warn(`[WorktreeManager] No se pudo crear junction de node_modules para ${taskId}:`, linkErr);
      }
    }

    // 3. SEGURIDAD CRÍTICA (F6 / Multi-Agent Execution Plane):
    // PROHIBIDO copiar o exponer .env.local a worktrees de agentes.
    // Ningún secreto del repositorio principal debe quedar físicamente accesible al agente.
    // La configuración requerida para la tarea se suministra exclusivamente vía environment allowlist.
    const targetEnvLocal = path.join(targetPath, ".env.local");
    if (fsSync.existsSync(targetEnvLocal)) {
      try {
        await fs.rm(targetEnvLocal, { force: true });
      } catch {
        // Ignorar si no existe
      }
    }

    return {
      runId,
      taskId,
      branchName,
      worktreePath: targetPath,
      baseCommit,
      createdAt: Date.now()
    };
  }

  /**
   * Elimina de forma segura un worktree y desvincula junctions sin tocar el repo original.
   */
  public async removeWorktree(instance: WorktreeInstance): Promise<void> {
    const { worktreePath, branchName } = instance;

    if (!fsSync.existsSync(worktreePath)) {
      return;
    }

    // 1. Desvincular junction de node_modules de forma segura (sin borrar el original)
    const targetNodeModules = path.join(worktreePath, "node_modules");
    if (fsSync.existsSync(targetNodeModules)) {
      try {
        await fs.unlink(targetNodeModules);
      } catch {
        // En Windows rmdir desvincula junction si unlink falla
        try {
          await execFileAsync("cmd.exe", ["/c", "rmdir", targetNodeModules]);
        } catch {
          // Omitir si ya fue desvinculado
        }
      }
    }

    // 2. git worktree remove --force <targetPath>
    try {
      await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: this.repoRoot
      });
      await execFileAsync("git", ["worktree", "prune"], { cwd: this.repoRoot });
    } catch (wtErr) {
      console.warn(`[WorktreeManager] Advertencia en git worktree remove para ${worktreePath}:`, wtErr);
    }

    // 3. Eliminar rama temporal si existe
    try {
      await execFileAsync("git", ["branch", "-D", branchName], { cwd: this.repoRoot });
    } catch {
      // Ignorar si la rama no existe
    }

    // 4. Limpieza de directorio residual si quedó algún archivo
    if (fsSync.existsSync(worktreePath)) {
      try {
        await fs.rm(worktreePath, { recursive: true, force: true });
      } catch {
        // Ignorar si el sistema de archivos ya lo liberó
      }
    }
  }
}
