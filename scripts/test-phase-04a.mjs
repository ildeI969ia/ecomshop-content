import { describe, it, expect } from "node:test";
import assert from "node:assert/strict";
import { ROLE_PERMISSIONS, hasPermission, isEcomSpainCorporateEmail } from "./src/server/security/rbac";
import { sanitizeHtml } from "./src/server/security/sanitizer";

describe("Phase 04A Security & RBAC Unit Tests", () => {
  it("Validates corporate email restriction to @ecomspain.com", () => {
    assert.equal(isEcomSpainCorporateEmail("carlos@ecomspain.com"), true);
    assert.equal(isEcomSpainCorporateEmail("CARLOS@ECOMSPAIN.COM"), true);
    assert.equal(isEcomSpainCorporateEmail("hacker@gmail.com"), false);
    assert.equal(isEcomSpainCorporateEmail("intruder@ecomspain.net"), false);
  });

  it("Enforces granular permissions across roles", () => {
    assert.equal(hasPermission("ADMIN", "campaign:create"), true);
    assert.equal(hasPermission("ADMIN", "finops:manage"), true);
    assert.equal(hasPermission("CONTENT_MANAGER", "content:create"), true);
    assert.equal(hasPermission("CONTENT_MANAGER", "finops:manage"), false);
    assert.equal(hasPermission("VIEWER", "ai:execute"), false);
    assert.equal(hasPermission("VIEWER", "content:view"), true);
  });

  it("Sanitizes malicious HTML payloads against XSS attacks", () => {
    const maliciousPayload = "<p>Valid text</p><script>alert('XSS')</script><img src='x' onerror='alert(1)'>";
    const sanitized = sanitizeHtml(maliciousPayload);
    assert.ok(!sanitized.includes("<script>"));
    assert.ok(!sanitized.includes("onerror"));
    assert.ok(sanitized.includes("<p>Valid text</p>"));
  });
});
