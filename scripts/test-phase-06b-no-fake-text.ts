import assert from "node:assert";
import { generateB2BContent } from "@/lib/generator";

async function runTest() {
  console.log("▶ Fase 6b — Pruebas de No Texto Inventado (Fallback Guard & Mensajes de Error)");

  // 1. Simular llamada sin API Key para forzar el generador determinista (Fallback)
  const fallbackResult = await generateB2BContent({
    topicTitle: "Switch PoE ECW536",
    category: "switches",
    apiKey: ""
  });

  // Verificación 1: Origen y Estado marcados correctamente
  assert.strictEqual(fallbackResult.source, "fallback", "El contenido de respaldo debe tener source = 'fallback'");
  assert.strictEqual(fallbackResult.status, "NEEDS_REVIEW", "El contenido de respaldo debe estar en estado NEEDS_REVIEW");
  assert.ok(fallbackResult.fallbackNotice, "Debe incluir un aviso visible de fallback");
  assert.ok(
    fallbackResult.fallbackNotice.includes("La IA no ha respondido"),
    "El aviso debe indicar claramente 'La IA no ha respondido'"
  );

  // Verificación 2: Ausencia de cifras inventadas (p. ej. '42% de ahorro', '40%')
  const jsonStr = JSON.stringify(fallbackResult);
  assert.strictEqual(jsonStr.includes("42%"), false, "No debe incluir '42%' inventado en las plantillas de respaldo");
  assert.strictEqual(jsonStr.includes("40%"), false, "No debe incluir '40%' inventado en las plantillas de respaldo");

  console.log("  ✔ Fallback correctamente marcado con source=fallback, status=NEEDS_REVIEW");
  console.log("  ✔ Aviso explícito 'La IA no ha respondido' presente");
  console.log("  ✔ Cifras fijas inventadas eliminadas de todas las plantillas de respaldo");

  console.log("✔ Fase 6b — Pruebas superadas con éxito.");
}

runTest().catch((err) => {
  console.error("❌ Error en prueba 6b:", err);
  process.exit(1);
});
