import { generateB2BContent } from "../src/lib/generator";
import { checkProductContamination } from "../src/lib/quality/editorial-quality-gate";

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      options[key] = val;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const sku = options.sku || "ECC120";
  const category = options.category || "cloud";
  const audience = options.audience || "Instalador B2B";
  const topicTitle = options.topic || `Campaña Multicanal B2B para ${sku}`;

  // Default to Vertex AI corporate project unless explicitly told to use API Studio
  if (options.studio !== "true") {
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "ecomshop-marketing-prod";
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
    process.env.VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    console.log(`[GENERATOR] Modo Vertex AI activado (Proyecto: ${process.env.GOOGLE_CLOUD_PROJECT}, Región: ${process.env.VERTEX_LOCATION})`);
  }

  console.log(`[GENERATOR] Iniciando generación con SKU: ${sku}, Categoría: ${category}, Audiencia: ${audience}`);

  // Hard timeout failsafe: Evita que el proceso quede colgado indefinidamente
  const timeoutMs = parseInt(options.timeout || "90000", 10);
  const timer = setTimeout(() => {
    console.error(`[TIMEOUT] La generación excedió el tiempo límite de ${timeoutMs / 1000}s. Abortando.`);
    process.exit(1);
  }, timeoutMs);
  timer.unref();

  try {
    const startTime = Date.now();
    const result = await generateB2BContent({
      sku,
      category,
      targetAudience: audience,
      topicTitle
    });

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[SUCCESS] Contenido generado exitosamente en ${elapsedSec}s!`);
    console.log(`- Blog Title: "${result.blog?.title || 'N/A'}"`);
    console.log(`- Canales generados: ${Object.keys(result).filter(k => !!(result as any)[k]).join(', ')}`);

    const contamination = checkProductContamination(result, sku);
    console.log(`- Quality Gate Contaminación: ${contamination.passed ? 'PASADO ✅' : 'FALLIDO ❌'}`);
    if (!contamination.passed) {
      console.warn(`  SKUs no relacionados detectados: ${contamination.detectedUnrelatedSkus.join(', ')}`);
    }

    clearTimeout(timer);
    process.exitCode = 0;
  } catch (error: any) {
    console.error(`[ERROR] Falló la generación:`, error?.message || error);
    clearTimeout(timer);
    process.exit(1);
  }
}

main();
