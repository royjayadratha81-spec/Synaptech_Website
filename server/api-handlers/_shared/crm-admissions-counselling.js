import { ADMISSIONS_ANSWER_FIELDS, buildJourneyProgress, captureJourneyAnswer } from "./crm-qualification-journey-progress.js";
import { getQuestion } from "./crm-omnichannel-content-registry.js";

const CATALOGUE = "/catalogues/programme-fee-comparison.html";

export function prepareAdmissionsProfile(profile = {}, requirement = "") {
  if (profile._aira_answers) return profile;
  const relation = String(requirement).match(/Admission enquiry for ([^;]+);/i)?.[1];
  const location = String(requirement).match(/location:\s*(.+)/i)?.[1];
  const seed = { ...profile };
  if (relation && !seed.enquiry_relation) seed.enquiry_relation = relation.trim();
  if (location && !seed.location) seed.location = location.trim();
  return { ...seed, _aira_answers: { ...seed } };
}

// Conversation navigation is separate from commercial scoring. Only explicit
// customer answers advance it; AI-generated missing-field lists cannot end it.
export function buildAdmissionsTurn({ profile, message = "", start = false, aiResult }) {
  const before = buildJourneyProgress({ businessUnit: "admissions", extractedFacts: profile });
  const answer = start ? {} : captureJourneyAnswer("admissions", before.next_question_key, message);
  const answers = { ...profile._aira_answers, ...answer };
  const additionalFacts = Object.fromEntries(Object.entries(aiResult.extracted_facts || {})
    .filter(([field]) => !ADMISSIONS_ANSWER_FIELDS.includes(field) && field !== "_aira_answers"));
  const nextProfile = { ...profile, ...additionalFacts, ...answers, _aira_answers: answers };
  const progress = buildJourneyProgress({ businessUnit: "admissions", extractedFacts: nextProfile,
    qualificationReady: aiResult.qualification_ready, humanHandoffRequired: aiResult.human_handoff_required });
  const requestedHuman = !start && /^(?:please )?(?:connect me (?:to|with)|i (?:want|need) to (?:speak|talk) (?:to|with)) (?:a |the )?(?:human|counsellor|counselor)/i.test(message.trim());
  const question = requestedHuman ? null : getQuestion("admissions", progress.next_question_key);
  const complete = requestedHuman || !progress.next_question_key;
  const links = [];
  if (answer.counselling_interest && !/not required/i.test(answer.counselling_interest)) {
    if (/both|programme|program|course/i.test(answer.counselling_interest)) links.push({ label: "Compare programmes", href: `${CATALOGUE}#programmes` });
    if (/both|fee|emi/i.test(answer.counselling_interest)) links.push({ label: "View fees, discounts & EMI", href: `${CATALOGUE}#fees` });
  }
  let text = complete
    ? (requestedHuman ? "I have recorded your request for a human counsellor. You can also view the brochure below." : "Thank you. Your answers have been recorded for our admissions counsellor. You can view the brochure below.")
    : question.text;
  // Answer a student's own question without treating it as a qualification
  // answer. The pending question and its matching options remain available.
  if (!start && !Object.keys(answer).length && !complete && aiResult.assistant_message) {
    text = `${aiResult.assistant_message}\n\n${question.text}`;
  }
  if (links.length) text = `Here ${links.length > 1 ? "are both comparisons" : "is the comparison you requested"}. You can open the links and continue here.\n\n${text}`;
  return { profile: nextProfile, answer, facts: { ...additionalFacts, ...answer }, progress: {
    ...progress, next_question_key: question?.key || null,
    qualification_ready: !progress.next_question_key && aiResult.qualification_ready === true,
    human_handoff_required: requestedHuman || (!progress.next_question_key && aiResult.human_handoff_required === true),
  }, question, text, links, complete };
}
