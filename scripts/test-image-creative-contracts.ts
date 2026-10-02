import assert from "node:assert/strict";
import {
  ImageIntentAnalysisSchema,
  ImagePromptResultSchema,
} from "../src/lib/types/image-intelligence";
import { fallbackAnalysis } from "../src/lib/services/image-creative-engine";

const analysis = fallbackAnalysis({
  userIdea: "necesito un punto de acceso en una pared y gente conectándose",
  baseImage: "data:image/jpeg;base64,AA==",
  selectedSku: "TEST-AP",
  productContext: JSON.stringify({ sku: "TEST-AP", name: "Enterprise Access Point" }),
  channel: "B2B marketing",
  audience: "IT managers",
  requestedAspectRatio: "16:9",
});

assert.equal(ImageIntentAnalysisSchema.parse(analysis).recommendation.aspectRatio, "16:9");
assert.equal(analysis.qualification.questions.length, 0);

const prompt = ImagePromptResultSchema.parse({
  suggestedPrompt: "Professional B2B photograph of the exact access point mounted on a wall with professionals using Wi-Fi.",
  recommendedAspectRatio: "16:9",
  technicalNotes: "Product fidelity preserved.",
});

assert.ok(prompt.suggestedPrompt.length > 20);
console.log("image creative contract smoke tests: PASS");
