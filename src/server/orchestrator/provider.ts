import type { OrchestrationPlan, TaskState } from "./types";

export interface AgentExecutionContext {
  runId: string;
  workspacePath: string;
  environment: "audit" | "development" | "production";
}

export interface AgentProvider {
  readonly id: string;
  execute(task: TaskState, plan: OrchestrationPlan, context: AgentExecutionContext): Promise<{
    summary: string;
    artifacts?: OrchestrationPlan["artifacts"];
    commit?: string;
  }>;
}

export interface CommandAgentProviderOptions {
  executable: string;
  baseArgs?: string[];
  timeoutMs?: number;
  cwd?: string;
}

export class CommandAgentProvider implements AgentProvider {
  readonly id = "command";

  constructor(private readonly options: CommandAgentProviderOptions) {}

  async execute(task: TaskState, plan: OrchestrationPlan, context: AgentExecutionContext) {
    const { spawn } = await import("node:child_process");
    const args = [
      ...(this.options.baseArgs ?? []),
      "--run-id", plan.id,
      "--task-id", task.id,
      "--task-objective", task.objective,
      "--workspace", context.workspacePath,
    ];
    return new Promise<{ summary: string }>((resolve, reject) => {
      const child = spawn(this.options.executable, args, {
        cwd: this.options.cwd ?? context.workspacePath,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`AGENT_PROVIDER_TIMEOUT: ${task.id}`));
      }, this.options.timeoutMs ?? 30 * 60_000);
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`AGENT_PROVIDER_FAILED:${task.id}:exit=${code}: ${stderr.slice(-4000)}`));
          return;
        }
        resolve({ summary: stdout.trim() || `Agent ${task.ownerAgent} completed ${task.id}` });
      });
    });
  }
}
