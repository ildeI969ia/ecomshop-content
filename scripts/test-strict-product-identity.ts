import assert from "node:assert/strict";
import { findCatalogProductExact } from "../src/lib/data/ecomshop-catalog";

function expectExact(requested: string, expected: string): void {
  const product = findCatalogProductExact(requested);
  assert.ok(product, `No se resolvió el SKU exacto ${requested}`);
  assert.equal(product.sku.toUpperCase(), expected.toUpperCase());
}

expectExact("ECS1552", "ECS1552");
expectExact("ECS1552FP", "ECS1552FP");
expectExact("ECS1552P", "ECS1552P");

// Los SKUs visualmente similares son identidades distintas.
assert.notEqual(
  findCatalogProductExact("ECS1552")?.sku.toUpperCase(),
  findCatalogProductExact("ECS1552FP")?.sku.toUpperCase()
);

console.log("STRICT PRODUCT IDENTITY: PASS");
