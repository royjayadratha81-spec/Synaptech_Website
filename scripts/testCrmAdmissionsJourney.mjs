import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getQuestionSet } from "../api/_shared/crm-omnichannel-content-registry.js";
import { prepareAdmissionsProfile, buildAdmissionsTurn } from "../api/_shared/crm-admissions-counselling.js";
import {
  buildJourneyProgress,
  captureJourneyAnswer,
} from "../api/_shared/crm-qualification-journey-progress.js";
import {
  ADMISSIONS_BROCHURE_PATH,
  ADMISSIONS_PROGRAMMES,
  ADMISSIONS_POLICIES,
} from "../api/_shared/admissions-programme-catalogue.js";

const messageBridgeSource = readFileSync(
  fileURLToPath(new URL("../api/engagement/business/message.js", import.meta.url)),
  "utf8"
);
const leadChatbotSource = readFileSync(
  fileURLToPath(new URL("../src/LeadChatbot.jsx", import.meta.url)),
  "utf8"
);
const appSource = readFileSync(fileURLToPath(new URL("../src/App.jsx", import.meta.url)), "utf8");
const registerSource = readFileSync(fileURLToPath(new URL("../src/pages/Register.jsx", import.meta.url)), "utf8");
const vercelConfig = JSON.parse(readFileSync(fileURLToPath(new URL("../vercel.json", import.meta.url)), "utf8"));
const brochureFile = fileURLToPath(
  new URL("../public/brochures/Brochure_Synaptech.pdf", import.meta.url)
);

