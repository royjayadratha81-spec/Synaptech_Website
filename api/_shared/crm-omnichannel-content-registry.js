// Versioned, provider-neutral content registry for Synaptech CRM channels.
//
// IMPORTANT:
// - Does not send messages or initiate calls.
// - Does not write to Supabase/Firebase.
// - Does not score or qualify leads.
// - Does not create Sales Ready states, opportunities or pipeline movements.
// - Provider adapters may read this content only after all routing and consent
//   checks have passed.

export const OMNICHANNEL_CONTENT_VERSION = "2026-09-16.v2";

export const BUSINESS_UNITS = Object.freeze({
  admissions: Object.freeze({
    key: "admissions",
    brand: "Synaptech Education",
    label: "Admission / Enrolment",
    menu_label: "Synaptech Education for Admission / Enrolment",
    owner_queue: "admissions_counsellor",
    default_pipeline_key: "admissions",
  }),
  business_solutions: Object.freeze({
    key: "business_solutions",
    brand: "Synaptech Solutions",
    label: "CRM, LMS, Website and AI Funnels",
    menu_label: "Synaptech Solutions for CRM, LMS, Website and AI Funnels",
    owner_queue: "business_solutions_sales",
    default_pipeline_key: "business_solutions",
  }),
});

const BUSINESS_UNIT_ALIASES = Object.freeze({
  "1": "admissions",
  admission: "admissions",
  admissions: "admissions",
  enrolment: "admissions",
  enrollment: "admissions",
  education: "admissions",
  synaptech_education: "admissions",
  "2": "business_solutions",
  business: "business_solutions",
  solutions: "business_solutions",
  business_solution: "business_solutions",
  business_solutions: "business_solutions",
  synaptech_solutions: "business_solutions",
});

const freezeQuestion = (question) => Object.freeze({
  required: true,
  channels: Object.freeze(["web", "whatsapp", "ai_call", "human_call"]),
  ...question,
  options: question.options ? Object.freeze([...question.options]) : undefined,
  channels: Object.freeze([...(question.channels || ["web", "whatsapp", "ai_call", "human_call"])]),
  depends_on: question.depends_on ? Object.freeze({ ...question.depends_on }) : undefined,
});

