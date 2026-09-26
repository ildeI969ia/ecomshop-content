/**
 * Tipos Canónicos Unificados para el Multi-Agent Orchestrator (Control Plane + Execution Plane).
 */

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
  | "integration"
  | (string & {});

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

export type TaskRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type OrchestratorEnvironment = "AUDIT" | "DEVELOPMENT" | "PRODUCTION";

export type FailureType =
  | "TRANSIENT_FAILURE"
  | "PERMANENT_FAILURE"
  | "VALIDATION_FAILURE"
  | "APPROVAL_REQUIRED";

export type SensitiveActionType =
  | "cloudrun.deploy"
  | "iam.change"
  | "secretmanager.change"
  | "firestore.rules.change"
  | "gcs.policy.change"
  | "auth.change";

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
  objective?: string;
  ownerAgent?: string;
  agentRole?: AgentRole;
  mode?: "READ_ONLY" | "WRITE";
  dependencies: string[];
  filesAllowed: string[];
  filesForbidden: string[];
  parallelism?: Parallelism;
  risk?: TaskRisk;
  validation?: string[];
  sensitiveAction?: SensitiveActionType;
  expectedArtifacts?: string[];
  maxRetries?: number;
}

export interface TaskLease {
  taskId: string;
  runId: string;
  agentId: string;
  acquiredAt: number;
  expiresAt: number;
  ttlMs: number;
}

export interface TaskState extends TaskDefinition {
  status: TaskStatus;
  startedAt?: string;
  finishedAt?: string;
  commit?: string;
  commitSha?: string;
  error?: string;
  lastError?: string;
  attempts?: number;
  lastFailureType?: FailureType;
  nextAttemptAt?: number;
  lease?: TaskLease;
  assignedWorktreePath?: string;
}

export type OrchestrationTask = TaskState;

export interface Artifact {
  id: string;
  taskId: string;
  type: "REPORT" | "CODE" | "TEST" | "DECISION" | "BUILD" | "OTHER";
  path?: string;
  summary: string;
  createdAt: string;
}

export interface ApprovalRecord {
  approvalId: string;
  runId: string;
  action: SensitiveActionType;
  requestedBy: string;
  approver?: string;
  status: "PENDING" | "GRANTED" | "REJECTED";
  requestedAt: string;
  resolvedAt?: string;
  reason?: string;
}

export interface OrchestrationPlan {
  id: string;
  runId: string;
  objective?: string;
  requestedBy: string;
  createdAt: string;
  baseCommit: string;
  environment: OrchestratorEnvironment;
  provider: string;
  maxConcurrentAgents?: number;
  tasks: TaskState[];
  artifacts: (Artifact | string)[];
}

export interface AgentExecutionManifest {
  runId: string;
  taskId: string;
  agentRole: string;
  workspacePath: string;
  baseCommit: string;
  environment: OrchestratorEnvironment;
  filesAllowed: string[];
  filesForbidden: string[];
  prompt: string;
  payload?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  artifactsProduced?: string[];
  filesChanged?: string[];
  commitSha?: string;
  summary?: string;
  actualModel?: string;
  fallbackUsed?: boolean;
  usageMetadata?: {
    promptTokenCount?: number | null;
    candidatesTokenCount?: number | null;
    totalTokenCount?: number | null;
    thoughtsTokenCount?: number | null;
    cachedContentTokenCount?: number | null;
  };
}

export type OrchestrationEventType =
  | "TASK_CLAIMED"
  | "WORKTREE_CREATED"
  | "AGENT_STARTED"
  | "AGENT_FINISHED"
  | "VALIDATION_STARTED"
  | "VALIDATION_PASSED"
  | "VALIDATION_FAILED"
  | "TASK_RETRY"
  | "TASK_FAILED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED"
  | "WORKTREE_CLEANED";

export interface StructuredEvent {
  timestamp: string;
  runId: string;
  taskId: string;
  eventType: OrchestrationEventType;
  details?: Record<string, unknown>;
}
