import assert from "node:assert/strict";
import { AIExecutionService } from "@/lib/services/ai-execution-service";

async function main(): Promise<void> {
  const service = new AIExecutionService();

  let calls = 0;
  const result = await service.generateJson({
    models: ["primary", "fallback"],
    timeoutMs: 100,
    generate: async (model) => {
      calls += 1;
      if (model === "primary") {
        throw new Error("primary unavailable");
      }
      return {
        text: "```json\n{\"ok\":true}\n```",
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };
    }
  });

  assert.equal(calls, 2);
  assert.deepEqual(result.parsed, { ok: true });
  assert.equal(result.model, "fallback");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.usageMetadata?.totalTokenCount, 15);

  await assert.rejects(
    () =>
      service.generateJson({
        models: ["invalid-json"],
        timeoutMs: 100,
        generate: async () => ({ text: "{invalid" })
      }),
    /AI_INVALID_JSON:invalid-json/
  );

  await assert.rejects(
    () =>
      service.generateJson({
        models: ["timeout"],
        timeoutMs: 5,
        generate: async () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ text: '{"ok":true}' }), 25)
          )
      }),
    /Timeout con modelo timeout/
  );

  console.log("Architecture execution tests: PASS");
}

void main().catch((error: unknown) => {
  console.error("Architecture execution tests: FAIL", error);
  process.exitCode = 1;
});
