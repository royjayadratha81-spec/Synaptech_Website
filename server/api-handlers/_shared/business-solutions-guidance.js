// Public Education Solutions guidance only. The CRM AI engine and admissions
// question flow remain shared and unchanged when no guidance is supplied.

const catalogue = {
  website: {
    label: "professional website",
    href: "/education-solutions#websites",
    scope: "A responsive website can explain services, earn trust, capture enquiries and connect to a CRM. The final pages, content system, SEO work, hosting and integrations depend on the client's goals.",
    questions: [
      "What should visitors do on your website: enquire, book, buy, apply or something else?",
      "Which pages and features do you need, such as service pages, a catalogue, booking or a customer portal?",
      "Do you already have a domain, brand assets and content, or should those be part of the project?",
    ],
  },
  lms: {
    label: "learning management system",
    href: "/education-solutions#lms",
    scope: "An LMS can bring learners, courses, live or recorded lessons, assignments, assessments, certificates and progress reporting together with appropriate roles.",
    questions: [
      "Who will use the LMS, and approximately how many learners and faculty members do you expect?",
      "Will learning be live, recorded, in person, or a combination?",
      "Which assessments, certificates, payments or existing tools need to be included?",
    ],
  },
  crm: {
    label: "customer relationship management system",
    href: "/education-solutions#crm-ai",
    scope: "A CRM can organize leads, sources, owners, follow-ups, pipeline stages, activity history and reports around a sales process.",
    questions: [
      "Where do your leads come from today, and how does your team follow them up?",
      "How many people would use the CRM and what pipeline stages do they need?",
      "Should the CRM connect to your website, email, WhatsApp or an existing system?",
    ],
  },
  crm_ai: {
    label: "CRM with AI lead qualification",
    href: "/education-solutions#crm-ai",
    scope: "A CRM with AI can capture enquiries, ask relevant discovery questions, summarize requirements and route context to a human representative. Human review and consent should be designed into the workflow.",
    questions: [
      "Which lead sources should flow into the CRM and what makes a lead qualified for your team?",
      "What should the AI ask before a lead is handed to a person?",
      "How should the team receive a qualified lead and continue the conversation?",
    ],
  },
  lms_crm_ai: {
    label: "LMS + CRM + AI platform",
    href: "/education-solutions#lms",
    scope: "This combination can connect enquiry and admission stages to learner records, course delivery, assessments and progress. The handoff between CRM and LMS should be planned around the institution's process.",
    questions: [
      "How do enquiries become enrolled learners in your current process?",
      "How many learners, counsellors and faculty members would use the combined platform?",
      "Which admission, payment, course and AI follow-up steps should be connected first?",
    ],
  },
  hrms: {
    label: "HRMS and workforce management",
    href: "/education-solutions#hrms",
    scope: "An HRMS can centralize employee records, attendance, shifts, leave, payroll inputs, approvals and performance workflows according to company policies.",
    questions: [
      "How many employees and locations need to be covered?",
      "Which HR processes should be digitized first: attendance, leave, payroll inputs, appraisal or approvals?",
      "Do you need to connect biometric devices, payroll or accounting tools?",
    ],
  },
  inventory: {
    label: "inventory and stock management",
    href: "/education-solutions#inventory",
    scope: "Inventory software can track items, SKUs, receipts, issues, warehouses, reorder points, suppliers and stock movement history.",
    questions: [
      "How many items and locations do you manage, and do you need batch or serial tracking?",
      "How are inward, outward, transfers and reorder decisions handled today?",
      "Should stock connect to purchasing, sales, accounting or an ERP?",
    ],
  },
  erp: {
    label: "ERP and operations management",
    href: "/education-solutions#business",
    scope: "An ERP can connect departments and structured workflows across purchasing, stock, sales, finance, projects and reporting. The module sequence should follow operational priorities.",
    questions: [
      "Which departments and workflows should be part of the first phase?",
      "What software or spreadsheets are you using now?",
      "How many users and locations should the ERP support?",
    ],
  },
  finance: {
    label: "finance, procurement and approvals software",
    href: "/education-solutions#business",
    scope: "A tailored workflow can manage purchase requests, vendors, expenses, payment approvals and management reporting, with accounting integrations scoped separately.",
    questions: [
      "Which requests and approvals are currently taking the most time?",
      "How many approval levels, departments and vendor records are involved?",
      "Should this connect to an existing accounting or ERP system?",
    ],
  },
  project_service: {
    label: "project or service management software",
    href: "/education-solutions#business",
    scope: "Project and service software can coordinate tasks, work orders, schedules, responsibilities, customer requests and progress reporting.",
    questions: [
      "Are you managing projects, field service, support tickets or a combination?",
      "How do you assign work and track completion today?",
      "Do customers or field teams need their own portal or mobile access?",
    ],
  },
  institution: {
    label: "institution management software",
    href: "/education-solutions#solutions",
    scope: "Institution software can connect enquiries, admissions, fees, batches, faculty, attendance, examinations and reporting, with LMS integration where useful.",
    questions: [
      "What type of institution is this and approximately how many students and staff are involved?",
      "Which processes need attention first: admissions, fees, academics, attendance or learning?",
      "What existing records or systems would need to be migrated or integrated?",
    ],
  },
  digital_marketing: {
    label: "digital marketing and lead generation",
    href: "/education-solutions#digital-marketing",
    scope: "A digital marketing plan can combine audience research, landing pages, search visibility, paid campaigns, conversion tracking and CRM follow-up. Results depend on the market, offer, execution and budget; never promise a lead volume or return.",
    questions: [
      "Which service or product do you want to promote, and who is your ideal customer?",
      "Which locations and channels matter most, and what campaigns have you already tried?",
      "How are enquiries qualified and followed up after a campaign?",
    ],
  },
  custom: {
    label: "custom software",
    href: "/education-solutions#business",
    scope: "A custom application should map the client's actual users, daily tasks, data, approvals and reporting before modules are chosen.",
    questions: [
      "Which daily process would you most like the software to improve?",
      "Who will use it and what information or approvals do they handle?",
      "Does it need to connect to any existing tools or records?",
    ],
  },
};

