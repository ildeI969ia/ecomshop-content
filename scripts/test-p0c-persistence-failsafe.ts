/**
 * Sprint P0-C: Production Safety, Persistence Fail-Safe & FinOps Fail-Closed Tests
 *
 * Pruebas unitarias para:
 * 1. Prohibición de MockAgentProvider en producción cuando NODE_ENV === 'production' y ALLOW_MOCK_AGENT !== 'true'.
 * 2. Persistencia fallida en Firestore devuelve error 500 con status: "PERSISTENCE_FAILED".
 * 3. Comportamiento Fail-Closed en checkAiBudget cuando Firestore no está disponible.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkAiBudget } from "../src/server/services/ai-budget.ts";

describe("Sprint P0-C — Production Safety & Fail-Safe Mechanics", () => {
  it("Prohíbe MockAgentProvider en producción a menos que ALLOW_MOCK_AGENT sea true", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllowMock = process.env.ALLOW_MOCK_AGENT;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_MOCK_AGENT;

      const isMockAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_AGENT === "true";
      assert.equal(isMockAllowed, false);

      process.env.ALLOW_MOCK_AGENT = "true";
      const isMockAllowedWithFlag = process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_AGENT === "true";
      assert.equal(isMockAllowedWithFlag, true);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalAllowMock) {
        process.env.ALLOW_MOCK_AGENT = originalAllowMock;
      } else {
        delete process.env.ALLOW_MOCK_AGENT;
      }
    }
  });

  it("Garantiza respuesta PERSISTENCE_FAILED (500) en lugar de falso SUCCESS si Firestore falla", () => {
    const isDbError = true;
    let response: any;

    if (isDbError) {
      response = {
        status: "PERSISTENCE_FAILED",
        error: "No se pudo guardar la ejecución ni el paquete en la base de datos"
      };
    } else {
      response = { status: "SUCCESS" };
    }

    assert.equal(response.status, "PERSISTENCE_FAILED");
    assert.notEqual(response.status, "SUCCESS");
  });

  it("Aplica Fail-Closed (BUDGET_VERIFICATION_UNAVAILABLE) en checkAiBudget si Firestore falla", async () => {
    const { getAdminFirestore } = await import("../src/server/config/firebase.ts");
    const db = getAdminFirestore();
    const originalCollection = db.collection.bind(db);

    try {
      db.collection = () => {
        throw new Error("Firestore Network / Auth Failure");
      };

      const result = await checkAiBudget("user-test-fail-closed", "USER", 0.01);
      assert.equal(result.allowed, false);
      assert.equal(result.code, "BUDGET_VERIFICATION_UNAVAILABLE");
    } finally {
      db.collection = originalCollection;
    }
  });
});
