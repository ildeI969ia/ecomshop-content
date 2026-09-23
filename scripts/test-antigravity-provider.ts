import * as fs from "node:fs";
import * as path from "node:path";
import { AntigravityPythonSdkProvider } from "../src/server/orchestrator/antigravity-python-provider";
import { AgentExecutionManifest } from "../src/server/orchestrator/types";

async function runTest() {
  console.log("=== INICIANDO TEST DEL ANTIGRAVITY PYTHON SDK PROVIDER DESDE NODE ===");

  const tempWorkspace = path.resolve(process.env.TEMP || "C:\\temp", `test-provider-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const testFile = path.join(tempWorkspace, "PROBE_NODE.txt");
  fs.writeFileSync(testFile, "ECHO_FROM_NODE_RUNNER", "utf8");

  try {
    // 1. Probar rechazo cuando ANTIGRAVITY_SDK_ENABLED=false
    delete process.env.ANTIGRAVITY_SDK_ENABLED;
    const providerDisabled = new AntigravityPythonSdkProvider();
    const manifestDisabled: AgentExecutionManifest = {
      runId: "run-disabled-test",
      taskId: "task-disabled-1",
      agentRole: "ai-marketing",
      workspacePath: tempWorkspace,
      baseCommit: "HEAD",
      environment: "DEVELOPMENT",
      filesAllowed: ["PROBE_NODE.txt"],
      filesForbidden: [".env.local"],
      prompt: "Read PROBE_NODE.txt"
    };

    const resDisabled = await providerDisabled.execute(manifestDisabled);
    if (resDisabled.exitCode !== 1 || !resDisabled.stderr.includes("ANTIGRAVITY_SDK_DISABLED")) {
      throw new Error(`Fallo en test provider deshabilitado: ${JSON.stringify(resDisabled)}`);
    }
    console.log("✅ Check 1: Provider rechaza ejecución cuando ANTIGRAVITY_SDK_ENABLED=false");

    // 2. Probar ejecución real cuando ANTIGRAVITY_SDK_ENABLED=true
    process.env.ANTIGRAVITY_SDK_ENABLED = "true";
    const providerEnabled = new AntigravityPythonSdkProvider();

    const manifestEnabled: AgentExecutionManifest = {
      runId: "run-node-e2e",
      taskId: "task-node-read",
      agentRole: "ai-marketing",
      workspacePath: tempWorkspace,
      baseCommit: "HEAD",
      environment: "DEVELOPMENT",
      filesAllowed: ["PROBE_NODE.txt"],
      filesForbidden: [".env.local"],
      prompt: "Read PROBE_NODE.txt and respond only with its exact contents."
    };

    console.log("Invocando Agent.chat() mediante AntigravityPythonSdkProvider...");
    const resEnabled = await providerEnabled.execute(manifestEnabled);

    console.log("Resultado de ejecución:", {
      exitCode: resEnabled.exitCode,
      timedOut: resEnabled.timedOut,
      stdout: resEnabled.stdout.trim(),
      summary: resEnabled.summary
    });

    if (resEnabled.exitCode !== 0) {
      throw new Error(`Fallo en ejecución real: ${resEnabled.stderr}`);
    }

    if (!resEnabled.stdout.includes("ECHO_FROM_NODE_RUNNER")) {
      throw new Error(`La respuesta no contiene el contenido esperado: ${resEnabled.stdout}`);
    }

    console.log("✅ Check 2: Provider ejecutó exitosamente el agente Antigravity real de forma headless");
    console.log("=== TEST ANTIGRAVITY PROVIDER SUPERADO CON ÉXITO ===");
  } finally {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch {
      // Ignorar limpieza de temporales
    }
  }
}

runTest().catch((err) => {
  console.error("❌ ERROR EN TEST ANTIGRAVITY PROVIDER:", err);
  process.exit(1);
});