export function classifyBusinessCategory(text = "") {
  const value = String(text).toLowerCase();
  if (/\b(digital marketing|meta ads?|google ads?|linkedin ads?|paid campaigns?|social media marketing|seo|search engine optimization)\b/.test(value)) return "digital_marketing";
  if (/\b(lms|learning management)\b/.test(value) && /\bcrm\b/.test(value)) return "lms_crm_ai";
  if (/\bcrm\b/.test(value) && (/\bai\b|ai[- ]assisted lead|lead qualification/i).test(value)) return "crm_ai";
  if (/\b(website|web site|web design)\b/.test(value)) return "website";
  if (/\b(lms|learning management)\b/.test(value)) return "lms";
  if (/\bcrm\b/.test(value)) return "crm";
  if (/\bhrms\b|human resources|workforce management/.test(value)) return "hrms";
  if (/\binventory\b|\bstock\b|warehouse management/.test(value)) return "inventory";
  if (/\berp\b|enterprise resource planning/.test(value)) return "erp";
  if (/\bfinance\b|procurement|purchase approvals|expense management/.test(value)) return "finance";
  if (/\bproject management\b|service management|work orders?|support tickets?/.test(value)) return "project_service";
  if (/\binstitution management\b|school management/.test(value)) return "institution";
  if (/\blead generation\b/.test(value)) return "digital_marketing";
  return "custom";
}

export function resolveBusinessCategory(requirement = "", customerMessage = "", startDiscovery = false, rememberedCategory = "") {
  // The form stores "selected category — visitor's details" in one existing
  // CRM field. Keep the explicit selection authoritative over words in details.
  const original = classifyBusinessCategory(String(requirement).split(" — ")[0]);
  if (startDiscovery) return original;
  const message = String(customerMessage).trim();
  const explicitSwitch = /\b(?:actually|instead|switch|(?:i|we)\s+(?:just\s+|also\s+)?(?:need|want)|also need|also want|looking for|interested in|require|tell me about|ask about|what about|can you (?:build|create|offer|provide)|how does)\b/i.test(message);
  const nextCategory = classifyBusinessCategory(message);
  return explicitSwitch && (nextCategory !== "custom" || /\bcustom software\b|\bcustom application\b/i.test(message))
    ? nextCategory
    : catalogue[rememberedCategory] ? rememberedCategory : original;
}

