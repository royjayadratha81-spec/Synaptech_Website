// Versioned, provider-neutral content registry for Synaptech CRM channels.
//
// IMPORTANT:
// - Does not send messages or initiate calls.
// - Does not write to Supabase/Firebase.
// - Does not score or qualify leads.
// - Does not create Sales Ready states, opportunities or pipeline movements.
// - Provider adapters may read this content only after all routing and consent
//   checks have passed.

export const OMNICHANNEL_CONTENT_VERSION = "2026-09-18.v3";

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
    key: "callback_delay_review",
    text: "The present course fees and discounts are limited-period offers and may be revised or withdrawn. Your requested call is at least 48 hours away. Would you like an earlier counsellor call so that the current offer can be checked sooner?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "callback_timing_bucket",
      any_of: ["More than 48 hours"],
    },
    options: [
      "Choose an earlier callback",
      "Keep my requested time",
    ],
  }),

  freezeQuestion({
    key: "revised_callback_time",
    text: "Please provide an earlier callback date and time in this format: DD-MM-YYYY, HH:MM AM/PM.",
    answer_type: "free_text",
    required: false,
    depends_on: {
      key: "callback_delay_review",
      any_of: ["Choose an earlier callback"],
    },
  }),

  freezeQuestion({
    key: "guidance_callback_time",
    text: "Please provide the preferred counsellor-call date and time in this format: DD-MM-YYYY, HH:MM AM/PM.",
    answer_type: "free_text",
    required: false,
    depends_on: {
      key: "guidance_callback_required",
      any_of: ["Yes"],
    },
  }),

  freezeQuestion({
    key: "programme_selection_guidance",
    text: "For focused reporting and dashboard skills, Data Analytics is the foundation route. Data Science adds predictive modelling. Data Science with Gen AI & Agentic AI combines data skills with intelligent automation and offers the broadest preparation for current data-and-AI roles, especially for freshers. Which option would you like to continue with?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "programme_interest",
      any_of: ["Need help choosing"],
    },
    options: [
      "Data Analytics",
      "Data Science",
      "Data Science with Gen AI & Agentic AI",
      "Schedule a counsellor call",
    ],
  }),
    freezeQuestion({
    key: "advanced_programme_recommendation",
    text: "Adding Gen AI & Agentic AI to Data Science lets you build beyond dashboards and predictions—for example, a sales-forecasting tool with an AI assistant that explains results, or a document assistant that automates follow-up tasks. This gives freshers broader preparation for data-and-AI roles, while Data Analytics and Data Science remain useful focused routes for working professionals who want targeted upskilling. Would you like the advanced programme, your original selection, or more guidance?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "programme_interest",
      any_of: ["Data Analytics", "Data Science"],
    },
    options: [
      "Keep my selected programme",
      "Consider Data Science with Gen AI & Agentic AI",
      "Need guidance",
    ],
  }),

  freezeQuestion({
    key: "advanced_programme_guidance",
    text: "Data Science combined with AI prepares you for high-demand careers by blending data analysis with intelligent automation. It can open diverse roles, stronger salary potential and long-term career resilience; actual outcomes depend on skills, portfolio, interviews and employer requirements. For a fresher, the Data Science with Gen AI & Agentic AI programme generally offers the broadest future-facing preparation. Are you convinced, or would you still prefer your original programme?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "advanced_programme_recommendation",
      any_of: ["Need guidance"],
    },
    options: [
      "Choose Data Science with Gen AI & Agentic AI",
      "Keep my selected programme",
      "Schedule a counsellor call",
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
    key: "learning_mode_guidance",
    text: "Online is best when regular travel to Vaishali is difficult. Offline provides full classroom attendance at Vaishali, Ghaziabad. Hybrid suits learners who mainly study online but can attend selected in-person sessions. Fees are the same in all three modes. Which mode suits you now?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "learning_mode",
      any_of: ["Need guidance"],
    },
    options: [
      "Online",
      "Offline",
      "Hybrid",
      "Schedule a counsellor call",
    ],
  }),
    freezeQuestion({
    key: "vaishali_attendance",
    text: "Would you be able to attend classes at Vaishali, Ghaziabad?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "learning_mode",
      any_of: ["Offline", "Hybrid"],
    },
    options: ["Yes", "No"],
  }),

  freezeQuestion({
    key: "vaishali_mode_recommendation",
    text: "Since regular attendance at Vaishali is not convenient, Online learning would be the most practical choice. Hybrid is also possible if you can attend selected sessions occasionally. Which option would you prefer?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "vaishali_attendance",
      any_of: ["No"],
    },
    options: [
      "Online",
      "Hybrid",
      "Schedule a counsellor call",
    ],
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
    text: "Do you have any concerns about learning coding or mathematics?",
    answer_type: "single_choice",
    options: [
      "No",
      "Yes",
      "Need guidance",
    ],
  }),

  freezeQuestion({
    key: "coding_math_confidence",
    text: "We teach from the very beginning, so no coding background is required; normal computer operations are enough to start. Learners from Arts, Commerce and other non-technical backgrounds can learn the programme. Synaptech also conducts the first 10 Python programming sessions one-to-one with faculty to build a strong foundation. Are you now gaining confidence to start?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "prior_experience",
      any_of: ["Yes", "Need guidance"],
    },
    options: [
      "Yes, I feel confident",
      "I still need counselling",
    ],
  }),

  freezeQuestion({
    key: "coding_counsellor_offer",
    text: "A counsellor can address your coding or mathematics concerns personally. Would you like us to schedule a human counselling call, or would you prefer to continue with Aira?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "coding_math_confidence",
      any_of: ["I still need counselling"],
    },
    options: [
      "Schedule a counsellor call",
      "Continue with Aira",
    ],
  }),
    freezeQuestion({
    key: "career_roles_interest",
    text: "The Data Science with Gen AI & Agentic AI programme can prepare you for more than 20 data-and-AI career pathways, including Data Analyst, Data Scientist, Business Analyst, AI/ML Engineer, Data Engineer, AI Research Analyst and Generative AI Developer. Eligibility varies by role. Were you aware of these prospects, and is there a role you would like to work toward?",
    answer_type: "free_text",
  }),
  freezeQuestion({
    key: "project_learning_interest",
    text: "You will practise on real-world projects such as sales forecasting and, in the advanced programme, AI document assistants. Learning includes assignments, capstones and live assessments, with lifetime LMS access for revision. Are you interested in hands-on projects?",
    answer_type: "single_choice",
    options: ["Yes", "I need guidance", "Not sure yet"],
  }),
    freezeQuestion({
    key: "project_learning_guidance",
    text: "Hands-on work helps turn concepts into interview-ready evidence. The programme includes real-world projects, capstones, assignments and live evaluations, plus continuing LMS access for revision. Would you like to continue with project-based learning or speak with a counsellor?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "project_learning_interest",
      any_of: ["I need guidance"],
    },
    options: [
      "Yes, project-based learning suits me",
      "Schedule a counsellor call",
    ],
  }),
  freezeQuestion({
    key: "laptop_readiness",
    text: "Do you have access to a laptop with at least 8 GB RAM?",
    answer_type: "single_choice",
    options: ["Yes", "I can arrange one", "I need advice"],
  }),
    freezeQuestion({
    key: "laptop_guidance",
    text: "A laptop with at least 8 GB RAM is recommended for practical work. You may arrange access before the hands-on sessions; a counsellor can also guide you on a suitable setup. What would you prefer?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "laptop_readiness",
      any_of: ["I need advice"],
    },
    options: [
      "I can arrange a suitable laptop",
      "Schedule a counsellor call",
    ],
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
    key: "fast_track_guidance",
    text: "The regular advanced programme runs for 10 months at a steadier pace. The 6-month fast-track covers the programme more intensively and requires a higher fee and stronger weekly commitment. Which format would you prefer?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "fast_track_interest",
      any_of: ["Need guidance"],
    },
    options: [
      "Regular 10-month programme",
      "6-month fast-track programme",
      "Schedule a counsellor call",
    ],
  }),
  freezeQuestion({
    key: "payment_preference",
    text: "Would you prefer one-time payment or the no-cost EMI plan?",
    answer_type: "single_choice",
    options: ["One-time payment", "No-cost EMI", "Need to discuss"],
  }),
    freezeQuestion({
    key: "payment_guidance",
    text: "One-time payment receives the applicable listed discount, while the EMI option divides the fee into the listed admission payment and no-cost instalments without a discount. A counsellor can confirm the exact plan for your chosen programme. How would you like to proceed?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "payment_preference",
      any_of: ["Need to discuss"],
    },
    options: [
      "One-time payment",
      "No-cost EMI",
      "Schedule a counsellor call",
    ],
  }),
  freezeQuestion({
    key: "decision_authority",
    text: "Who will make the final course and fee decision?",
    answer_type: "single_choice",
    options: ["I will decide", "Parent or guardian", "We will decide together", "Another person"],
  }),
    freezeQuestion({
    key: "guardian_call_preference",
    text: "Would you like us to schedule a counsellor call with your parent or guardian, or will you discuss the programme and fee with them yourself?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "decision_authority",
      any_of: [
        "Parent or guardian",
        "We will decide together",
      ],
    },
    options: [
      "Schedule a guardian call",
      "I will discuss with them myself",
    ],
  }),

  freezeQuestion({
    key: "guardian_contact_details",
    text: "Please share the guardian's contact number and email address for the counselling call. You may also include the preferred call date and time.",
    answer_type: "free_text",
    required: false,
    depends_on: {
      key: "guardian_call_preference",
      any_of: ["Schedule a guardian call"],
    },
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
    key: "placement_support_guidance",
    text: "Placement assistance includes interview preparation, mock interviews, GitHub and LinkedIn profile development, portfolio support and preparation for suitable roles across leading companies. Employment or salary cannot be guaranteed. Would you like this support or a counsellor call?",
    answer_type: "single_choice",
    required: false,
    depends_on: {
      key: "placement_support_required",
      any_of: ["Need more information"],
    },
    options: [
      "Yes, I want placement support",
      "No, not required",
      "Schedule a counsellor call",
    ],
  }),
    freezeQuestion({
    key: "preferred_callback_time",
    text: "What is the best date and time for a counsellor to call you? Please use: DD-MM-YYYY, HH:MM AM/PM.",
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
