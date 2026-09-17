import assert from "node:assert/strict";
import {
  buildJourneyProgress,
  mapDiscoveryFieldsToQuestionKeys,
} from "../api/_shared/crm-qualification-journey-progress.js";

assert.deepEqual(
  mapDiscoveryFieldsToQuestionKeys("business_solutions", [
    "product_interest",
    "timeline",
    "budget_range",
    "unknown_private_field",
  ]),
  ["solution_interest", "go_live_timeline", "budget_or_procurement"]
);

assert.deepEqual(
  mapDiscoveryFieldsToQuestionKeys("admissions", [
    "course_interest",
    "location",
    "joining_timeline",
    "whatsapp_consent",
    "human_handoff",
  ]),
  ["programme_interest", "location", "start_timeline", "whatsapp_consent", "human_handoff"]
);

const progress = buildJourneyProgress({
  businessUnit: "business_solutions",
  extractedFacts: [
    { field: "number_of_users", value: "800 enquiries" },
    { field: "decision_authority", value: "Director" },
  ],
  missingFields: ["integrations", "budget_range"],
  qualificationReady: false,
});

assert.deepEqual(progress.answered_question_keys, ["business_scale", "decision_authority"]);
assert.equal(progress.question_key, "decision_authority");
assert.equal(progress.next_question_key, "integration_requirements");
assert.equal("value" in progress, false);
assert.equal(JSON.stringify(progress).includes("800 enquiries"), false);
assert.equal(JSON.stringify(progress).includes("Director"), false);

const consentProgress = buildJourneyProgress({
  businessUnit: "admissions",
  extractedFacts: [
    { field: "whatsapp_consent", value: "Yes, I consent" },
    { field: "ai_call_consent", value: "No" },
    { field: "human_handoff", value: "Schedule a call" },
  ],
});
assert.equal(consentProgress.whatsapp_consent, true);
assert.equal(consentProgress.ai_call_consent, false);
assert.equal(consentProgress.callback_requested, true);

console.log(JSON.stringify({
  valid: true,
  mapped_business_fields: 3,
  mapped_admissions_fields: 5,
  answer_text_exposed: false,
  provider_execution_requested: false,
}, null, 2));
