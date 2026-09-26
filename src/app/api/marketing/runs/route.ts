import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { MarketingPipelineEngine } from "@/server/orchestrator/marketing-pipeline";
import { AntigravityTsProvider } from "@/server/orchestrator/antigravity-ts-provider";
import { MockAgentProvider } from "@/server/orchestrator/agent-provider";
import { MarketingRunRepository } from "@/server/repositories/marketing-repository";

const CreateMarketingRunSchema = z.object({
  sku: z.string().min(1, "SKU es requerido"),
  provider: z.enum(["antigravity", "mock"]).default("antigravity"),
  forceRegenerate: z.boolean().default(false)
});

const repository = new MarketingRunRepository();

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const parsed = CreateMarketingRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sku, provider: providerType, forceRegenerate } = parsed.data;

    // Seleccionar provider: En producción o cuando provider === 'antigravity', usar siempre AntigravityTsProvider real
    let provider;
    if (process.env.NODE_ENV === "production" || providerType === "antigravity" || process.env.ANTIGRAVITY_SDK_ENABLED === "true") {
      provider = new AntigravityTsProvider();
    } else {
      provider = new MockAgentProvider();
    }

    const engine = new MarketingPipelineEngine(provider);
    const hash = engine.calculateIdempotencyHash(sku);

    // 16. Idempotencia: Verificar si ya existe una ejecución previa idéntica en este workspace
    if (!forceRegenerate) {
      try {
        const existingRun = await repository.findRunByIdempotencyHash(hash, user.workspaceId || "default-ecomspain");
        if (existingRun && existingRun.status === "COMPLETED") {
          const existingPkg = await repository.findPackageByRunId(existingRun.runId);
          return NextResponse.json({
            status: "CACHED",
            message: "Retornando ejecución existente por coincidencia de hash de idempotencia",
            run: existingRun,
            package: existingPkg
          });
        }
      } catch {
        // En entorno local sin emulador firestore, continuar a ejecución directa
      }
    }

    // Determinar siguiente contentVersion para el SKU
    let nextContentVersion = 1;
    try {
      const pastPackages = await repository.listPackagesBySku(sku);
      if (pastPackages.length > 0) {
        const maxVer = Math.max(...pastPackages.map((p) => p.contentVersion || 1));
        nextContentVersion = maxVer + 1;
      }
    } catch {
      // Si la persistencia remota no responde, continuar con versión 1
    }

    // Ejecutar pipeline con aislamiento estricto de tenant
    const { run, marketingPackage } = await engine.executePipeline(sku, {
      workspacePath: process.env.TEMP || process.env.TMPDIR || "/tmp",
      requestedBy: user.email,
      workspaceId: user.workspaceId || "default-ecomspain",
      organizationId: "org-ecomspain",
      provider,
      contentVersion: nextContentVersion
    });

    // Persistir ejecuciones y paquetes con fail-safe estricto
    try {
      await repository.saveRun(run);
      await repository.savePackage(marketingPackage);
    } catch (dbErr: any) {
      console.error("[api/marketing/runs] Fallo crítico de persistencia en Firestore:", dbErr);
      return NextResponse.json(
        {
          status: "PERSISTENCE_FAILED",
          error: "No se pudo guardar la ejecución ni el paquete en la base de datos",
          details: dbErr?.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "SUCCESS",
        run,
        package: marketingPackage
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: error.message || "Error al procesar MarketingRun"
      },
      { status: 500 }
    );
  }
});

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  try {
    const runs = await repository.listRunsByWorkspace(user.workspaceId || "default-ecomspain");
    return NextResponse.json({ runs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
