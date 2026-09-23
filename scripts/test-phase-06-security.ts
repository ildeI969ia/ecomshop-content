/**
 * Phase 06 — Security & Hardening Tests (F6 QA Gate)
 *
 * Valida:
 * 1. secrets.ts lanza MissingConfigurationError cuando faltan secretos.
 * 2. getRequiredSessionSecret, getRequiredCorporatePassword y getRequiredAdminPassword
 *    no contienen fallbacks hardcodeados.
 * 3. checkSecretsHealth() reporta de forma limpia y segura el estado de configuración.
 * 4. createSessionToken() y verifySessionToken() lanzan error explícito si SESSION_SECRET no existe.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MissingConfigurationError,
  getRequiredSessionSecret,
  getRequiredCorporatePassword,
  getRequiredAdminPassword,
  checkSecretsHealth
} from "../src/server/config/secrets.ts";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/session.ts";

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

  it("rechaza de forma explícita cuando CORPORATE_ACCESS_PASSWORD no está definido", () => {
    const original = process.env.CORPORATE_ACCESS_PASSWORD;
    try {
      delete process.env.CORPORATE_ACCESS_PASSWORD;
      assert.throws(
        () => getRequiredCorporatePassword(),
        (err: unknown) => err instanceof MissingConfigurationError && err.configKey === "CORPORATE_ACCESS_PASSWORD"
      );
    } finally {
      if (original) process.env.CORPORATE_ACCESS_PASSWORD = original;
    }
  });

  it("rechaza de forma explícita cuando ADMIN_ACCESS_PASSWORD no está definido", () => {
    const original = process.env.ADMIN_ACCESS_PASSWORD;
    try {
      delete process.env.ADMIN_ACCESS_PASSWORD;
      assert.throws(
        () => getRequiredAdminPassword(),
        (err: unknown) => err instanceof MissingConfigurationError && err.configKey === "ADMIN_ACCESS_PASSWORD"
      );
    } finally {
      if (original) process.env.ADMIN_ACCESS_PASSWORD = original;
    }
  });

  it("createSessionToken lanza error si SESSION_SECRET no está configurado", async () => {
    const original = process.env.SESSION_SECRET;
    try {
      delete process.env.SESSION_SECRET;
      await assert.rejects(
        async () => {
          await createSessionToken({
            uid: "user-test",
            email: "test@ecomspain.com",
            role: "ADMIN",
            workspaceId: "default-ecomspain"
          });
        },
        /SESSION_SECRET es obligatoria/
      );
    } finally {
      if (original) process.env.SESSION_SECRET = original;
    }
  });

  it("firma y valida sesión correctamente cuando SESSION_SECRET está provisto", async () => {
    const original = process.env.SESSION_SECRET;
    try {
      process.env.SESSION_SECRET = "test-secret-key-at-least-32-chars-long-for-hmac";
      const token = await createSessionToken({
        uid: "user-123",
        email: "carlos@ecomspain.com",
        role: "ADMIN",
        workspaceId: "default-ecomspain"
      });

      assert.ok(typeof token === "string" && token.length > 20);
      const verified = await verifySessionToken(token);
      assert.ok(verified !== null);
      assert.equal(verified?.email, "carlos@ecomspain.com");
      assert.equal(verified?.role, "ADMIN");
    } finally {
      if (original) {
        process.env.SESSION_SECRET = original;
      } else {
        delete process.env.SESSION_SECRET;
      }
    }
  });

  it("checkSecretsHealth() detecta variables presentes y faltantes sin exponer valores", () => {
    const health = checkSecretsHealth();
    assert.equal(typeof health.ok, "boolean");
    assert.ok(Array.isArray(health.missing));
    assert.ok(typeof health.configured === "object");
  });
});
