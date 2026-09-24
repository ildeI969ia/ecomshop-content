import { ECOMSHOP_FULL_CATALOG } from "../src/lib/data/ecomshop-catalog";
import { OFFICIAL_NOTEBOOK } from "../src/lib/notebooklm";

const notebookSourceIds = new Set(OFFICIAL_NOTEBOOK.sources.map(s => s.id));
console.log("Official Notebook Source IDs Count:", OFFICIAL_NOTEBOOK.sources.length);

const catalogSources = ECOMSHOP_FULL_CATALOG.map(p => ({
  sku: p.sku,
  brand: p.brand,
  name: p.name,
  catalogSourceId: p.notebookSource?.sourceId,
  catalogTitle: p.notebookSource?.title,
  inOfficialNotebook: notebookSourceIds.has(p.notebookSource?.sourceId),
  officialSource: OFFICIAL_NOTEBOOK.sources.find(s => s.id === p.notebookSource?.sourceId)
}));

console.log("\n--- CATALOG VS OFFICIAL NOTEBOOK MAPPING ---");
for (const item of catalogSources) {
  const status = item.inOfficialNotebook ? "RESOLVED" : "UNRESOLVED";
  console.log(`[${status}] SKU: ${item.sku.padEnd(16)} Brand: ${item.brand.padEnd(10)} DeclaredID: ${(item.catalogSourceId || "NONE").padEnd(10)} ResolvedInNotebook: ${item.inOfficialNotebook} | NotebookTitle: ${item.officialSource?.title || "NOT_FOUND"}`);
}

const resolvedCount = catalogSources.filter(c => c.inOfficialNotebook).length;
console.log(`\nTOTAL RESOLVED: ${resolvedCount} / ${catalogSources.length}`);
console.log(`TOTAL UNRESOLVED: ${catalogSources.length - resolvedCount} / ${catalogSources.length}`);
