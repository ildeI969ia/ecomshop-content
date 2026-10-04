import { StructuredProductIntelligence } from "@/lib/services/notebook-intelligence";

export function generateDynamicComparativeTableHtml(intel: StructuredProductIntelligence): string {
  const productName = `${intel.brand} ${intel.model}`;
  const specs = intel.card.technicalSpecs;

  const rows = [
    ["SKU", intel.sku],
    ["Interfaces", specs.ports.join(" + ") || "No especificado"],
    ["Estándares", specs.standards.join(" / ") || "No especificado"],
    ["Alimentación", specs.powerRequirements || "No especificado"],
    ["Gestión", specs.management || "No especificado"],
    ["Diferenciadores", specs.keyDifferentiators.join(" · ") || "No especificado"]
  ];

  return `
<table class="w-full border-collapse my-6 text-sm">
  <thead>
    <tr class="bg-slate-900 text-white">
      <th class="p-3 text-left border border-slate-700">Dato verificable</th>
      <th class="p-3 text-left border border-slate-700 font-bold text-emerald-400">${productName}</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map(([label, value]) => `
    <tr class="bg-white">
      <td class="p-3 border border-slate-200 font-semibold">${label}</td>
      <td class="p-3 border border-slate-200 text-slate-900">${value}</td>
    </tr>`).join("")}
  </tbody>
</table>`.trim();
}
