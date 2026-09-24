import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

async function runFinopsBudgetTests() {
  console.log("=== Ejecutando Certificación de Presupuesto FinOps (Fase 5b) ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  // TEST 1: Normalización de roles Case-Insensitive ("ADMIN", "admin", "Admin", "EDITOR", "editor")
  console.log("\n1. Test: Normalización Case-Insensitive de Roles");
  try {
    const adminCheckUpper = await checkAiBudget("test-user-admin-1", "ADMIN", 0);
    const adminCheckLower = await checkAiBudget("test-user-admin-1", "admin", 0);
    const adminCheckMixed = await checkAiBudget("test-user-admin-1", "AdMiN", 0);

    assert(adminCheckUpper.limitEur === 100.0, 'Rol "ADMIN" (mayúsculas) obtiene límite de 100€');
    assert(adminCheckLower.limitEur === 100.0, 'Rol "admin" (minúsculas) obtiene límite de 100€');
    assert(adminCheckMixed.limitEur === 100.0, 'Rol "AdMiN" (mixto) obtiene límite de 100€');

    const editorCheckUpper = await checkAiBudget("test-user-editor-1", "EDITOR", 0);
    const editorCheckLower = await checkAiBudget("test-user-editor-1", "editor", 0);
    assert(editorCheckUpper.limitEur === 25.0, 'Rol "EDITOR" obtiene límite de 25€');
    assert(editorCheckLower.limitEur === 25.0, 'Rol "editor" obtiene límite de 25€');
  } catch (err: any) {
    assert(false, `Error inesperado en test de normalización de roles: ${err?.message}`);
  }

  // TEST 2: Fail-Safe en Registro de Uso (recordAiUsage)
  console.log("\n2. Test: Resiliencia Fail-Safe en recordAiUsage");
  try {
    let callSucceeded = false;
    let exceptionThrown = false;

    // Envolver llamada en try/catch para verificar resiliencia
    try {
      await recordAiUsage("test-fail-safe-user", "test_action", 100, 200, 0);
      callSucceeded = true;
    } catch (err) {
      exceptionThrown = true;
    }

    assert(!exceptionThrown, "La llamada a recordAiUsage no debe lanzar excepciones no controladas");
    assert(callSucceeded, "recordAiUsage se ejecutó correctamente (o manejado internamente/mocked)");
  } catch (err: any) {
    assert(false, `Error en test de fail-safe: ${err?.message}`);
  }

  // TEST 3: Bloqueo HTTP 429 al Exceder Presupuesto
  console.log("\n3. Test: Evaluación de Límite Presupuestario y Bloqueo 429");
  try {
    // Probar con un coste simulado astronómico (ej. 99999€) para forzar presupuesto excedido
    const exceededCheck = await checkAiBudget("test-user-viewer-1", "viewer", 99999);
    assert(exceededCheck.allowed === false, "checkAiBudget debe devolver allowed=false cuando se supera el límite");
    assert(exceededCheck.code === "AI_BUDGET_EXCEEDED", 'checkAiBudget debe devolver código "AI_BUDGET_EXCEEDED"');
  } catch (err: any) {
    assert(false, `Error en test de bloqueo de presupuesto: ${err?.message}`);
  }

  console.log("\n================ RESUMEN DE PRUEBAS FINOPS ================");
  console.log(`Pruebas superadas: ${passed}`);
  console.log(`Pruebas fallidas: ${failed}`);

  if (failed > 0) {
    console.error("\n❌ ERROR: Algunas pruebas de FinOps han fallado.");
    process.exit(1);
  } else {
    console.log("\n✅ ÉXITO: Certificación de Fase 5b (FinOps Budget & Fail-safe) aprobada al 100%.");
    process.exit(0);
  }
}

runFinopsBudgetTests();
