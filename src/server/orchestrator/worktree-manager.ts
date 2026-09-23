import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

export interface WorktreeHandle {
  taskId: string;
  branch: string;
  path: string;
}

export interface WorktreeManagerOptions {
  repoRoot: string;
  worktreesRoot?: string;
  baseRef?: string;
}

export class GitWorktreeManager {
  private readonly worktreesRoot: string;
  private readonly baseRef: string;

  constructor(private readonly options: WorktreeManagerOptions) {
    this.worktreesRoot = resolve(options.worktreesRoot ?? join(options.repoRoot, ".worktrees"));
    this.baseRef = options.baseRef ?? "main";
  }

  async create(taskId: string, runId: string): Promise<WorktreeHandle> {
    const suffix = runId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 16);
    const branch = `orchestrator/${taskId.toLowerCase()}-${suffix}`;
    const path = join(this.worktreesRoot, `${taskId.toLowerCase()}-${suffix}`);
    await this.git(["worktree", "add", "-b", branch, path, this.baseRef]);
    return { taskId, branch, path };
  }

  async remove(handle: WorktreeHandle): Promise<void> {
    await this.git(["worktree", "remove", "--force", handle.path]);
    await this.git(["branch", "-D", handle.branch]).catch(() => undefined);
  }

  private git(args: string[]): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn("git", args, { cwd: this.options.repoRoot, stdio: ["ignore", "pipe", "pipe"], shell: false });
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.once("error", reject);
      child.once("close", (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(`GIT_WORKTREE_FAILED: git ${args.join(" ")}: ${stderr.trim()}`));
      });
    });
  }
}