export function buildBusinessConversationGuidance(categoryKey) {
  const category = catalogue[categoryKey] || catalogue.custom;
  return `
ADDITIONAL CUSTOMER-FACING INSTRUCTIONS FOR SYNAPTECH EDUCATION & DIGITAL SOLUTIONS:
You are Ask Avni, the assistant for this landing page. The visitor has selected ${category.label}.
This selection is ALREADY KNOWN. Do not ask which solution they require. Do not substitute a broad generic checklist or the phrase "main problems or missed opportunities" for a useful response.
The selected solution may change if the visitor explicitly changes their mind or asks about another product. Acknowledge the change and adapt rather than forcing the original category.
Answer the visitor's actual question FIRST in plain language. Use general domain knowledge to explain the solution, but never invent Synaptech-specific prices, outcomes, commitments, portfolio examples or technical integrations. Then, if useful, ask at most ONE specific next question that has not already been answered. A statement such as "I need a website" is a category clarification, not an answer to a different generic question; acknowledge it and ask about the website itself.
For this business-solutions conversation, a useful answer to a question takes precedence over the generic qualification checklist in the base instructions. Fill CRM fields only from actual customer evidence; do not force missing fields into the public answer.
If the visitor asks about cost, timing, warranty, commitments or a guaranteed outcome, explain the factors and offer a tailored discussion with a Synaptech representative. Do not invent prices, delivery promises, campaign results, client deployments or contracts.
Do not ask for budget, final decision authority or procurement details before the visitor's actual solution and key scope are understood, unless the visitor brings those topics up.
Respect the full recent conversation. Never repeat a question already asked or answered. Never invent customer facts. Do not present these example questions as a fixed script.
Relevant scope: ${category.scope}
Useful category-specific questions, to choose or adapt only when needed: ${category.questions.join(" | ")}
The landing page section for this category is ${category.href}. You may direct the visitor there if helpful.
If the client wants a human discussion, ask for a convenient call time, then hand over. Keep the tone professional, natural and helpful.
`.trim();
}

export function chooseBusinessAssistantReply({ aiText, categoryKey, recentMessages = [], customerMessage = "", startDiscovery = false }) {
  const category = catalogue[categoryKey] || catalogue.custom;
  const text = String(aiText || "").trim();
  const priorAssistant = recentMessages.filter((item) => item.role === "assistant").map((item) => String(item.message_text || "").trim());
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const repeated = text && priorAssistant.some((prior) => {
    const earlier = normalize(prior);
    const current = normalize(text);
    return earlier.length > 30 && (earlier === current || current.includes(earlier));
  });
  const generic = /what are the main problems or missed opportunities|which solution do you require|what type of organization do you represent|how do you currently manage leads, admissions or sales|what kind of (?:software|solution) are you looking for|tell me more about your requirement/i.test(text);
  if (text && !repeated && !generic) return text;
  const next = category.questions.find((question) => !priorAssistant.some((prior) => normalize(prior).includes(normalize(question)))) || "Would you like a Synaptech specialist to call you at a convenient time?";
  const query = String(customerMessage).toLowerCase();
  if (/\b(cost|price|pricing|budget|quote)\b/.test(query)) return `The cost depends on the features, integrations and scope. A Synaptech representative can prepare a tailored estimate after understanding your requirement. ${next}`;
  if (/\b(how long|timeline|delivery|launch date)\b/.test(query)) return `The implementation time depends on the scope, content, integrations and review stages. We can plan milestones with you once the requirements are clear. ${next}`;
  return `${startDiscovery ? "Thank you for your enquiry. " : "I understand. "}${category.scope} ${next}`;
}

export function getBusinessCategoryLinks(categoryKey) {
  const category = catalogue[categoryKey] || catalogue.custom;
  return [{ title: `Explore ${category.label}`, url: category.href }];
}
