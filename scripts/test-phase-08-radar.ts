import { OpportunityRadarService } from "../src/lib/services/opportunity-radar";

async function run() {
  console.log("=== TEST DE FASE 08: OPPORTUNITY RADAR & PRODUCT BRAIN ===");
  const radar = new OpportunityRadarService();
  const opportunities = await radar.getDailyOpportunities(3);

  console.log(`Oportunidades calculadas: ${opportunities.length}`);
  for (const opp of opportunities) {
    console.log(`\n--- Oportunidad #${opp.sku} ---`);
    console.log(`Acción: ${opp.actionTitle}`);
    console.log(`Puntuación Total: ${opp.scores.totalScore}/100 (Stock: ${opp.scores.stockScore}, Gap: ${opp.scores.contentGapScore}, Trend: ${opp.scores.marketTrendScore}, Bundle: ${opp.scores.bundleScore})`);
    console.log(`Enfoque Estratégico: ${opp.recommendedAngle} | Target: ${opp.targetSegment}`);
    console.log(`Bundle Sugerido: ${opp.suggestedBundle.mainSku} + ${opp.suggestedBundle.accessorySku} (${opp.suggestedBundle.accessoryName})`);
    console.log(`Razón del Bundle: ${opp.suggestedBundle.rationale}`);
    if (opp.productBrainProfile) {
      console.log(`Product Brain - Buyer Persona: ${opp.productBrainProfile.buyerPersonas[0]?.name}`);
      console.log(`Product Brain - Pitch: ${opp.productBrainProfile.buyerPersonas[0]?.pitchIn30Seconds}`);
      console.log(`Product Brain - Master Notebook ID: ${opp.productBrainProfile.masterNotebookId}`);
      console.log(`Product Brain - Evidencias Grounding: ${opp.productBrainProfile.notebookEvidenceChunks.length} fragmentos`);
    }
  }
}

run().catch(console.error);