const ADMISSIONS_QUESTIONS = Object.freeze([
  freezeQuestion({
    key: "enquiry_relation",
    text: "Is this enquiry for you, your child, sibling, friend or relative?",
    voice_text: "First, is this enquiry for you, your child, sibling, friend, or relative?",
    answer_type: "single_choice",
    options: ["Myself", "My child", "My sibling", "My friend", "My relative"],
  }),
  freezeQuestion({
    key: "programme_interest",
    text: "Which programme are you interested in?",
    answer_type: "single_choice",
    options: [
      "Data Analytics",
      "Data Science",
      "Data Science with Generative AI and Agentic AI",
      "Need help choosing",
    ],
  }),
  freezeQuestion({
    key: "advanced_programme_recommendation",
    text: "Adding Gen AI & Agentic AI to Data Science lets you build beyond dashboards and predictions—for example, a sales-forecasting tool with an AI assistant that explains results, or a document assistant that automates follow-up tasks. These projects can strengthen your portfolio for data and AI roles. Outcomes depend on your skills and hiring requirements. Would you like to explore the advanced programme or keep your original choice? Either choice is welcome.",
    answer_type: "single_choice",
    required: false,
    depends_on: { key: "programme_interest", any_of: ["Data Analytics", "Data Science"] },
    options: [
      "Keep my selected programme",
      "Consider Data Science with Gen AI & Agentic AI",
      "Need guidance",
    ],
  }),
  freezeQuestion({
    key: "education_background",
    text: "What is your highest or current qualification and field of study?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "career_stage",
    text: "Are you currently a student, fresher, working professional or career returner?",
    answer_type: "single_choice",
    options: ["Student", "Fresher", "Working professional", "Career returner", "Other"],
  }),
  freezeQuestion({
    key: "location",
    text: "What is your city or locality?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "learning_mode",
    text: "Fees are the same for online, offline and hybrid learning. Classes are normally on weekends; weekdays require management approval and student availability. Which learning mode do you prefer?",
    answer_type: "single_choice",
    options: ["Offline", "Online", "Hybrid", "Need guidance"],
  }),
  freezeQuestion({
    key: "vaishali_attendance",
    text: "Would you be able to attend classes at Vaishali, Ghaziabad?",
    answer_type: "yes_no",
    required: false,
    depends_on: { key: "learning_mode", any_of: ["Offline", "Hybrid"] },
  }),
  freezeQuestion({
    key: "start_timeline",
    text: "When would you like to start?",
    answer_type: "single_choice",
    options: ["Immediately", "Within 30 days", "Within 1–3 months", "Later", "Not decided"],
  }),
  freezeQuestion({
    key: "primary_goal",
    text: "What is your primary learning or career goal?",
    answer_type: "single_choice",
    options: ["First job", "Career switch", "Promotion or upskilling", "Internship", "Academic support", "Other"],
  }),
  freezeQuestion({
    key: "prior_experience",
    text: "We teach coding and the required mathematics from the basics. Non-technical backgrounds are welcome; basic computer operations are enough to begin. Have you studied Python, SQL, statistics or data analytics before, or do you have any concerns about coding or maths?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "coding_math_confidence",
    text: "How confident do you feel about learning coding and maths with step-by-step faculty support? You do not need a technical background to start.",
    answer_type: "single_choice",
    options: ["Comfortable starting", "Worried about coding", "Worried about maths", "Worried about both"],
  }),
  freezeQuestion({
    key: "career_roles_interest",
    text: "Data and AI skills can support paths such as Data Analyst, Business Analyst, Data Scientist, Data Engineer, AI/ML Engineer and Generative AI Developer. The requirements vary by role. Which role interests you most?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "project_learning_interest",
    text: "You will practise on real-world projects such as sales forecasting and, in the advanced programme, AI document assistants. Learning includes assignments, capstones and live assessments, with lifetime LMS access for revision. Are you interested in hands-on projects?",
    answer_type: "single_choice",
    options: ["Yes", "I need guidance", "Not sure yet"],
  }),
  freezeQuestion({
    key: "laptop_readiness",
    text: "Do you have access to a laptop with at least 8 GB RAM?",
    answer_type: "single_choice",
    options: ["Yes", "I can arrange one", "I need advice"],
  }),
  freezeQuestion({
    key: "fee_counselling",
    text: "Would you like fee and EMI counselling or a programme comparison? Current promotional fees may be revised; our counsellor can confirm the offer's validity.",
    answer_type: "single_choice",
    options: ["Fee and EMI counselling", "Programme comparison", "Both", "Not required now"],
  }),
  freezeQuestion({
    key: "fast_track_interest",
    text: "For the Data Science with Gen AI & Agentic AI programme, would you prefer the regular 10-month format or the 6-month fast-track format?",
    answer_type: "single_choice",
    required: false,
    depends_on: { key: "programme_interest", any_of: ["Data Science with Generative AI and Agentic AI"] },
    options: ["Regular 10-month programme", "6-month fast-track programme", "Need guidance"],
  }),
  freezeQuestion({
    key: "payment_preference",
    text: "Would you prefer one-time payment or the no-cost EMI plan?",
    answer_type: "single_choice",
    options: ["One-time payment", "No-cost EMI", "Need to discuss"],
  }),
  freezeQuestion({
    key: "decision_authority",
    text: "Who will make the final course and fee decision?",
    answer_type: "single_choice",
    options: ["I will decide", "Parent or guardian", "We will decide together", "Another person"],
  }),
  freezeQuestion({
    key: "decision_authority_status",
    text: "Has the final decision-maker agreed in principle to the course and fee?",
    answer_type: "single_choice",
    options: ["Yes", "Likely, but needs discussion", "Not yet", "Decision-maker needs counselling"],
  }),
  freezeQuestion({
    key: "placement_support_required",
    text: "Our placement assistance includes interview preparation, mock interviews, GitHub and LinkedIn profiles, and portfolio support. We help successful candidates prepare for opportunities, including MNC roles; placement assistance does not guarantee a job or salary. Would you like placement support?",
    answer_type: "single_choice",
    options: ["Yes", "No", "Need more information"],
  }),
  freezeQuestion({
    key: "preferred_callback_time",
    text: "What is the best time for a counsellor to call you?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "whatsapp_consent",
    text: "May Synaptech Education contact you on WhatsApp regarding this enquiry?",
    answer_type: "explicit_consent",
    options: ["Yes, I consent", "No"],
  }),
  freezeQuestion({
    key: "ai_call_consent",
    text: "May Synaptech Education use an AI-assisted telephone call for qualification or follow-up?",
    answer_type: "explicit_consent",
    options: ["Yes, I consent", "No"],
  }),
  freezeQuestion({
    key: "human_handoff",
    text: "Would you like to speak with a human counsellor now or schedule a call?",
    answer_type: "single_choice",
    options: ["Speak now", "Schedule a call", "Continue digitally", "Not required now"],
  }),
]);

