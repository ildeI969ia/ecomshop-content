export type AgentRole =
  | "orchestrator"
  | "repository-analyst"
  | "backend"
  | "frontend"
  | "security"
  | "infrastructure"
  | "catalog"
  | "ai-marketing"
  | "qa"
  | "code-review"
  | "integration";

export type TaskStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "BLOCKED"
  | "FAILED"
  | "REVIEW"
  | "VALIDATED"
  | "INTEGRATED"
  | "REJECTED";

export type Parallelism = "GREEN" | "YELLOW" | "RED";

export interface AgentDefinition {
  id: string;
  role: AgentRole;
  displayName: string;
  capabilities: string[];
  maxConcurrency: number;
}

export interface TaskDefinition {
  id: string;
  title: string;
  objective: string;
  ownerAgent: string;
  dependencies: string[];
  filesAllowed: string[];
  filesForbidden: string[];
  parallelism: Parallelism;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  validation: string[];
}

export interface AgentLease {
  taskId: string;
  agentId: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatAt: string;
}

export interface TaskState extends TaskDefinition {
  status: TaskStatus;
  startedAt?: string;
  finishedAt?: string;
  commit?: string;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  nextAttemptAt?: string;
  lease?: AgentLease;
}

export interface Artifact {
  id: string;
  taskId: string;
  type: "REPORT" | "CODE" | "TEST" | "DECISION" | "BUILD" | "OTHER";
  path?: string;
  summary: string;
  createdAt: string;
}

export interface OrchestrationPlan {
  id: string;
  objective: string;
  createdAt: string;
  maxConcurrentAgents: number;
  tasks: TaskState[];
  artifacts: Artifact[];
}
