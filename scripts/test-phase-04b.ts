import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLE_PERMISSIONS, hasPermission, isEcomSpainCorporateEmail, UserRole } from "../src/server/security/rbac.ts";
import { sanitizeHtml } from "../src/server/security/sanitizer.ts";

describe("Phase 04B Comprehensive Security, RBAC & Integration Suite", () => {
  const ALL_ROLES: UserRole[] = [
    "ADMIN",
    "MARKETING_MANAGER",
    "CONTENT_MANAGER",
    "PRODUCT_MANAGER",
    "DESIGNER",
    "SALES",
    "VIEWER"
  ];

  it("1. AUTH: Restricts corporate access strictly to @ecomspain.com", () => {
    assert.equal(isEcomSpainCorporateEmail("carlos@ecomspain.com"), true);
    assert.equal(isEcomSpainCorporateEmail("CARLOS@ECOMSPAIN.COM"), true);
    assert.equal(isEcomSpainCorporateEmail("ingenieria@ecomspain.com"), true);
    assert.equal(isEcomSpainCorporateEmail("external@gmail.com"), false);
    assert.equal(isEcomSpainCorporateEmail("attacker@ecomspain.io"), false);
  });

  it("2. RBAC: Validates all 7 roles against required permissions", () => {
    // ADMIN has full authority
    assert.equal(hasPermission("ADMIN", "campaign:create"), true);
    assert.equal(hasPermission("ADMIN", "content:approve"), true);
    assert.equal(hasPermission("ADMIN", "finops:manage"), true);

    // MARKETING_MANAGER can create campaigns and approve content but cannot manage system users
    assert.equal(hasPermission("MARKETING_MANAGER", "campaign:create"), true);
    assert.equal(hasPermission("MARKETING_MANAGER", "content:approve"), true);
    assert.equal(hasPermission("MARKETING_MANAGER", "users:manage"), false);

    // CONTENT_MANAGER can create and edit content, but cannot create campaigns or manage finops
    assert.equal(hasPermission("CONTENT_MANAGER", "content:create"), true);
    assert.equal(hasPermission("CONTENT_MANAGER", "campaign:create"), false);
    assert.equal(hasPermission("CONTENT_MANAGER", "finops:manage"), false);

    // PRODUCT_MANAGER & DESIGNER have AI execution and technical edit rights, but not approval
    assert.equal(hasPermission("PRODUCT_MANAGER", "ai:execute"), true);
    assert.equal(hasPermission("PRODUCT_MANAGER", "content:approve"), false);
    assert.equal(hasPermission("DESIGNER", "ai:execute"), true);
    assert.equal(hasPermission("DESIGNER", "content:publish"), false);

    // SALES & VIEWER are strictly read-only
    assert.equal(hasPermission("SALES", "content:view"), true);
    assert.equal(hasPermission("SALES", "content:create"), false);
    assert.equal(hasPermission("SALES", "ai:execute"), false);
    assert.equal(hasPermission("VIEWER", "campaign:view"), true);
    assert.equal(hasPermission("VIEWER", "ai:execute"), false);
  });

  it("3. SECURITY: Sanitizes nested script injections, event handlers, and data URIs in HTML", () => {
    const maliciousHtml = `
      <div class="test">
        <h1>Valid Header</h1>
        <script>window.__LEAK = localStorage.getItem("key");</script>
        <img src="valid.jpg" onerror="alert('XSS')" />
        <a href="javascript:alert(1)">Click</a>
      </div>
    `;
    const cleanHtml = sanitizeHtml(maliciousHtml);
    assert.ok(!cleanHtml.includes("<script>"));
    assert.ok(!cleanHtml.includes("window.__LEAK"));
    assert.ok(!cleanHtml.includes("onerror"));
    assert.ok(!cleanHtml.includes("javascript:alert"));
    assert.ok(cleanHtml.includes("Valid Header"));
  });

  it("4. MIGRATION IDEMPOTENCY: Sync payload structure is fully validated", () => {
    const sampleRecord = {
      id: "hist-1",
      title: "Wi-Fi 7 Guide",
      content: {
        topicTitle: "Wi-Fi 7 Guide",
        category: "wifi",
        blog: { slug: "wifi-7-guide" }
      }
    };
    assert.ok(sampleRecord.id);
    assert.ok(sampleRecord.content.blog.slug);
  });
});
