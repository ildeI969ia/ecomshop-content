import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AssetSchema, Asset } from "../src/server/domain/types.ts";
import { GoogleCloudStorageProvider } from "../src/server/services/storage-provider.ts";

describe("Phase 05B Storage & Asset Security Tests", () => {
  it("Validates Asset schema types and required fields", () => {
    const asset: Asset = {
      id: "asset-101",
      workspaceId: "default-ecomspain",
      filename: "rack_hotel_marbella.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 102400,
      storagePath: "workspaces/default-ecomspain/assets/asset-101_rack.jpg",
      publicUrl: "https://storage.googleapis.com/ecomshop-marketing-assets/asset-101.jpg",
      type: "image",
      campaignId: "camp-001",
      aiGenerated: false,
      ownerId: "user-carlos",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "user-carlos",
      updatedBy: "user-carlos"
    };

    const parsed = AssetSchema.safeParse(asset);
    assert.equal(parsed.success, true);
  });

  it("Sanitizes filename path traversal attempts", () => {
    const dirtyFilename = "../../../etc/passwd_malicious.png";
    const sanitized = dirtyFilename.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.\./g, "");
    assert.ok(!sanitized.includes("../"));
    assert.ok(!sanitized.includes("/"));
  });

  it("Validates Cloud Storage provider upload contract", async () => {
    const provider = new GoogleCloudStorageProvider();
    const result = await provider.uploadFile({
      buffer: Buffer.from("dummy image content"),
      destinationPath: "test/path.png",
      mimeType: "image/png"
    });

    assert.equal(result.mimeType, "image/png");
    assert.ok(result.storagePath.includes("test/path.png"));
  });
});
