import assert from "node:assert/strict";
import {
  buildAbandonmentRecoveryPlan,
  firstRecoveryDueAt,
} from "../api/_shared/crm-abandonment-recovery-policy.js";

const highCompletion = buildAbandonmentRecoveryPlan({
  completionPercent: 80,
  score: 82,
  confidence: 94,
  highIntent: true,
  whatsappConsent: true,
  aiCallConsent: true,
  callbackConsent: true,
});
assert.equal(highCompletion.segment, "substantially_complete");
assert.deepEqual(highCompletion.actions.map((item) => item.channel), [
  "whatsapp", "whatsapp", "ai_call", "human_call",
]);
assert.equal(highCompletion.actions.at(-1).due_after_minutes, 120);

const mediumCompletion = buildAbandonmentRecoveryPlan({
  completionPercent: 45,
  whatsappConsent: true,
  aiCallConsent: true,
});
assert.equal(mediumCompletion.segment, "partially_complete");
assert.equal(mediumCompletion.actions.filter((item) => item.channel === "ai_call").length, 1);

const lowCompletion = buildAbandonmentRecoveryPlan({
  completionPercent: 10,
  whatsappConsent: true,
  aiCallConsent: true,
});
assert.equal(lowCompletion.segment, "minimally_complete");
assert.equal(lowCompletion.actions.some((item) => item.channel === "ai_call"), false);

const noConsent = buildAbandonmentRecoveryPlan({ completionPercent: 55 });
assert.equal(noConsent.actions.length, 0);
assert.match(noConsent.stop_reason, /No permitted recovery route/);

const suppressed = buildAbandonmentRecoveryPlan({
  completionPercent: 80,
  whatsappConsent: true,
  suppressed: true,
});
assert.equal(suppressed.segment, "suppressed");
assert.equal(suppressed.actions.length, 0);

const humanFirst = buildAbandonmentRecoveryPlan({
  completionPercent: 100,
  score: 92,
  confidence: 95,
  salesReady: true,
  qualificationComplete: true,
  callbackConsent: true,
});
assert.equal(humanFirst.segment, "completed_human_first");
assert.deepEqual(humanFirst.actions.map((item) => item.channel), ["human_call"]);

assert.equal(
  firstRecoveryDueAt("2026-09-15T10:00:00.000Z", mediumCompletion),
  "2026-09-15T11:00:00.000Z"
);

console.log(JSON.stringify({
  valid: true,
  tested_segments: [
    highCompletion.segment,
    mediumCompletion.segment,
    lowCompletion.segment,
    noConsent.segment,
    suppressed.segment,
    humanFirst.segment,
  ],
  provider_execution_requested: false,
}, null, 2));

