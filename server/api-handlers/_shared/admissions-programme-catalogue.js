// Authoritative, provider-neutral Synaptech Education admissions catalogue.
// It does not score leads, send communications, create opportunities or write
// to Firebase/Supabase. CRM intelligence may use it as grounded evidence.

export const ADMISSIONS_CATALOGUE_VERSION = "2026-09-18.v3";
export const ADMISSIONS_BROCHURE_PATH = "/brochures/Brochure_Synaptech.pdf";

export const ADMISSIONS_PROGRAMMES = Object.freeze([
  Object.freeze({
    key: "data_analytics",
    name: "Data Analytics",
    duration: "4 months",
    total_fee_including_gst: 28000,
    fast_track_available: false,
    one_time_discount: 0,
    emi: Object.freeze({ admission_fee: 10000, instalments: 2, instalment_amount: 9000 }),
  }),
  Object.freeze({
    key: "data_science",
    name: "Data Science",
    duration: "6 months",
    total_fee_including_gst: 45000,
    fast_track_available: false,
    one_time_discount: 0,
    emi: Object.freeze({ admission_fee: 15000, instalments: 3, instalment_amount: 10000 }),
  }),
  Object.freeze({
    key: "data_science_genai_agentic_ai",
    name: "Data Science with Gen AI & Agentic AI",
    duration: "10 months",
    total_fee_including_gst: 53000,
    fast_track_available: true,
    one_time_discount: 5000,
    emi: Object.freeze({ admission_fee: 25000, instalments: 3, instalment_amount: 9334 }),
    fast_track: Object.freeze({
      duration: "6 months",
      total_fee_including_gst: 69800,
      one_time_discount: 5000,
      emi: Object.freeze({ admission_fee: 30000, instalments: 3, instalment_amount: 13267 }),
    }),
  }),
]);

export const ADMISSIONS_POLICIES = Object.freeze({
  standard_schedule: "Weekend classes",
  weekday_schedule: "Weekday classes may be arranged only subject to management approval and student availability.",
  learning_modes: Object.freeze(["Online", "Offline", "Hybrid"]),
  mode_fee_policy: "The fee is the same for online, offline and hybrid modes.",
  emi_cost: "All listed EMIs are no-cost EMIs.",
  emi_due_date: "Every EMI must be paid by the 5th of the applicable month.",
  late_payment: "Delayed or missed payment may lead to cancellation of admission, subject to management review.",
  placement_support: "Eligible successful candidates receive interview preparation, mock interviews, GitHub and LinkedIn profile preparation, portfolio support and placement assistance for suitable opportunities across leading companies and fields. Employment is not guaranteed.",
  entry_support: "Learning begins from the foundation level. A prior coding background is not mandatory; normal computer-operation skills and willingness to practise are sufficient entry prerequisites.",
  practical_learning: "Learning includes hands-on real-world projects, capstone projects, assignments and live evaluations, supported by a dedicated LMS with continuing access for revision.",
  laptop_requirement: "A laptop with at least 8 GB RAM is recommended for practical work.",
  programme_guidance: "For freshers seeking broader AI-era career preparation, Synaptech generally recommends Data Science with Gen AI & Agentic AI. Data Analytics and Data Science remain focused options that may suit working professionals seeking targeted upskilling. Final suitability depends on the learner's goals and background.",
  career_paths: Object.freeze(["Data Analyst", "Data Scientist", "Business Analyst", "AI/ML Engineer", "Data Engineer", "AI Research Analyst", "Generative AI Developer"]),
  credential_context: "The curriculum is structured in academic collaboration with IIT Roorkee. Career and placement outcomes depend on the learner's performance, portfolio, interview results and employer selection.",
  fee_revision_notice: "The displayed fee is a limited-period offer and may be revised for future admissions. A counsellor must confirm the applicable fee before payment.",
  python_foundation_support: "Synaptech Education provides the first 10 Python programming sessions one-to-one with faculty so that learners can build confidence in programming concepts from the foundation level.",

offline_location: "Offline classes are conducted at Vaishali, Ghaziabad. A learner who cannot attend there should be guided toward Online or, where occasional attendance is possible, Hybrid learning.",

career_pathway_scope: "The Data Science with Gen AI & Agentic AI programme can prepare learners for more than 20 data and AI career pathways, including Data Analyst, Data Scientist, Business Analyst, AI/ML Engineer, Data Engineer, AI Research Analyst and Generative AI Developer. Eligibility and hiring outcomes depend on the learner's skills, portfolio, interview performance and employer requirements.",

delayed_callback_notice: "The displayed course fees and discounts are limited-period offers and may be revised or withdrawn. When a requested counselling call is 48 hours or more away, offer an earlier call while respecting the learner's final preference.",
});

export function getAdmissionsCatalogueEvidence() {
  return Object.freeze({
    version: ADMISSIONS_CATALOGUE_VERSION,
    brochure_path: ADMISSIONS_BROCHURE_PATH,
    programmes: ADMISSIONS_PROGRAMMES,
    policies: ADMISSIONS_POLICIES,
  });
}
