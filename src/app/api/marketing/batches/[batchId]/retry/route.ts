import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingPipelineEngine } from "@/server/orchestrator/marketing-pipeline";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { MockAgentProvider } from "@/server/orchestrator/agent-provider";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const repository = new MarketingRunRepository();

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    // Path structure: /api/marketing/batches/[batchId]/retry -> extract [batchId]
    const segments = url.pathname.split("/").filter(Boolean);
    const retryIdx = segments.indexOf("retry");
    const batchId = retryIdx > 0 ? segments[retryIdx - 1] : segments.pop();

    if (!batchId) {
      return NextResponse.json({ error: "batchId requerido" }, { status: 400 });
    }

    const existingBatch = await repository.findBatchById(batchId);

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch no encontrado" }, { status: 404 });
    }

    if (existingBatch.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        {
          status: "FORBIDDEN",
          code: "FORBIDDEN_WORKSPACE_MISMATCH",
          message: "No tiene permisos para modificar lotes de otro workspace"
        },
        { status: 403 }
      );
    }

    // Identificar los SKUs fallidos o bloqueados
    const failedSkus = Object.values(existingBatch.items)
      .filter((item) => item.status === "FAILED" || item.status === "BLOCKED")
      .map((item) => item.sku);

    if (failedSkus.length === 0) {
      return NextResponse.json(
        { message: "No hay SKUs fallidos o bloqueados para reintentar en este batch" },
        { status: 200 }
      );
    }

    let provider;
    if (process.env.NODE_ENV === "production" || process.env.ANTIGRAVITY_SDK_ENABLED === "true") {
      provider = new AntigravityTsProvider();
    } else {
      provider = new MockAgentProvider();
    }

    const engine = new MarketingPipelineEngine(provider);

    // Re-ejecutar solo los items fallidos
    const { batch: retryBatch, results } = await engine.executeBatch(
      failedSkus,
      {
        workspacePath: process.env.TEMP || process.env.TMPDIR || "/tmp",
        requestedBy: user.email,
        workspaceId: user.workspaceId || "default-ecomspain",
        organizationId: "org-ecomspain",
        provider
      }
    );

    // Combinar en el batch existente
    for (const [sku, item] of Object.entries(retryBatch.items)) {
      existingBatch.items[sku] = item as any;
    }

    existingBatch.updatedAt = new Date().toISOString();
    const allItems = Object.values(existingBatch.items);
    existingBatch.completedItems = allItems.filter((i) => i.status === "COMPLETED").length;
    existingBatch.failedItems = allItems.filter((i) => i.status === "FAILED").length;
    existingBatch.blockedItems = allItems.filter((i) => i.status === "BLOCKED").length;
    existingBatch.status =
      existingBatch.failedItems === 0 && existingBatch.blockedItems === 0
        ? "COMPLETED"
        : existingBatch.completedItems > 0
        ? "PARTIALLY_FAILED"
        : "FAILED";

    try {
      await repository.saveBatch(existingBatch);
      for (const res of results) {
        if (res.run) await repository.saveRun(res.run);
        if (res.package) await repository.savePackage(res.package);
      }
    } catch (dbErr: any) {
      console.error("[api/marketing/batches/retry] Fallo crítico de persistencia en Firestore:", dbErr);
      return NextResponse.json(
        {
          status: "PERSISTENCE_FAILED",
          error: "No se pudo actualizar la información en la base de datos",
          details: dbErr?.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      batch: existingBatch,
      reprocessedSkus: failedSkus
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
