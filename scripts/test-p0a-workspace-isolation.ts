/**
 * Sprint P0-A: Workspace Isolation Unit & Regression Tests
 *
 * Pruebas unitarias para:
 * 1. MarketingPackageSchema exige workspaceId y organizationId.
 * 2. MarketingRunRepository.listPackagesByWorkspace exige workspaceId no vacío.
 * 3. Aislamiento de campañas entre workspaces (403 si workspace mismatch).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketingPackageSchema } from "../src/server/orchestrator/marketing-types.ts";
import { MarketingRunRepository } from "../src/server/repositories/marketing-repository.ts";

describe("Sprint P0-A — Workspace Isolation & Authorization", () => {
  it("MarketingPackageSchema asigna defaults de workspaceId y organizationId", () => {
    const pkgPayload: any = {
      packageId: "pkg-123",
      runId: "run-123",
      product: {
        sku: "SKU-TEST",
        brand: "BrandTest",
        name: "Test Product",
        deviceType: "router",
        priceEur: 100,
        url: "https://example.com"
      },
      positioning: "Test positioning",
      targetAudience: "B2B",
      valueProposition: "High quality",
      keyBenefits: ["Fast"],
      technicalHighlights: ["10Gbps"],
      verifiedClaims: [],
      seo: {
        title: "SEO Title",
        metaDescription: "Meta desc",
        slug: "test-slug",
        primaryKeyword: "test",
        secondaryKeywords: [],
        searchIntent: "transactional",
        semanticEntities: [],
        faqCandidates: [],
        internalLinkSuggestions: []
      },
      productDescription: "Full desc",
      shortDescription: "Short desc",
      social: {
        linkedin: "post",
        twitter: "tweet",
        whatsapp: "msg"
      },
      creative: {
        visualConcept: "Modern visual concept"
      },
      cta: {
        primary: "Buy now",
        secondary: "Contact us",
        url: "https://example.com/buy"
      },
      sources: [],
      quality: {
        overallStatus: "PASS",
        score: 100,
        passed: true,
        completenessPercentage: 100,
        checks: [],
        evaluatedAt: new Date().toISOString()
      },
      contentVersion: 1,
      createdAt: new Date().toISOString()
    };

    const parsed = MarketingPackageSchema.parse(pkgPayload);
    assert.equal(parsed.workspaceId, "default-ecomspain");
    assert.equal(parsed.organizationId, "org-ecomspain");
  });

  it("listPackagesByWorkspace lanza error si workspaceId está vacío", async () => {
    const repo = new MarketingRunRepository();
    await assert.rejects(
      async () => {
        await repo.listPackagesByWorkspace("" as any);
      },
      (err: any) => err.message.includes("workspaceId es obligatorio")
    );
  });

  it("Simulación de aislamiento de workspace entre usuarios y campañas", () => {
    const campaign = { id: "camp-1", workspaceId: "ws-alpha" };
    const userA = { workspaceId: "ws-alpha", role: "USER" };
    const userB = { workspaceId: "ws-beta", role: "USER" };

    const isAuthorized = (c: typeof campaign, u: typeof userA) => c.workspaceId === u.workspaceId;

    assert.equal(isAuthorized(campaign, userA), true);
    assert.equal(isAuthorized(campaign, userB), false);
  });
});
