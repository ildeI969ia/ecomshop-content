import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingPipelineEngine } from "@/server/orchestrator/marketing-pipeline";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { MockAgentProvider } from "@/server/orchestrator/agent-provider";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const CreateMarketingBatchSchema = z.object({
  skus: z.array(z.string().min(1)).min(1, "Debe especificar al menos un SKU"),
  provider: z.enum(["antigravity", "mock"]).default("antigravity"),
  forceRegenerate: z.boolean().default(false)
});

const repository = new MarketingRunRepository();

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const parsed = CreateMarketingBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { skus, provider: providerType, forceRegenerate } = parsed.data;

    // Seleccionar provider: En producción o cuando provider === 'antigravity', usar siempre AntigravityTsProvider real
    let provider;
    if (process.env.NODE_ENV === "production" || providerType === "antigravity" || process.env.ANTIGRAVITY_SDK_ENABLED === "true") {
      provider = new AntigravityTsProvider();
    } else {
      provider = new MockAgentProvider();
    }

    const engine = new MarketingPipelineEngine(provider);

    // Ejecutar procesamiento del batch con guardado progresivo en Firestore
    const { batch, results } = await engine.executeBatch(
      skus,
      {
        workspacePath: process.env.TEMP || process.env.TMPDIR || "/tmp",
        requestedBy: user.email,
        workspaceId: user.workspaceId || "default-ecomspain",
        organizationId: "org-ecomspain",
        provider
      },
      async (sku, item) => {
        try {
          await repository.saveBatch(batch);
        } catch {
          // Ignorar fallo de sincronización progresiva intermedia
        }
      }
    );

    // Persistir ejecuciones, paquetes y batch con fail-safe estricto
    try {
      for (const res of results) {
        if (res.run) await repository.saveRun(res.run);
        if (res.package) await repository.savePackage(res.package);
      }
      await repository.saveBatch(batch);
    } catch (dbErr: any) {
      console.error("[api/marketing/batches] Fallo crítico de persistencia en Firestore:", dbErr);
      return NextResponse.json(
        {
          status: "PERSISTENCE_FAILED",
          error: "No se pudo guardar el resultado del batch en la base de datos",
          details: dbErr?.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "SUCCESS",
        batch,
        resultsSummary: {
          total: batch.totalItems,
          completed: batch.completedItems,
          failed: batch.failedItems,
          blocked: batch.blockedItems
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: error.message || "Error procesando el lote de marketing"
      },
      { status: 500 }
    );
  }
});

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  try {
    const batches = await repository.listBatchesByWorkspace(user.workspaceId || "default-ecomspain");
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
