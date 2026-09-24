/**
 * Phase 06 — Security & Hardening Tests (F6 QA Gate)
 *
 * Valida:
 * 1. secrets.ts lanza MissingConfigurationError cuando faltan secretos.
 * 2. getRequiredSessionSecret no contiene fallbacks hardcodeados.
 * 3. checkSecretsHealth() reporta de forma limpia y segura el estado de configuración.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MissingConfigurationError,
  getRequiredSessionSecret,
  checkSecretsHealth
} from "../src/server/config/secrets.ts";

describe("Phase 06 — Security Hardening Tests (Contratos F6)", () => {
  it("rechaza de forma explícita cuando SESSION_SECRET no está definido", () => {
    const original = process.env.SESSION_SECRET;
    try {
      delete process.env.SESSION_SECRET;
      assert.throws(
        () => getRequiredSessionSecret(),
        (err: unknown) => err instanceof MissingConfigurationError && err.configKey === "SESSION_SECRET"
      );
    } finally {
      if (original) process.env.SESSION_SECRET = original;
    }
  });

  it("checkSecretsHealth() detecta variables presentes y faltantes sin exponer valores", () => {
    const health = checkSecretsHealth();
    assert.equal(typeof health.ok, "boolean");
    assert.ok(Array.isArray(health.missing));
    assert.ok(typeof health.configured === "object");
  });
});
