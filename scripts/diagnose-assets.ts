/**
 * CLI de diagnóstico del flujo de persistencia de activos (Fase F0).
 *
 * Uso:
 *   npx tsx scripts/diagnose-assets.ts                      # sonda superficial + verificación de URLs
 *   npx tsx scripts/diagnose-assets.ts --deep               # sube 1 byte a GCS, verifica y lo borra
 *   npx tsx scripts/diagnose-assets.ts --json               # salida JSON (para CI)
 *   npx tsx scripts/diagnose-assets.ts --no-verify-urls
 *
 * Sólo lectura salvo la sonda profunda, que escribe/borra en el prefijo _health/.
 * Exit code: 0 = sin hallazgos CRITICAL, 1 = pipeline roto, 2 = error de ejecución.
 */
import { runPersistenceDiagnostics } from "../src/server/services/persistence-diagnostics.ts";

interface CliOptions {
  workspace: string;
  deep: boolean;
  json: boolean;
  verifyUrls: boolean;
  limit: number;
  help: boolean;
}

const USAGE = `
Diagnóstico de persistencia de activos — EcomShop Content

Opciones:
  --workspace=<id>     Workspace a inspeccionar (def.: default-ecomspain)
  --limit=<n>          Máximo de assets a inspeccionar (def.: 200)
  --deep               Sonda de escritura real en GCS (1 byte + borrado)
  --json               Salida JSON completa
  --no-verify-urls     No comprobar por HTTP las URLs de los assets
  --help               Muestra esta ayuda
`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    workspace: "default-ecomspain",
    deep: false,
    json: false,
    verifyUrls: true,
    limit: 200,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--deep") options.deep = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--no-verify-urls") options.verifyUrls = false;
    else if (arg.startsWith("--workspace=")) options.workspace = arg.slice("--workspace=".length);
    else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (Number.isFinite(value) && value > 0) options.limit = Math.floor(value);
    }
  }

  return options;
}

function line(char = "-", length = 78): string {
  return char.repeat(length);
}

function printReport(report: Awaited<ReturnType<typeof runPersistenceDiagnostics>>): void {
  console.log("");
  console.log(line("="));
  console.log(" DIAGNOSTICO DE PERSISTENCIA DE ACTIVOS — EcomShop Content");
  console.log(line("="));
  console.log(` Proyecto         : ${report.projectId}`);
  console.log(` Workspace        : ${report.workspaceId}`);
  console.log(` Bucket           : gs://${report.bucket.name} (nombre por ${report.bucket.source})`);
  console.log(` Sonda profunda   : ${report.deepProbe ? "si" : "no"}`);
  console.log(` Generado         : ${report.generatedAt}`);
  console.log(` Resultado global : ${report.ok ? "[OK] sin hallazgos CRITICAL" : "[CRIT] pipeline roto"}`);
  console.log("");

  console.log("FIRESTORE");
  console.log(
    `  assets totales   : ${report.firestore.totalAssets ?? "n/d"} | en workspace: ${report.firestore.workspaceAssets ?? "n/d"}`
  );
  console.log(
    `  query con indice : ${report.firestore.indexedQuery.ok ? "OK" : "FALLA"}` +
      (report.firestore.indexedQuery.code ? ` (codigo ${report.firestore.indexedQuery.code})` : "")
  );
  if (report.firestore.error) console.log(`  error            : ${report.firestore.error}`);
  if (report.firestore.workspaceQueryError) {
    console.log(`  error workspace  : ${report.firestore.workspaceQueryError}`);
  }
  console.log(
    `  salud de activos : OK=${report.assets.classified.OK} sinURL=${report.assets.classified.MISSING_URL} ` +
      `rutaFicticia=${report.assets.classified.PLACEHOLDER_STORAGE_PATH} dataURL=${report.assets.classified.DATA_URL_IN_FIRESTORE}`
  );
  for (const sample of report.assets.samples) {
    console.log(`    - [${sample.health}] ${sample.id} | ${sample.filename} | ${sample.storagePath}`);
  }
  console.log("");

  console.log("CLOUD STORAGE");
  const health = report.storage.health;
  if (health) {
    console.log(`  alcanzable       : ${health.reachable ? "si" : "no"}`);
    console.log(
      `  escritura        : ${report.deepProbe ? (health.canWrite ? "verificada" : "FALLA") : "no probada"}`
    );
    if (health.roundtripMs !== undefined) console.log(`  roundtrip        : ${health.roundtripMs} ms`);
  }
  if (report.storage.error) console.log(`  error            : ${report.storage.error}`);
  console.log("");

  if (report.urlProbes.length > 0) {
    console.log("URLS DE ASSETS (HEAD)");
    for (const probe of report.urlProbes) {
      console.log(
        `  ${probe.ok ? "[OK]  " : "[FAIL]"} ${probe.status ?? probe.error} ${probe.url.slice(0, 90)}`
      );
    }
    console.log("");
  }

  console.log("COMPROBACIONES");
  for (const check of report.checks) {
    const tag = check.severity === "OK" ? "[OK]  " : check.severity === "WARNING" ? "[WARN]" : "[CRIT]";
    console.log(`  ${tag} ${check.id} — ${check.title}`);
    console.log(`         ${check.detail}`);
    if (check.remediation) console.log(`         -> ${check.remediation}`);
  }
  console.log("");

  console.log("DIAGNOSTICO");
  for (const item of report.diagnosis) console.log(`  * ${item}`);
  console.log("");

  console.log("PENDIENTE (fases siguientes)");
  for (const item of report.pendingWork) console.log(`  - ${item}`);
  console.log("");
  console.log(line("="));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const report = await runPersistenceDiagnostics({
    workspaceId: options.workspace,
    deep: options.deep,
    verifyUrls: options.verifyUrls,
    limit: options.limit,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  process.exit(report.ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error("[diagnose-assets] Error de ejecución:", err);
  process.exit(2);
});

