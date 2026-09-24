import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { OrchestrationPlan, OrchestratorEnvironment } from "@/server/orchestrator/types";

const CreateRunSchema = z.object({
  environment: z.enum(["AUDIT", "DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),
  tasks: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      agentRole: z.string().min(1),
      mode: z.enum(["READ_ONLY", "WRITE"]).default("READ_ONLY"),
      dependencies: z.array(z.string()).default([]),
      filesAllowed: z.array(z.string()).default([]),
      filesForbidden: z.array(z.string()).default(["*"]),
      sensitiveAction: z.enum([
        "cloudrun.deploy",
        "iam.change",
        "secretmanager.change",
        "firestore.rules.change",
        "gcs.policy.change",
        "auth.change"
      ]).optional()
    })
  ).min(1),
  baseCommit: z.string().min(7).optional()
});

const activeRuns = new Map<string, OrchestrationPlan>();

export const POST = withAuthAndPermission("admin", async (req: NextRequest, user) => {
  try {
    const rawBody = await req.json();
    const parsed = CreateRunSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de creación de run inválido", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { environment, tasks, baseCommit } = parsed.data;

    if (environment === "PRODUCTION" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permiso denegado. Solo administradores pueden crear runs con target PRODUCTION" },
        { status: 403 }
      );
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectiveBaseCommit = baseCommit || "d3525df1a2e7c4fcfb29b6f882fa460d378ee0dc";

    const plan: OrchestrationPlan = {
      id: runId,
      runId,
      requestedBy: user.email,
      createdAt: new Date().toISOString(),
      baseCommit: effectiveBaseCommit,
      environment: environment as OrchestratorEnvironment,
      provider: "secure-process",
      tasks: tasks.map((t) => ({
        ...t,
        status: "READY",
        attempts: 0
      })),
      artifacts: []
    };

    activeRuns.set(runId, plan);

    return NextResponse.json({
      success: true,
      runId,
      environment,
      baseCommit: effectiveBaseCommit,
      tasksCount: plan.tasks.length,
      message: "Plan de orquestación registrado exitosamente en control plane. Sometido a Execution Gates."
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/orchestration/runs POST] Error:", err);
    return NextResponse.json({ error: "Fallo al crear el run", details: message }, { status: 500 });
  }
});

export const GET = withAuthAndPermission("finops:view", async () => {
  const runList = Array.from(activeRuns.values()).map((p) => ({
    runId: p.runId,
    requestedBy: p.requestedBy,
    createdAt: p.createdAt,
    environment: p.environment,
    baseCommit: p.baseCommit,
    totalTasks: p.tasks.length,
    validatedTasks: p.tasks.filter((t) => t.status === "VALIDATED").length
  }));

  return NextResponse.json({ runs: runList, total: runList.length });
});
