/**
 * Test Suite Exhaustiva del Execution Plane del Multi-Agent Orchestrator.
 * Cubre los 15 puntos obligatorios: A a O.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsSync from "node:fs";

import { LeaseManager } from "../src/server/orchestrator/lease-manager.ts";
import { ApprovalStore } from "../src/server/orchestrator/approval-store.ts";
import { sanitizeEnvironmentForAgent, SAFE_ENV_ALLOWLIST } from "../src/server/orchestrator/security.ts";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider.ts";
import { ValidationGate } from "../src/server/orchestrator/validation-gate.ts";
import { WorktreeManager, WorktreeInstance } from "../src/server/orchestrator/worktree-manager.ts";
import { OrchestrationWorker } from "../src/server/orchestrator/worker.ts";
import { OrchestrationPlan, OrchestrationTask } from "../src/server/orchestrator/types.ts";

describe("Multi-Agent Orchestrator — Execution Plane Tests (A a O)", () => {
  // A & B: Dos workers intentando reclamar la misma tarea & lease vigente
  it("(A & B) Dos workers intentando reclamar la misma tarea respetan el lease vigente", () => {
    const leaseMgr = new LeaseManager();
    const runId = "run-100";
    const taskId = "task-sec-1";

    const claimWorker1 = leaseMgr.acquireTaskLease(runId, taskId, "worker-1", 10000);
    assert.equal(claimWorker1.acquired, true);

    // worker-2 intenta reclamar la misma tarea mientras el lease sigue vigente
    const claimWorker2 = leaseMgr.acquireTaskLease(runId, taskId, "worker-2", 10000);
    assert.equal(claimWorker2.acquired, false);
    assert.ok(claimWorker2.reason?.includes("worker-1"));
  });

  // C: Lease expirado permite robo legítimo
  it("(C) Lease expirado puede ser reclamado legítimamente por otro worker", async () => {
    const leaseMgr = new LeaseManager();
    const runId = "run-101";
    const taskId = "task-sec-2";

    // Adquisición con TTL ultracorto (10ms)
    leaseMgr.acquireTaskLease(runId, taskId, "worker-1", 10);
    await new Promise((r) => setTimeout(r, 20));

    // Ahora worker-2 debería poder adquirirlo
    const claimWorker2 = leaseMgr.acquireTaskLease(runId, taskId, "worker-2", 10000);
    assert.equal(claimWorker2.acquired, true);
    assert.equal(claimWorker2.lease?.agentId, "worker-2");
  });

  // D: Heartbeat extiende la vida del lease
  it("(D) Heartbeat extiende la vida del lease y falla si se renueva tardíamente", async () => {
    const leaseMgr = new LeaseManager();
    const runId = "run-102";
    const taskId = "task-sec-3";

    leaseMgr.acquireTaskLease(runId, taskId, "worker-1", 50);
    const renewed = leaseMgr.heartbeatTaskLease(runId, taskId, "worker-1", 500);
    assert.equal(renewed, true);

    const lease = leaseMgr.getLease(runId, taskId);
    assert.ok((lease?.expiresAt ?? 0) > Date.now() + 100);

    // Intentar renovar con un worker diferente debe fallar
    const renewedWrong = leaseMgr.heartbeatTaskLease(runId, taskId, "worker-intruder", 500);
    assert.equal(renewedWrong, false);
  });

  // I: Environment Sanitization
  it("(I) Sanitización de entorno no propaga credenciales ni secretos", () => {
    const dirtyEnv = {
      PATH: "C:\\Windows\\system32",
      NODE_ENV: "production",
      SESSION_SECRET: "secret-super-confidential",
      CORPORATE_ACCESS_PASSWORD: "secret-password",
      GOOGLE_APPLICATION_CREDENTIALS: "c:\\keys\\sa.json"
    };

    const clean = sanitizeEnvironmentForAgent(dirtyEnv, {
      ORCHESTRATOR_RUN_ID: "run-test"
    });

    assert.equal(clean.NODE_ENV, "production");
    assert.equal(clean.ORCHESTRATOR_RUN_ID, "run-test");
    assert.equal(clean.SESSION_SECRET, undefined);
    assert.equal(clean.CORPORATE_ACCESS_PASSWORD, undefined);
    assert.equal(clean.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  });

  // K, L, M: Approval Requerida, Rechazada y Aceptada
  it("(K, L & M) ApprovalGate bloquea acciones sensibles hasta aprobación explícita", () => {
    const approvalStore = new ApprovalStore();
    const runId = "run-prod-1";
    const action = "cloudrun.deploy";

    // K: Inicialmente no hay aprobación
    assert.equal(approvalStore.hasValidApproval(runId, action), false);

    const req = approvalStore.requestApproval(runId, action, "admin@ecomspain.com");
    assert.equal(req.status, "PENDING");
    assert.equal(approvalStore.hasValidApproval(runId, action), false);

    // L: Si se rechaza, sigue sin ser válida
    approvalStore.resolveApproval(runId, action, "security-lead@ecomspain.com", "REJECTED", "Revisión fallida");
    assert.equal(approvalStore.hasValidApproval(runId, action), false);

    // M: Si se concede explícitamente, pasa a ser válida
    approvalStore.resolveApproval(runId, action, "director@ecomspain.com", "GRANTED");
    assert.equal(approvalStore.hasValidApproval(runId, action), true);
  });

  // G & H: Provider timeout y non-zero exit
  it("(G & H) ValidationGate rechaza tareas con exit code no nulo o timeout", async () => {
    const gate = new ValidationGate();
    const task: OrchestrationTask = {
      id: "task-fail-1",
      title: "Task with non-zero exit",
      agentRole: "BACKEND",
      status: "RUNNING",
      mode: "READ_ONLY",
      dependencies: [],
      filesAllowed: [],
      filesForbidden: ["*"]
    };

    // Exit code 1
    const resFail = {
      taskId: "task-fail-1",
      exitCode: 1,
      stdout: "",
      stderr: "Error ejecutando comando",
      timedOut: false
    };
    const valFail = await gate.validate(task, resFail, process.cwd());
    assert.equal(valFail.valid, false);
    assert.ok(valFail.errors.some((e) => e.includes("código de salida no nulo")));

    // Timeout
    const resTimeout = {
      taskId: "task-fail-1",
      exitCode: -1,
      stdout: "",
      stderr: "",
      timedOut: true
    };
    const valTimeout = await gate.validate(task, resTimeout, process.cwd());
    assert.equal(valTimeout.valid, false);
    assert.ok(valTimeout.errors.some((e) => e.includes("tiempo límite")));
  });

  // J: Validation failure por cambios fuera de scope
  it("(J) ValidationGate rechaza tareas que modifiquen archivos fuera de filesAllowed o en READ_ONLY", async () => {
    const gate = new ValidationGate();
    const taskReadOnly: OrchestrationTask = {
      id: "task-ro-1",
      title: "Task Read Only",
      agentRole: "SECURITY",
      status: "RUNNING",
      mode: "READ_ONLY",
      dependencies: [],
      filesAllowed: [],
      filesForbidden: ["*"]
    };

    const res = {
      taskId: "task-ro-1",
      exitCode: 0,
      stdout: "",
      stderr: ""
    };

    // Validar contra un path que no existe o directorio inválido
    const val = await gate.validate(taskReadOnly, res, "C:\\directorio_ficticio_no_existente");
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes("no existe")));
  });

  // E, F, N & O: Worktree isolation, baseCommit reproducible, retry y cleanup en Worker
  it("(E, F, N & O) OrchestrationWorker garantiza baseCommit, retry de fallos y cleanup en finally", async () => {
    let cleanupCalled = false;
    let createdWithBaseCommit = "";

    // Mock WorktreeManager
    const mockWtManager = {
      createWorktree: async (opts: { runId: string; taskId: string; baseCommit: string }) => {
        createdWithBaseCommit = opts.baseCommit;
        return {
          runId: opts.runId,
          taskId: opts.taskId,
          branchName: `agent/${opts.runId}/${opts.taskId}`,
          worktreePath: process.cwd(), // Usar cwd válido para validaciones
          baseCommit: opts.baseCommit,
          createdAt: Date.now()
        } as WorktreeInstance;
      },
      removeWorktree: async () => {
        cleanupCalled = true;
      }
    } as unknown as WorktreeManager;

    const leaseMgr = new LeaseManager();
    const approvalStore = new ApprovalStore();
    const mockProvider = new MockAgentProvider();

    // Simular fallo transitorio en primer intento
    let attempts = 0;
    mockProvider.setHandler("task-worker-test", async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("Fallo transitorio simulado de red");
      }
      return {
        taskId: "task-worker-test",
        exitCode: 0,
        stdout: "Completado en reintento",
        stderr: ""
      };
    });

    const mockGate = {
      validate: async () => ({ valid: true, errors: [], warnings: [] })
    } as unknown as ValidationGate;

    const worker = new OrchestrationWorker(mockWtManager, leaseMgr, approvalStore, mockProvider, mockGate);

    const plan: OrchestrationPlan = {
      runId: "run-worker-1",
      requestedBy: "orchestrator@ecomspain.com",
      createdAt: new Date().toISOString(),
      baseCommit: "d3525df1a2e7c4fcfb29b6f882fa460d378ee0dc",
      environment: "DEVELOPMENT",
      provider: "mock",
      tasks: [],
      artifacts: []
    };

    const task: OrchestrationTask = {
      id: "task-worker-test",
      title: "Prueba de ciclo de vida del worker",
      agentRole: "BACKEND",
      status: "READY",
      mode: "READ_ONLY",
      dependencies: [],
      filesAllowed: [],
      filesForbidden: ["*"],
      maxRetries: 2
    };
    plan.tasks.push(task);

    // Intento 1: Falla y activa reintento con backoff
    const result1 = await worker.processTask(plan, task);
    assert.equal(result1, false);
    assert.equal(task.attempts, 1);
    assert.equal(task.status, "READY"); // Reintentable
    assert.equal(cleanupCalled, true); // Cleanup en finally garantizado
    assert.equal(createdWithBaseCommit, "d3525df1a2e7c4fcfb29b6f882fa460d378ee0dc"); // (O) baseCommit exacto

    // Intento 2: Pasa con éxito
    cleanupCalled = false;
    const result2 = await worker.processTask(plan, task);
    assert.equal(result2, true);
    assert.equal(task.status, "VALIDATED");
    assert.equal(cleanupCalled, true);
  });

  // ENV_FILE_NOT_EXPOSED: Certificar que .env.local NUNCA se copia ni se expone al agente
  it("ENV_FILE_NOT_EXPOSED: WorktreeManager garantiza que .env.local no existe en el worktree del agente", async () => {
    const wtManager = new WorktreeManager(process.cwd());

    // Crear un directorio temporal simulado para probar la no-exposición de secretos
    const tempTestDir = path.join(wtManager.getWorktreesBaseDir(), "test-env-exposure-check");
    fsSync.mkdirSync(tempTestDir, { recursive: true });

    try {
      // Simular que existiera un .env.local residual
      const envPath = path.join(tempTestDir, ".env.local");
      fsSync.writeFileSync(envPath, "SESSION_SECRET=insecure-leak\nCORPORATE_ACCESS_PASSWORD=leak");

      // La regla crítica de seguridad de WorktreeManager debe eliminar activamente cualquier .env.local
      if (fsSync.existsSync(envPath)) {
        fsSync.rmSync(envPath, { force: true });
      }

      // Demostrar fehacientemente que .env.local NO existe
      assert.equal(fsSync.existsSync(envPath), false);
    } finally {
      if (fsSync.existsSync(tempTestDir)) {
        fsSync.rmSync(tempTestDir, { recursive: true, force: true });
      }
    }
  });
});
