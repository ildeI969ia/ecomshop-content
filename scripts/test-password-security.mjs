import { createSessionToken, verifySessionToken } from "../src/lib/auth/session.ts";

async function runTests() {
  console.log("--- TEST 1: Crear token firmado con HMAC-SHA256 ---");
  const payload = {
    uid: "user-test-123",
    email: "carlos@ecomspain.com",
    role: "ADMIN",
    workspaceId: "default-ecomspain"
  };

  const token = await createSessionToken(payload, 3600);
  console.log("Token generado:", token);
  if (!token || !token.includes(".")) {
    throw new Error("Token formatting failed");
  }
  console.log("✅ TEST 1 PASSED: Token generado correctamente.");

  console.log("\n--- TEST 2: Verificar token legítimo ---");
  const verified = await verifySessionToken(token);
  console.log("Payload verificado:", verified);
  if (!verified || verified.email !== "carlos@ecomspain.com" || verified.role !== "ADMIN") {
    throw new Error("Token verification failed");
  }
  console.log("✅ TEST 2 PASSED: Token verificado y payload íntegro.");

  console.log("\n--- TEST 3: Rechazar token manipulado ---");
  const [b64, sig] = token.split(".");
  const tamperedSig = sig.substring(0, sig.length - 4) + "0000";
  const tamperedToken = `${b64}.${tamperedSig}`;
  const tamperedResult = await verifySessionToken(tamperedToken);
  if (tamperedResult !== null) {
    throw new Error("Tampered token was not rejected!");
  }
  console.log("✅ TEST 3 PASSED: Token alterado rechazado correctamente.");

  console.log("\n--- TEST 4: Rechazar token expirado ---");
  const expiredToken = await createSessionToken(payload, -10); // Expiró hace 10 segundos
  const expiredResult = await verifySessionToken(expiredToken);
  if (expiredResult !== null) {
    throw new Error("Expired token was not rejected!");
  }
  console.log("✅ TEST 4 PASSED: Token expirado rechazado con éxito.");

  console.log("\n=================================");
  console.log("🎉 TODOS LOS TESTS DE SEGURIDAD PASARON CON ÉXITO");
  console.log("=================================");
}

runTests().catch((err) => {
  console.error("❌ Fallo en las pruebas de seguridad:", err);
  process.exit(1);
});