const BUSINESS_SOLUTIONS_QUESTIONS = Object.freeze([
  freezeQuestion({
    key: "solution_interest",
    text: "Which solution do you require?",
    answer_type: "multi_choice",
    options: ["CRM", "LMS", "Website", "AI qualification funnel", "WhatsApp automation", "AI telecalling", "Combined platform", "Other"],
  }),
  freezeQuestion({
    key: "organization_type",
    text: "What type of organization do you represent?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "business_scale",
    text: "Approximately how many enquiries or leads do you receive monthly, and how many students or customers and staff users do you have?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "lead_sources",
    text: "Which channels currently generate your enquiries or leads?",
    answer_type: "multi_choice",
    options: ["Website", "Meta ads", "Google ads", "WhatsApp", "Telephone", "Walk-ins or referrals", "Education portals", "Events", "Other"],
  }),
  freezeQuestion({
    key: "current_process",
    text: "How do you currently manage leads, admissions or sales, follow-ups and payments?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "business_problems",
    text: "What are the main problems or missed opportunities you want the new system to solve?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "integration_requirements",
    text: "Which existing systems, databases, cloud accounts or providers must be integrated?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "deployment_model",
    text: "Do you prefer SaaS, a white-label system or deployment in your own cloud?",
    answer_type: "single_choice",
    options: ["SaaS", "White-label", "Own cloud", "Need recommendation"],
  }),
  freezeQuestion({
    key: "go_live_timeline",
    text: "What is your target go-live timeline?",
    answer_type: "single_choice",
    options: ["Within 30 days", "1–3 months", "3–6 months", "More than 6 months", "Not decided"],
  }),
  freezeQuestion({
    key: "decision_authority",
    text: "Who will make the final decision and approve the technical and commercial requirements?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "budget_or_procurement",
    text: "Is there an approved budget range or procurement process we should understand?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "next_step",
    text: "What would you prefer next: a demo, proposal, technical discussion or callback?",
    answer_type: "single_choice",
    options: ["Product demo", "Proposal", "Technical discussion", "Human callback", "Continue digitally"],
  }),
  freezeQuestion({
    key: "whatsapp_consent",
    text: "May Synaptech Solutions contact you on WhatsApp regarding this enquiry?",
    answer_type: "explicit_consent",
    options: ["Yes, I consent", "No"],
  }),
  freezeQuestion({
    key: "ai_call_consent",
    text: "May Synaptech Solutions use an AI-assisted telephone call for qualification or follow-up?",
    answer_type: "explicit_consent",
    options: ["Yes, I consent", "No"],
  }),
  freezeQuestion({
    key: "preferred_callback_time",
    text: "What is the best time for a human consultation?",
    answer_type: "free_text",
  }),
]);

export const QUALIFICATION_QUESTION_SETS = Object.freeze({
  admissions: Object.freeze({
    version: OMNICHANNEL_CONTENT_VERSION,
    business_unit: "admissions",
    questions: ADMISSIONS_QUESTIONS,
  }),
  business_solutions: Object.freeze({
    version: OMNICHANNEL_CONTENT_VERSION,
    business_unit: "business_solutions",
    questions: BUSINESS_SOLUTIONS_QUESTIONS,
  }),
});

