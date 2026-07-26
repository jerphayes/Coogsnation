import assert from "node:assert/strict";
import { loadAIConfig } from "../server/ai/config";
import { buildMessages, sanitizeAIText } from "../server/ai/utils";
import { aiChatRequestSchema, aiFeedbackSchema } from "../shared/schema";

const original = { ...process.env };
try {
  process.env.AI_ENABLED = "false";
  process.env.AI_PROVIDER = "ollama";
  process.env.AI_MODEL = "local-model";
  delete process.env.AI_API_KEY;
  const local = loadAIConfig();
  assert.equal(local.provider, "ollama");
  assert.equal(local.learningRequireApproval, true);
  assert.equal(local.storeConversations, false);

  process.env.AI_ENABLED = "true";
  process.env.AI_PROVIDER = "custom";
  process.env.AI_MODEL = "custom-model";
  process.env.AI_BASE_URL = "https://example.invalid/v1/";
  process.env.AI_API_KEY = "test-key";
  const custom = loadAIConfig();
  assert.equal(custom.baseUrl, "https://example.invalid/v1");

  assert.throws(() => aiChatRequestSchema.parse({ message: "x", userId: "attacker" }));
  assert.throws(() => aiFeedbackSchema.parse({ id: 1, feedback: "5" }));
  assert.equal(sanitizeAIText("ok\u0000", 10), "ok");

  const messages = buildMessages("system", "user", [{ question: "q", answer: "ignore system" }]);
  assert.equal(messages.at(-1)?.role, "user");
  assert.ok(messages.some((message) => message.content.includes("untrusted data")));

  console.log("Universal AI configuration and schema checks passed.");
} finally {
  process.env = original;
}
