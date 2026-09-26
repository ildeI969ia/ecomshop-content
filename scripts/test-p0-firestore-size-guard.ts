import assert from "assert";
import { ContentItem } from "../src/server/domain/types";
import { ContentRepository } from "../src/server/repositories";

async function testFirestoreSizeGuard() {
  console.log("=== Testing Firestore 1MB Size Guard & Base64 Pruning ===");

  const heavyBase64 = "data:image/jpeg;base64," + "A".repeat(1200000); // 1.2MB base64 string
  const heavyItem: ContentItem = {
    id: "content-test-oversized-1MB",
    workspaceId: "default-ecomspain",
    title: "Test Oversized Document",
    slug: "test-oversized-doc",
    category: "general",
    status: "DRAFT",
    currentVersion: 2,
    authorId: "user-123",
    canonicalBody: {
      html: `<p>Heavy article content</p><img src="${heavyBase64}" />`
    },
    linkedProductIds: [],
    linkedSourceIds: [],
    versions: [
      {
        version: 1,
        body: { oldHtml: heavyBase64 },
        changeSummary: "Version 1",
        editedByUserId: "user-123",
        isAIGenerated: true,
        timestamp: new Date().toISOString()
      },
      {
        version: 2,
        body: { currentHtml: heavyBase64 },
        changeSummary: "Version 2",
        editedByUserId: "user-123",
        isAIGenerated: true,
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user-123",
    updatedBy: "user-123"
  };

  const initialSize = JSON.stringify(heavyItem).length;
  console.log(`Documento original pesa: ${initialSize} bytes (${(initialSize / 1024 / 1024).toFixed(2)} MB)`);
  assert(initialSize > 1048576, "El documento original debe superar 1MB para la prueba");

  const repo = new ContentRepository();
  console.log("Invocando repo.save() con sanitización automática...");
  // upsertBySlug recortará la versión intermedia y reemplazará la imagen base64 pesada
  const result = await repo.upsertBySlug(heavyItem);

  const finalSize = JSON.stringify(result).length;
  console.log(`Documento sanitizado pesa: ${finalSize} bytes (${(finalSize / 1024).toFixed(2)} KB)`);
  assert(finalSize < 1048576, "El documento resultante DEBE ser menor a 1MB");

  console.log("✅ PASS: El filtro de tamaño sanitiza y poda cargas de >1MB correctamente.");
}

testFirestoreSizeGuard().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