export const CHANNEL_SCRIPTS = Object.freeze({
  business_unit_selector: Object.freeze({
    version: OMNICHANNEL_CONTENT_VERSION,
    whatsapp:
      "Welcome to Synaptech. Please select the service you are interested in:\n1 — Synaptech Education for Admission / Enrolment\n2 — Synaptech Solutions for CRM, LMS, Website and AI Funnels\nReply 1 or 2.",
    ai_call:
      "Welcome to Synaptech. For admission or enrolment with Synaptech Education, say one. For CRM, LMS, website, or AI funnel solutions, say two.",
  }),
  admissions: Object.freeze({
    welcome_whatsapp:
      "Thank you for contacting Synaptech Education. I will ask a few questions to understand your learning goal and arrange the right counselling support.",
    welcome_ai_call:
      "Thank you for your interest in Synaptech Education. I am an AI-assisted advisor. I will ask a few questions to understand your learning goal. You may request a human counsellor at any time.",
    abandonment_whatsapp:
      "You were part-way through your Synaptech Education enquiry. Would you like to continue from the question where you stopped? Reply CONTINUE to resume or STOP to opt out.",
  }),
  business_solutions: Object.freeze({
    welcome_whatsapp:
      "Thank you for contacting Synaptech Solutions. I will ask a few questions to understand your CRM, LMS, website or AI automation requirement.",
    welcome_ai_call:
      "Thank you for contacting Synaptech Solutions. I am an AI-assisted advisor. I will ask a few questions about your business requirement. You may request a human consultant at any time.",
    abandonment_whatsapp:
      "You were part-way through your Synaptech Solutions enquiry. Would you like to continue from the question where you stopped? Reply CONTINUE to resume or STOP to opt out.",
  }),
});

export function normalizeBusinessUnit(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return BUSINESS_UNIT_ALIASES[normalized] || null;
}

export function getBusinessUnit(value) {
  const key = normalizeBusinessUnit(value);
  return key ? BUSINESS_UNITS[key] : null;
}

export function getQuestionSet(value) {
  const key = normalizeBusinessUnit(value);
  return key ? QUALIFICATION_QUESTION_SETS[key] : null;
}

export function getQuestion(value, questionKey) {
  const set = getQuestionSet(value);
  const normalizedKey = String(questionKey ?? "").trim().toLowerCase();
  return set?.questions.find((question) => question.key === normalizedKey) || null;
}

export function getChannelScript(value, scriptKey) {
  const key = normalizeBusinessUnit(value);
  const normalizedScriptKey = String(scriptKey ?? "").trim();
  if (!key || !normalizedScriptKey) return null;
  return CHANNEL_SCRIPTS[key]?.[normalizedScriptKey] || null;
}

export function listBusinessUnitOptions() {
  return Object.values(BUSINESS_UNITS).map((unit, index) => ({
    option: String(index + 1),
    key: unit.key,
    label: unit.menu_label,
  }));
}

export function validateContentRegistry() {
  const errors = [];
  const globalQuestionKeys = new Set();

  for (const [unitKey, unit] of Object.entries(BUSINESS_UNITS)) {
    const set = QUALIFICATION_QUESTION_SETS[unitKey];
    if (!set) errors.push(`Missing question set for ${unitKey}.`);
    if (!unit.owner_queue) errors.push(`Missing owner queue for ${unitKey}.`);
    if (!unit.default_pipeline_key) errors.push(`Missing pipeline key for ${unitKey}.`);

    const unitKeys = new Set();
    for (const question of set?.questions || []) {
      if (!question.key || !question.text || !question.answer_type) {
        errors.push(`Incomplete question definition in ${unitKey}.`);
      }
      if (unitKeys.has(question.key)) errors.push(`Duplicate question key ${unitKey}.${question.key}.`);
      unitKeys.add(question.key);
      globalQuestionKeys.add(question.key);
      if (question.answer_type === "explicit_consent" && !question.channels.includes("web")) {
        errors.push(`Consent question ${unitKey}.${question.key} must support web capture.`);
      }
    }

    for (const requiredKey of ["whatsapp_consent", "ai_call_consent", "preferred_callback_time"]) {
      if (!unitKeys.has(requiredKey)) errors.push(`Missing ${unitKey}.${requiredKey}.`);
    }
  }

  if (!CHANNEL_SCRIPTS.business_unit_selector?.whatsapp) {
    errors.push("Missing WhatsApp business-unit selector.");
  }
  if (!CHANNEL_SCRIPTS.business_unit_selector?.ai_call) {
    errors.push("Missing AI-call business-unit selector.");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    version: OMNICHANNEL_CONTENT_VERSION,
    business_units: Object.keys(BUSINESS_UNITS).length,
    unique_question_keys: globalQuestionKeys.size,
  });
}
