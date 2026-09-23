import { randomUUID } from "node:crypto";
import { assertPlanIntegrity } from "./scheduler";
import type { OrchestrationPlan, TaskDefinition, TaskState } from "./types";

export function buildF6AuditPlan(): OrchestrationPlan {
  const task = (value: TaskDefinition): TaskState => ({ ...value, status: "PENDING" });
  const tasks: TaskState[] = [
    { id: "F6-A", title: "Security and authentication audit", objective: "Audit middleware, sessions, credentials and protected routes without modifying code.", ownerAgent: "security", dependencies: [], filesAllowed: ["src/middleware.ts", "src/server/security/**", "src/app/api/**"], filesForbidden: ["package.json", "cloudbuild.yaml", "firestore.rules"], parallelism: "GREEN", risk: "HIGH", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-B", title: "Cloud Run infrastructure audit", objective: "Audit revision, traffic, service account, invoker and runtime configuration.", ownerAgent: "infrastructure", dependencies: [], filesAllowed: [], filesForbidden: ["**"], parallelism: "GREEN", risk: "HIGH", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-C", title: "IAM and Secret Manager audit", objective: "Identify excessive roles and secret configuration requirements without changing infrastructure.", ownerAgent: "security", dependencies: [], filesAllowed: [], filesForbidden: ["**"], parallelism: "GREEN", risk: "CRITICAL", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-D", title: "Firestore isolation audit", objective: "Audit server/client access and workspace isolation.", ownerAgent: "security", dependencies: [], filesAllowed: ["firestore.rules", "src/server/repositories/**"], filesForbidden: ["package.json"], parallelism: "GREEN", risk: "CRITICAL", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-E", title: "GCS security audit", objective: "Audit bucket access, public URLs and service-account permissions without changing policy.", ownerAgent: "infrastructure", dependencies: [], filesAllowed: [], filesForbidden: ["**"], parallelism: "GREEN", risk: "HIGH", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-F", title: "Silent failure audit", objective: "Find swallowed persistence and API errors and classify them.", ownerAgent: "backend", dependencies: [], filesAllowed: ["src/server/**", "src/app/api/**"], filesForbidden: ["package.json", "cloudbuild.yaml"], parallelism: "GREEN", risk: "MEDIUM", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-G", title: "CI and quality-gate audit", objective: "Audit workflows and existing validation commands.", ownerAgent: "qa", dependencies: [], filesAllowed: [".github/**", "package.json"], filesForbidden: ["src/**"], parallelism: "GREEN", risk: "MEDIUM", validation: ["audit-report"], status: "PENDING" },
    { id: "F6-H", title: "Architecture dependency audit", objective: "Identify shared contracts and files that would prevent safe parallel implementation.", ownerAgent: "repository-analyst", dependencies: [], filesAllowed: ["src/**", "package.json"], filesForbidden: ["cloudbuild.yaml", "firestore.rules"], parallelism: "GREEN", risk: "MEDIUM", validation: ["audit-report"], status: "PENDING" },
  ];
  assertPlanIntegrity(tasks);
  return { id: randomUUID(), objective: "F6 security and hardening audit", createdAt: new Date().toISOString(), maxConcurrentAgents: 6, tasks };
}
