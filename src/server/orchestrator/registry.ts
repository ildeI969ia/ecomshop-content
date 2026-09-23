import type { AgentDefinition } from "./types";

export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  { id: "orchestrator", role: "orchestrator", displayName: "Lead Orchestrator", capabilities: ["planning", "dependencies", "conflicts", "integration"], maxConcurrency: 1 },
  { id: "repository-analyst", role: "repository-analyst", displayName: "Repository Analyst", capabilities: ["architecture", "dependencies", "coupling", "risk"], maxConcurrency: 2 },
  { id: "backend", role: "backend", displayName: "Backend Agent", capabilities: ["api", "services", "repositories", "firestore"], maxConcurrency: 2 },
  { id: "frontend", role: "frontend", displayName: "Frontend Agent", capabilities: ["react", "nextjs", "ui", "ux"], maxConcurrency: 2 },
  { id: "security", role: "security", displayName: "Security Agent", capabilities: ["auth", "sessions", "secrets", "iam", "rules"], maxConcurrency: 1 },
  { id: "infrastructure", role: "infrastructure", displayName: "Infrastructure Agent", capabilities: ["cloud-run", "gcs", "firebase", "cloud-build"], maxConcurrency: 1 },
  { id: "catalog", role: "catalog", displayName: "Catalog Agent", capabilities: ["sku", "product-identity", "catalog", "grounding"], maxConcurrency: 2 },
  { id: "ai-marketing", role: "ai-marketing", displayName: "AI Marketing Agent", capabilities: ["prompts", "grounding", "seo", "marketing"], maxConcurrency: 2 },
  { id: "qa", role: "qa", displayName: "QA Agent", capabilities: ["tests", "typecheck", "build", "regression"], maxConcurrency: 1 },
  { id: "code-review", role: "code-review", displayName: "Code Review Agent", capabilities: ["diff", "security", "typescript", "architecture"], maxConcurrency: 1 },
  { id: "integration", role: "integration", displayName: "Integration Agent", capabilities: ["merge", "conflicts", "validation"], maxConcurrency: 1 },
] as const;