assert.match(
  messageBridgeSource,
  /resolveConversation\(\{[\s\S]*?organizationId:[\s\S]*?leadId:[\s\S]*?businessUnit,?[\s\S]*?\}\)/,
  "The message bridge must use the signed business unit when reopening a conversation."
);
assert.match(messageBridgeSource, /answer_options/, "The message bridge must expose selectable answer options additively.");
assert.match(leadChatbotSource, /Brochure_Synaptech\.pdf/, "The admissions chatbot must expose the brochure.");
assert.match(leadChatbotSource, /Aira is preparing your guidance/, "The first admissions request must show a processing state.");
assert.match(leadChatbotSource, /synaptech:start-admissions-aira/, "The chatbot must accept public-form handoffs.");
assert.match(appSource, /synaptech:start-admissions-aira/, "The homepage contact form must hand off to Aira.");
assert.match(registerSource, /synaptech_pending_admissions_aira/, "Student registration must continue into Aira.");
assert.match(vercelConfig.rewrites[0].source, /brochures\//, "Static brochures must be excluded from the SPA rewrite.");
assert.ok(existsSync(brochureFile), "The admissions brochure must be present in public assets.");
assert.ok(statSync(brochureFile).size < 35 * 1024 * 1024, "The admissions brochure must remain below 35 MB.");

const admissions = getQuestionSet("admissions");
assert.ok(admissions);
assert.equal(admissions.business_unit, "admissions");
assert.ok(admissions.questions.length >= 20);

for (const requiredKey of [
  "programme_interest",
  "learning_mode",
  "start_timeline",
  "primary_goal",
  "whatsapp_consent",
  "ai_call_consent",
  "human_handoff",
  "payment_preference",
  "decision_authority",
  "decision_authority_status",
  "placement_support_required",
  "coding_math_confidence",
  "career_roles_interest",
  "project_learning_interest",
  "laptop_readiness",
]) {
  assert.ok(admissions.questions.some((question) => question.key === requiredKey));
}

assert.equal(admissions.questions.some((question) => question.key === "schedule_preference"), false);
assert.deepEqual(
  admissions.questions.find((question) => question.key === "programme_interest")?.options,
  [
    "Data Analytics",
    "Data Science",
    "Data Science with Generative AI and Agentic AI",
    "Need help choosing",
  ]
);

assert.equal(ADMISSIONS_PROGRAMMES.length, 3);
assert.equal(ADMISSIONS_PROGRAMMES[0].total_fee_including_gst, 28000);
assert.equal(ADMISSIONS_PROGRAMMES[1].total_fee_including_gst, 45000);
assert.equal(ADMISSIONS_PROGRAMMES[2].total_fee_including_gst, 53000);
assert.equal(ADMISSIONS_PROGRAMMES[2].fast_track.total_fee_including_gst, 69800);
assert.equal(ADMISSIONS_POLICIES.mode_fee_policy.includes("same"), true);
assert.equal(ADMISSIONS_POLICIES.standard_schedule, "Weekend classes");
assert.equal(ADMISSIONS_BROCHURE_PATH, "/brochures/Brochure_Synaptech.pdf");

const progress = buildJourneyProgress({
  businessUnit: "admissions",
  extractedFacts: [
    { field: "enquiry_relation", value: "Myself" },
    { field: "course_interest", value: "Data Science" },
    { field: "preferred_mode", value: "Offline" },
    { field: "joining_timeline", value: "Within 30 days" },
    { field: "whatsapp_consent", value: "Yes, I consent" },
    { field: "ai_call_consent", value: "No" },
    { field: "human_handoff", value: "Schedule a call" },
    { field: "payment_preference", value: "No-cost EMI" },
    { field: "decision_authority", value: "Parent or guardian" },
    { field: "decision_authority_status", value: "Yes" },
    { field: "placement_support_required", value: "Yes" },
  ],
  missingFields: ["educational_background"],
});

assert.deepEqual(progress.answered_question_keys, [
  "enquiry_relation",
  "programme_interest",
  "learning_mode",
  "start_timeline",
  "whatsapp_consent",
  "ai_call_consent",
  "human_handoff",
  "payment_preference",
  "decision_authority",
  "decision_authority_status",
  "placement_support_required",
]);
assert.equal(progress.next_question_key, "advanced_programme_recommendation");
assert.equal(progress.whatsapp_consent, true);
assert.equal(progress.ai_call_consent, false);
assert.equal(progress.callback_requested, true);
assert.equal(JSON.stringify(progress).includes("Data Science"), false);

let deterministicProfile = {};
const expectedSequence = [
  ["enquiry_relation", "Myself"],
  ["programme_interest", "Data Science"],
  ["advanced_programme_recommendation", "Keep my selected programme"],
  ["education_background", "BCA"],
  ["career_stage", "Fresher"],
  ["location", "Ghaziabad"],
  ["learning_mode", "Online"],
  ["start_timeline", "Immediately"],
  ["primary_goal", "First job"],
  ["prior_experience", "Python basics"],
  ["coding_math_confidence", "No concern"],
  ["career_roles_interest", "Generative AI Developer"],
  ["project_learning_interest", "Yes, strongly interested"],
  ["laptop_readiness", "Yes"],
  ["fee_counselling", "Fee and EMI counselling"],
  ["payment_preference", "No-cost EMI"],
  ["decision_authority", "We will decide together"],
  ["decision_authority_status", "Yes"],
  ["placement_support_required", "Yes"],
  ["preferred_callback_time", "5 PM"],
  ["whatsapp_consent", "Yes, I consent"],
  ["ai_call_consent", "No"],
  ["human_handoff", "Schedule a call"],
];
for (const [expectedQuestionKey, answer] of expectedSequence) {
  const before = buildJourneyProgress({ businessUnit: "admissions", extractedFacts: deterministicProfile });
  assert.equal(before.next_question_key, expectedQuestionKey);
  deterministicProfile = {
    ...deterministicProfile,
    ...captureJourneyAnswer("admissions", expectedQuestionKey, answer),
  };
  const after = buildJourneyProgress({ businessUnit: "admissions", extractedFacts: deterministicProfile });
  assert.notEqual(after.next_question_key, expectedQuestionKey, `${expectedQuestionKey} must not repeat after it is answered.`);
}
assert.equal(
  buildJourneyProgress({ businessUnit: "admissions", extractedFacts: deterministicProfile }).next_question_key,
  null,
  "The completed admissions journey must not repeat a prior question."
);

assert.match(messageBridgeSource, /admissionsTurn\?\.text \|\| nextQuestion\?\.text/, "Question text and options must come from the same registry question.");
assert.match(messageBridgeSource, /extractedFacts:\s*nextProfile/, "Journey progress must use accumulated answers.");
assert.match(messageBridgeSource, /scoreCrmLead/, "Each customer answer must feed the shared CRM scoring engine.");
assert.match(messageBridgeSource, /evaluateAndStoreCrmQualification/, "Each customer answer must feed the shared Sales-Ready qualification engine.");
assert.match(
  messageBridgeSource,
  /if \(!startDiscovery && businessUnit === "admissions"\)/,
  "Automatic public-answer recalculation must remain admissions-only and must not change the tested Education Solutions message flow."
);

// Real multi-turn navigation with intentionally premature AI completion flags.
// These must not hide the payment question or bypass later counselling.
const aiResult = { extracted_facts: {}, assistant_message: "AI reply", missing_fields: [],
  qualification_ready: true, human_handoff_required: true };
let scenarios = 0;
for (const course of ["Data Analytics", "Data Science", "Data Science with Generative AI and Agentic AI"]) {
  for (const selection of ["Both", "Programme comparison", "Fee and EMI counselling", "Not required now"]) {
    for (const upgrade of [false, true]) {
      let profile = prepareAdmissionsProfile({}, "Admission enquiry for Myself; location: Ghaziabad");
      let turn = buildAdmissionsTurn({ profile, start: true, aiResult });
      assert.equal(turn.question.key, "programme_interest");
      const seen = new Set();
      while (!turn.complete) {
        const key = turn.question.key;
        assert.ok(!seen.has(key), `Repeated question ${key}`);
        seen.add(key);
        let answer = turn.question.options?.[0] || "Provided detail";
        if (key === "programme_interest") answer = course;
        if (key === "advanced_programme_recommendation") answer = upgrade
          ? "Consider Data Science with Gen AI & Agentic AI" : "Keep my selected programme";
        if (key === "fee_counselling") answer = selection;
        if (key === "ai_call_consent") answer = "No";
        if (key === "human_handoff") answer = "Continue digitally";
        turn = buildAdmissionsTurn({ profile: turn.profile, message: answer, aiResult });
        if (key === "fee_counselling") {
          assert.equal(turn.complete, false);
          assert.equal(turn.links.length, selection === "Both" ? 2 : selection === "Not required now" ? 0 : 1);
          for (const link of turn.links) {
            const [path, anchor] = link.href.split("#");
            const html = readFileSync(fileURLToPath(new URL(`../public${path}`, import.meta.url)), "utf8");
            assert.ok(html.includes(`id="${anchor}"`));
          }
        }
        assert.ok(seen.size < 35, "Conversation must terminate");
      }
      for (const key of ["payment_preference", "decision_authority", "preferred_callback_time", "laptop_readiness", "project_learning_interest"]) assert.ok(seen.has(key));
      assert.equal(turn.profile.ai_call_consent, "No");
      assert.equal(turn.progress.ai_call_consent, false);
      assert.equal(turn.profile.course_interest, upgrade && course !== "Data Science with Generative AI and Agentic AI"
        ? "Data Science with Generative AI and Agentic AI" : course);
      scenarios++;
    }
  }
}
const initial = prepareAdmissionsProfile({}, "Admission enquiry for Myself; location: Delhi");
const interrupted = buildAdmissionsTurn({ profile: initial, message: "What is the fee?", aiResult });
assert.equal(interrupted.question.key, "programme_interest");
assert.equal(interrupted.profile.course_interest, undefined);
const invented = buildAdmissionsTurn({ profile: initial, start: true,
  aiResult: { ...aiResult, extracted_facts: { course_interest: "Data Science", payment_preference: "No-cost EMI", ai_call_consent: "Yes" } } });
assert.equal(invented.question.key, "programme_interest", "AI facts cannot skip unanswered questions");
assert.equal(invented.profile.ai_call_consent, undefined, "AI must not invent outbound consent");
assert.equal(invented.progress.ai_call_consent, false);

console.log(JSON.stringify({
  valid: true,
  conversation_scenarios: scenarios,
  business_unit: admissions.business_unit,
  questions: admissions.questions.length,
  explicit_consent_questions: 2,
  answer_text_exposed: false,
  provider_execution_requested: false,
  brochure_path: ADMISSIONS_BROCHURE_PATH,
}, null, 2));
