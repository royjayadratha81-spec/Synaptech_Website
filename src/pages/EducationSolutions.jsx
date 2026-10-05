import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  FileText,
  GraduationCap,
  Headphones,
  Layers3,
  PackageCheck,
  ClipboardList,
  Wrench,
  Menu,
  MessageCircle,
  Network,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import synaptechLogo from "../assets/Synaptech_Education_Logo.png";
import dashboardBanner from "../assets/dashboard-banner.png";
import lmsStudentDashboard from "../assets/lms-student-dashboard.svg";
import lmsAdminDashboard from "../assets/lms-admin-dashboard.svg";
import heroBusiness from "../assets/solutions/hero-business.webp";
import learningStudio from "../assets/solutions/learning-studio.webp";
import inventoryOperations from "../assets/solutions/inventory-operations.webp";
import avniPortrait from "../assets/solutions/avni-portrait.webp";
import marketingStrategy from "../assets/solutions/marketing-strategy.webp";
import marketingAnalytics from "../assets/solutions/marketing-analytics.webp";
import "./education-solutions.css";
import { supabase } from "../supabase/supabase";
import DemoVideoExperience from "../components/business/DemoVideoExperience";
import { recordQualificationJourney } from "../utils/crmJourneyTelemetry";

const PHONE = "9560940039";
const PHONE_DISPLAY = "+91 95609 40039";
const EMAIL = "admission@synaptecheducation.in";

const requirementOptions = [
  "Professional website",
  "Learning Management System (LMS)",
  "Customer Relationship Management (CRM)",
  "CRM with AI lead qualification",
  "LMS + CRM + AI",
  "HRMS & workforce management",
  "Inventory & stock management",
  "ERP & operations management",
  "Finance, procurement & approvals",
  "Project or service management",
  "Institution management software",
  "Digital marketing & lead generation",
  "Other custom software",
];

// The CRM and the existing lead table both accept one requirement string.
// Keep their payload unchanged while making the visitor's choice explicit.
const describeRequirement = (category, detail) =>
  [category.trim(), detail.trim()].filter(Boolean).join(" — ");
const includesLms = (category) => /\blms\b|learning management/i.test(category);
const isLmsCategory = (categoryKey) => ["lms", "lms_crm_ai"].includes(categoryKey);

const suggestedPromptsByCategory = {
  website: ["Which pages should my website include?", "Can the enquiry form connect to CRM?", "How do you plan SEO for a new website?"],
  lms: ["Which LMS features should we start with?", "Can we run live and recorded classes?", "How are learner results tracked?"],
  crm: ["How would you organize our sales pipeline?", "Can it capture leads from our website?", "Can our team track follow-ups?"],
  crm_ai: ["How does AI qualify a lead?", "When does a person take over?", "Can we tailor the qualification questions?"],
  lms_crm_ai: ["How do CRM leads become LMS learners?", "Can AI help with admissions enquiries?", "Which modules should launch first?"],
  hrms: ["Can attendance and leave approvals connect?", "How are employee roles handled?", "Can payroll inputs be tracked?"],
  inventory: ["Can we track stock across locations?", "How do low-stock alerts work?", "Can purchasing connect to inventory?"],
  erp: ["Which ERP modules should launch first?", "Can we migrate our spreadsheets?", "How do departments share data?"],
  finance: ["Can purchase approvals be digitized?", "How are expenses tracked?", "Can it connect to accounting software?"],
  project_service: ["Can we manage work orders?", "How will teams track task status?", "Can customers see service updates?"],
  institution: ["Can admissions and fees connect?", "How are batches and faculty managed?", "Can this connect with an LMS?"],
  digital_marketing: ["How would you target qualified leads?", "Can campaigns connect to the CRM?", "Which channels fit my business?"],
  custom: ["How do we scope custom software?", "Can it connect to existing tools?", "How do you phase a project?"],
};

const solutionGroups = [
  {
    icon: GraduationCap,
    number: "01",
    title: "Learning Management Systems",
    description:
      "A complete digital learning environment for coaching institutes, schools, colleges, universities and corporate training teams.",
    items: [
      "Student & faculty portals",
      "Courses, modules & learning resources",
      "Assignments, projects & submissions",
      "Online tests, results & certificates",
      "Attendance, progress & performance analytics",
      "Role-based administration",
    ],
  },
  {
    icon: Users,
    number: "02",
    title: "HRMS & Workforce Management",
    description:
      "Professional HR platforms for startups, growing businesses and established organizations that need their people operations in one place.",
    items: [
      "Employee & department management",
      "Attendance, shifts & leave",
      "Payroll & payslips",
      "Performance appraisal & KPIs",
      "Loans, advances & reimbursements",
      "Transfer, posting, promotion & exit workflows",
    ],
  },
  {
    icon: Building2,
    number: "03",
    title: "Institution Management Software",
    description:
      "Bring academic and administrative operations together with software designed around the way your institution actually works.",
    items: [
      "Students, batches & faculty",
      "Admissions & enquiry management",
      "Fees & payment tracking",
      "Attendance & academic records",
      "Examinations & assessment workflows",
      "Reports, dashboards & analytics",
    ],
  },
  {
    icon: Network,
    number: "04",
    title: "Business Management Software",
    description:
      "Custom software for businesses that want to replace disconnected spreadsheets, manual processes and scattered tools with one system.",
    items: [
      "CRM & lead management",
      "ERP & operational workflows",
      "Inventory & stock management",
      "Finance & expense management",
      "Projects, tasks & approvals",
      "Custom dashboards & reporting",
    ],
  },
];

const websiteFeatures = [
  "Premium, responsive design",
  "Service, product & program pages",
  "Qualified enquiry & consultation flows",
  "Customer, team & organization profiles",
  "Content, case studies & announcements",
  "Search-friendly structure and fast performance",
];

const customSoftware = [
  { icon: PackageCheck, title: "Inventory & Stock", text: "Track receipts, issues, stock levels, warehouses and reorder points so teams know what is available." },
  { icon: ClipboardList, title: "Procurement & Vendors", text: "Bring purchase requests, supplier records, purchase orders and approvals into a clear workflow." },
  { icon: WalletCards, title: "Finance & Expense", text: "Organize expense claims, payments, budgets and approvals with a traceable record." },
  { icon: Wrench, title: "Projects & Service", text: "Assign tasks, track work orders, milestones, service requests and the team responsible." },
  { icon: Headphones, title: "Customer Support", text: "Give your team a shared view of tickets, conversations, resolution status and customer history." },
  { icon: BarChart3, title: "Analytics & MIS", text: "Turn operational data into dashboards and useful reports for quicker decisions." },
  { icon: FileText, title: "Workflow & Approvals", text: "Replace scattered email approvals with structured requests, routing and accountability." },
  { icon: Database, title: "Records & Asset Tracking", text: "Keep documents, equipment, ownership and history organized with role-based access." },
  { icon: Layers3, title: "ERP & Custom Applications", text: "Connect departments in one tailored system, or build the specialist tools your process needs." },
];

const audiences = [
  { icon: Rocket, title: "Startups", text: "Launch with a professional digital presence and management software that can grow with you." },
  { icon: Building2, title: "Growing Companies", text: "Replace manual work with connected systems for teams, operations, customers and management." },
  { icon: Users, title: "Established Organizations", text: "Modernize existing workflows with custom portals, dashboards and integrated applications." },
  { icon: GraduationCap, title: "Educational Institutions", text: "Websites, LMS, student portals and academic management systems under one technology partner." },
];

const faqs = [
  ["Do you build software from scratch?", "Yes. We can build a solution around your existing process, approval hierarchy, departments and reporting requirements rather than forcing you into a generic template."],
  ["Can you build both the website and the software?", "Yes. Synaptech can provide the public-facing website as well as the secure application used by your students, employees, faculty, customers or administrators."],
  ["Can the software be customized for our organization?", "Yes. Modules, roles, workflows, dashboards, forms and reports can be designed around your organization's requirements."],
  ["Can you work with an existing system?", "Yes. We can discuss modernization, new modules, integrations or a phased replacement depending on the system you already use."],
  ["Can you connect a CRM with AI?", "Yes. We can scope lead capture, qualification, routing, follow-ups and reporting around your sales process. AI features are planned with your team and approved data access."],
  ["Can we start with inventory and add other modules later?", "Yes. A focused stock and purchasing workflow can be the first phase, with HR, CRM, finance, service or reporting added as your operations evolve."],
  ["Can Synaptech help with digital marketing?", "Yes. We can discuss audience research, landing pages, paid campaigns, search visibility, conversion tracking and CRM follow-up. The channel plan and investment should match your market and objectives."],
  ["Do you provide support after development?", "Yes. We can discuss deployment, maintenance, improvements, training and ongoing technical support based on the project."],
];

const knowledgeFallbacks = [
  {
    keys: ["lms", "learning management"],
    answer: "An LMS can bring courses, modules, learning resources, assignments, projects, tests, results, certificates, attendance and progress tracking into one digital learning environment.",
  },
  {
    keys: ["hrms", "human resource", "hr software"],
    answer: "An HRMS can centralize employee records, departments, attendance, shifts, leave, payroll, appraisals, KPIs, reimbursements and approval workflows in one platform.",
  },
  {
    keys: ["erp", "business software"],
    answer: "Business management software can connect operational workflows such as CRM, ERP, inventory, finance, projects, approvals, reporting and management dashboards.",
  },
  {
    keys: ["crm"],
    answer: "A CRM helps teams organize leads, customer information, follow-ups, sales activity and reporting in one structured system.",
  },
];

function SectionLabel({ children, light = false }) {
  return (
    <div className={`mb-5 flex items-center gap-3 text-[12px] font-extrabold uppercase tracking-[0.24em] ${light ? "text-orange-300" : "text-orange-700"}`}>
      <span className={`h-px w-10 ${light ? "bg-orange-300" : "bg-orange-700"}`} />
      {children}
    </div>
  );
}

function ProductFrame({ children, className = "" }) {
  return (
    <div className={`rounded-[30px] border border-white/70 bg-white/80 p-3 shadow-[0_30px_80px_rgba(15,23,42,.12)] backdrop-blur-xl sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function MiniDashboard() {
  return (
    <ProductFrame className="relative">
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
        <img
          src={lmsAdminDashboard}
          alt="Synaptech LMS administration dashboard showing students, courses, submissions, attendance and analytics"
          className="block w-full h-auto"
        />
      </div>
      <div className="pointer-events-none absolute -right-3 -top-3 rounded-2xl border border-white bg-white px-4 py-2 shadow-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">LMS platform</div>
        <div className="mt-0.5 text-xs font-bold text-slate-800">Built around your institution</div>
      </div>
    </ProductFrame>
  );
}


function MotionShowcase({ onContact }) {
  const connectedSystems = [
    { icon: Code2, kicker: "01 / FIRST IMPRESSION", title: "Website & portals", text: "A clear experience that earns trust and captures the right enquiry." },
    { icon: GraduationCap, kicker: "02 / LEARNING", title: "LMS & education", text: "One place for courses, students, assessments and progress." },
    { icon: Network, kicker: "03 / RELATIONSHIPS", title: "CRM & AI", text: "Give every lead a path from first conversation to follow-up." },
    { icon: PackageCheck, kicker: "04 / OPERATIONS", title: "People & inventory", text: "Make daily work more visible, accountable and connected." },
  ];

  return (
    <section className="solutions-ecosystem text-white">
      <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-[.83fr_1.17fr] lg:px-10 lg:py-24">
        <div>
          <SectionLabel light>Designed to work together</SectionLabel>
          <h2 className="text-[38px] font-black leading-[1.05] tracking-[-0.045em] sm:text-5xl">A digital foundation, <span className="text-[#e9bf81]">made for real work.</span></h2>
          <p className="mt-6 max-w-xl text-[17px] leading-8 text-white/75">Your public website, team tools and customer data should support the same journey. We plan each piece around your process, then connect what needs to work together.</p>
          <button onClick={onContact} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#d79a52] px-7 py-4 text-sm font-black text-[#193b36] shadow-xl transition hover:-translate-y-1 hover:bg-[#e8b474]">Discuss your workflow <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="solutions-ecosystem-grid">
          {connectedSystems.map((system) => <div key={system.title} className="solutions-ecosystem-card">
            <div className="solutions-ecosystem-icon"><system.icon className="h-5 w-5" /></div>
            <small>{system.kicker}</small>
            <h3>{system.title}</h3>
            <p>{system.text}</p>
          </div>)}
        </div>
      </div>
    </section>
  );
}

function Chatbot({
  onContact,
}) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [chatRegistered, setChatRegistered] =
  useState(false);

const [chatRegistering, setChatRegistering] =
  useState(false);

  const [chatSession, setChatSession] =
  useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

const [chatRegistrationError, setChatRegistrationError] =
  useState("");

const [chatLead, setChatLead] =
  useState({
    name: "",
    phone: "",
    email: "",
    organization: "",
    requirementType: "",
    requirement: "",
  });
  const [messages, setMessages] =
  useState([]);
  const [chatDemoOffered, setChatDemoOffered] =
  useState(false);

const [showChatDemo, setShowChatDemo] =
  useState(false);

const [chatDemoDeclined, setChatDemoDeclined] =
  useState(false);

const [chatLiveDemoChoice, setChatLiveDemoChoice] =
  useState(null);
  const [chatLiveDemoPrompt, setChatLiveDemoPrompt] =
  useState(false);
const recordChatEngagementEvent = async (
  eventType,
  eventValue = null,
  metadata = {}
) => {
  try {
    if (!chatSession?.token) {
      return;
    }

    const response = await fetch(
      "/api/engagement/business/event",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_token: chatSession.token,
          event_type: eventType,
          event_value: eventValue,
          metadata,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      console.error(
        "CRM engagement event failed:",
        eventType,
        data?.error || response.status
      );
    }
  } catch (error) {
    console.error(
      "CRM engagement event error:",
      eventType,
      error
    );
  }
};

  const localFallback = (text) => {
    const lower = text.toLowerCase();

    if (/\b(cost|price|pricing|budget|how much)\b/.test(lower) && /\b(lms|learning management)\b/.test(lower)) {
      return "For a general market estimate, an LMS can range from a few lakh rupees for a focused/custom MVP to much higher budgets for a large production platform with multiple portals, assessments, analytics, integrations, mobile apps, payments and custom workflows. The exact figure depends heavily on scope, design, integrations and support. For a Synaptech-specific quote, use the enquiry form.";
    }

    if (/\b(how long|how much time|timeline|duration|weeks|months)\b/.test(lower) && /\blms\b/.test(lower)) {
      return "A typical custom LMS can take roughly 6–16+ weeks for design, development, testing and launch, depending on scope. A focused MVP may be faster, while a full platform with multiple portals, assessments, analytics, integrations and custom workflows can take longer.";
    }

    if (/\b(cost|price|pricing|budget|how much)\b/.test(lower) && /\b(website|web site)\b/.test(lower)) {
      return "Website pricing varies widely: a simple professional site is much less expensive than a custom web application with dashboards, logins, payments, CMS, integrations and business workflows. The number of pages, design complexity, content, integrations and backend requirements are the main cost drivers.";
    }

    if (/\blms\b/.test(lower)) {
      return "An LMS can bring courses, modules, learning resources, student and faculty portals, assignments, projects, assessments, results, certificates, attendance, progress tracking and analytics into one digital learning environment.";
    }

    if (/\b(hrms|human resource|hr software)\b/.test(lower)) {
      return "An HRMS can centralize employee records, departments, attendance, shifts, leave, payroll, appraisals, KPIs, reimbursements and approval workflows in one platform.";
    }

    if (/\b(erp|business software)\b/.test(lower)) {
      return "Business management software can connect CRM, ERP, inventory, finance, projects, approvals, reporting and management dashboards into a structured digital workflow.";
    }

    if (/\bcrm\b/.test(lower)) {
      return "A CRM helps teams organize leads, customer information, follow-ups, sales activity, communication and reporting in one structured system.";
    }

    return "I can answer general questions about LMS, website development, HRMS, ERP, CRM and custom management software. Ask about features, architecture, implementation time, typical costs, integrations, hosting, security, roles, workflows or analytics.";
  };
const registerChatLead =
  async (e) => {
    e?.preventDefault();

    if (chatRegistering) {
      return;
    }

    const name =
      chatLead.name.trim();

    const phone =
      chatLead.phone.trim();

    const email =
      chatLead.email.trim();

    const organization =
      chatLead.organization.trim();

    const requirement = describeRequirement(
      chatLead.requirementType,
      chatLead.requirement
    );

    if (
      !name ||
      !phone ||
      !requirement
    ) {
      setChatRegistrationError(
        "Please enter your name, phone number and select what you need."
      );
      return;
    }

    setChatRegistering(true);
    setChatRegistrationError("");

    try {
      // --------------------------------------------------
      // 1. Preserve existing Synaptech source lead capture
      // --------------------------------------------------

      const {
        error: sourceError,
      } = await supabase
        .from("synaptech_leads")
        .insert([
          {
            name,
            phone,

            email:
              email || null,

            organization:
              organization || null,

            requirement,
          },
        ]);

      if (sourceError) {
        throw sourceError;
      }

      // --------------------------------------------------
      // 2. Link source lead to CRM
      // --------------------------------------------------

      const startResponse =
        await fetch(
          "/api/engagement/business/start",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              phone,

              email:
                email || null,

              organization:
                organization || null,

              requirement,
            }),
          }
        );

      const startData =
        await startResponse.json();

      if (
        !startResponse.ok ||
        !startData?.session?.token
      ) {
        throw new Error(
          startData?.error ||
            "Unable to start AI Discovery."
        );
      }

      const secureSession = {
        id:
          startData.session.id,

        token:
          startData.session.token,

        expires_in:
          startData.session.expires_in,

        business_unit:
          startData.session.business_unit,
      };

      setChatSession(
        secureSession
      );

      // Keep chatbot session separate from
      // the enquiry-form session.
      sessionStorage.setItem(
        "synaptech_business_chat_engagement",
        JSON.stringify(
          secureSession
        )
      );

      // --------------------------------------------------
      // 3. Automatically start AI Discovery
      // --------------------------------------------------

      const discoveryResponse =
        await fetch(
          "/api/engagement/business/message",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              session_token:
                secureSession.token,

              start:
                true,
            }),
          }
        );

      const discoveryData =
        await discoveryResponse.json();

      if (
        !discoveryResponse.ok
      ) {
        throw new Error(
          discoveryData?.error ||
            "Unable to start AI Discovery."
        );
      }

      void recordQualificationJourney({
        sessionToken:
          secureSession.token,
        eventType:
          "qualification_started",
        progress:
          discoveryData?.journey_progress,
      });

      const firstQuestion =
        discoveryData
          ?.assistant_message
          ?.text;

      setMessages([
        {
          role: "assistant",

          text:
            firstQuestion ||
            `Thanks, ${name}. I have recorded your requirement. Let me ask a few questions so we can understand the right solution for you.`,
          links: discoveryData?.assistant_message?.links || [],
        },
      ]);
      setActiveCategory(discoveryData?.assistant_message?.category_key || null);

      setChatRegistered(true);

      // Meta lead event because chatbot has
      // now captured a real enquiry.
      if (window.fbq) {
        window.fbq(
          "trackSingle",
          "4651638568452914",
          "Lead"
        );
      }
    } catch (error) {
      console.error(
        "Business chatbot registration failed:",
        error
      );

      setChatRegistrationError(
        "We couldn't start the AI consultation right now. Please try again."
      );
    } finally {
      setChatRegistering(false);
    }
  };
  const sendMessage = async (preset) => {
  const value = (preset ?? input).trim();
  const normalizedValue =
  value.toLowerCase();

const isDemoRequest =
  normalizedValue.includes("request a demo") ||
  normalizedValue.includes("see a demo") ||
  normalizedValue.includes("show me a demo") ||
  normalizedValue.includes("watch a demo");

  if (
    !value ||
    typing ||
    !chatRegistered ||
    !chatSession?.token
  ) {
    return;
  }
  if (isDemoRequest && (activeCategory ? isLmsCategory(activeCategory) : includesLms(chatLead.requirementType))) {
  setMessages((current) => [
    ...current,
    {
      role: "user",
      text: value,
    },
    {
      role: "assistant",
      text:
        "Certainly. I can show you a short Synaptech LMS demonstration first. After watching it, you can decide whether you would like a personalised live demo with our team.",
    },
  ]);

  setInput("");
  setChatDemoOffered(true);
  setShowChatDemo(false);
  setChatDemoDeclined(false);
  setChatLiveDemoChoice(null);
  setChatLiveDemoPrompt(false);
recordChatEngagementEvent(
  "demo_offered",
  "lms_demo",
  {
    source: "ai_assistant",
    video: "LMS_Demo.mp4",
  }
);
  return;
}

  setMessages((current) => [
    ...current,
    {
      role: "user",
      text: value,
    },
  ]);

  setInput("");
  setTyping(true);

  try {
    const response = await fetch(
      "/api/engagement/business/message",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          session_token: chatSession.token,
          message: value,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem(
          "synaptech_business_chat_engagement"
        );
      }

      throw new Error(
        data?.error ||
          "AI Discovery is temporarily unavailable."
      );
    }

    void recordQualificationJourney({
      sessionToken:
        chatSession.token,
      eventType:
        "question_answered",
      progress:
        data?.journey_progress,
    });

    const answer =
      data?.assistant_message?.text;
    if (data?.assistant_message?.category_key) {
      setActiveCategory(data.assistant_message.category_key);
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",

        text:
          answer ||
          "Thank you. I have recorded that information.",
        links: data?.assistant_message?.links || [],

        action:
          data?.next_step === "human_handoff" ||
          data?.intelligence?.human_handoff_required === true,

        crmDiscovery: true,
      },
    ]);
  } catch (error) {
    console.error(
      "Business chatbot AI Discovery failed:",
      error
    );

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text:
          "Your enquiry is already safely recorded. I couldn't continue the AI consultation just now, but the Synaptech team can still follow up with you.",
        action: true,
      },
    ]);
  } finally {
    setTyping(false);
  }
};

  return (
    <>
      <div className={`fixed bottom-6 right-5 z-[150] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,.22)] backdrop-blur-2xl transition-all duration-300 ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}>
        <div className="bg-gradient-to-r from-[#103c3a] via-[#14665b] to-[#218477] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white/80 shadow-lg">
                <img src={avniPortrait} alt="Ask Avni assistant" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-base font-black">Ask Avni</div>
                <div className="text-xs text-white/80">AI assistant for digital solutions</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close chatbot">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

      <div className="max-h-[430px] space-y-3 overflow-y-auto bg-orange-50/30 p-4">
          {!chatRegistered && (
  <form
    onSubmit={
      registerChatLead
    }
    className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"
  >
    <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
      Start your AI consultation
    </div>

    <div className="mt-2 text-sm leading-6 text-slate-600">
      Tell Avni what your organization needs. She can discuss websites, LMS, CRM, HRMS, inventory, marketing and custom software before our team follows up.
    </div>

    <div className="mt-4 grid gap-3">
      <input
        required
        value={
          chatLead.name
        }
        onChange={(e) =>
          setChatLead(
            (current) => ({
              ...current,
              name:
                e.target.value,
            })
          )
        }
        placeholder="Your name *"
        className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-orange-400"
      />

      <input
        required
        value={
          chatLead.phone
        }
        onChange={(e) =>
          setChatLead(
            (current) => ({
              ...current,
              phone:
                e.target.value,
            })
          )
        }
        placeholder="Phone number *"
        className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-orange-400"
      />

      <input
        type="email"
        value={
          chatLead.email
        }
        onChange={(e) =>
          setChatLead(
            (current) => ({
              ...current,
              email:
                e.target.value,
            })
          )
        }
        placeholder="Email address"
        className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-orange-400"
      />

      <input
        value={
          chatLead.organization
        }
        onChange={(e) =>
          setChatLead(
            (current) => ({
              ...current,
              organization:
                e.target.value,
            })
          )
        }
        placeholder="Company / Institute"
        className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-orange-400"
      />

      <select
        required
        value={chatLead.requirementType}
        onChange={(e) => setChatLead((current) => ({ ...current, requirementType: e.target.value }))}
        className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-teal-500"
        aria-label="What solution do you need?"
      >
        <option value="">What solution do you need? *</option>
        {requirementOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>

      <textarea
        rows={3}
        value={
          chatLead.requirement
        }
        onChange={(e) =>
          setChatLead(
            (current) => ({
              ...current,
              requirement:
                e.target.value,
            })
          )
        }
        placeholder="A few details about your team, goals or current process (optional)"
        className="resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-orange-400"
      />
    </div>

    {chatRegistrationError && (
      <div className="mt-3 text-xs font-bold text-red-600">
        {
          chatRegistrationError
        }
      </div>
    )}

    <button
      type="submit"
      disabled={
        chatRegistering
      }
      className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50"
    >
      {chatRegistering
        ? "Starting AI consultation…"
        : "Continue with AI"}
    </button>
  </form>
)}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-slate-950 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
                {message.text}

                {message.sources?.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sources</div>
                    <div className="grid gap-1.5">
                      {message.sources.slice(0, 4).map((source, sourceIndex) => (
                        <a
                          key={`${source.url}-${sourceIndex}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[11px] font-bold text-orange-700 hover:text-orange-900"
                          title={source.title || source.url}
                        >
                          {source.title || source.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {message.action && (activeCategory ? isLmsCategory(activeCategory) : includesLms(chatLead.requirementType)) && (
  <button
    type="button"
    onClick={() => {
      setChatDemoOffered(true);
      setShowChatDemo(false);
      setChatDemoDeclined(false);
      setChatLiveDemoChoice(null);
      setChatLiveDemoPrompt(false);
    }}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-orange-600"
  >
    See a short Synaptech demo
    <ArrowRight className="h-3.5 w-3.5" />
  </button>
)}
              </div>
            </div>
          ))}
          {chatDemoOffered &&
  !showChatDemo &&
  !chatDemoDeclined &&
  !chatLiveDemoChoice && (
    <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">

      <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">
        Synaptech Demo
      </div>

      <div className="mt-2 text-sm font-black text-slate-950">
        Would you like to watch our short LMS demo?
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        This short video gives you an example of the type of digital learning platform Synaptech can build and customise.
      </p>

      <div className="mt-3 grid gap-2">

        <button
          type="button"
          onClick={() => {
  setShowChatDemo(true);

  recordChatEngagementEvent(
    "demo_accepted",
    "lms_demo",
    {
      source: "ai_assistant",
      video: "LMS_Demo.mp4",
    }
  );
}}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600"
        >
          Yes, show me the demo
        </button>

        <button
          type="button"
          onClick={() =>
            setChatDemoDeclined(true)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          Not right now
        </button>

      </div>

    </div>
)}





{chatDemoDeclined && (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
    No problem. Your requirement and AI consultation have already been recorded. You can request the demo whenever you're ready.
  </div>
)}
{chatLiveDemoPrompt &&
  !chatLiveDemoChoice && (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">

      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-green-700">
        Personalised Live Demo
      </div>

      <div className="mt-2 text-sm font-black leading-6 text-slate-950">
        Would you like Synaptech officials or developers to contact you for a personalised live demo?
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        Our team can demonstrate the platform according to your organization's actual requirements and answer your technical or commercial questions.
      </p>

      <div className="mt-4 grid gap-2">

        <button
          type="button"
          onClick={() => {
            setChatLiveDemoChoice("yes");
            setChatLiveDemoPrompt(false);
            recordChatEngagementEvent(
  "live_demo_requested",
  "yes",
  {
    source: "ai_assistant",
    requested_contact: true,
  }
);

            setMessages((current) => [
              ...current,
              {
                role: "assistant",
                text:
                  "Thank you. You have requested a personalised live demo. Synaptech can contact you using the details you already provided.",
              },
            ]);
          }}
          className="rounded-xl bg-green-600 px-4 py-3 text-xs font-black text-white hover:bg-green-700"
        >
          Yes, contact me for a live demo
        </button>

        <button
          type="button"
          onClick={() => {
            setChatLiveDemoChoice("no");
            setChatLiveDemoPrompt(false);
            recordChatEngagementEvent(
  "live_demo_declined",
  "no",
  {
    source: "ai_assistant",
    requested_contact: false,
  }
);

            setMessages((current) => [
              ...current,
              {
                role: "assistant",
                text:
                  "Thank you for viewing the Synaptech demo. Your requirement and AI consultation have already been recorded. You can request a live demo at any time.",
              },
            ]);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          Not right now
        </button>

      </div>

    </div>
)}
          {typing && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              AI is preparing an answer…
            </div>
          )}
        </div>

        {chatRegistered && (
        <div className="border-t border-slate-200 bg-white p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {[
  ...(suggestedPromptsByCategory[activeCategory] || suggestedPromptsByCategory.custom),
  ...(!chatDemoOffered &&
      !showChatDemo &&
      !chatLiveDemoChoice &&
      (activeCategory ? isLmsCategory(activeCategory) : includesLms(chatLead.requirementType))
    ? ["Can I request a demo?"]
    : []),
].map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-orange-50 px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-orange-300"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your reply or ask a question…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-medium outline-none"
            />
            <button
              onClick={() => sendMessage()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white hover:bg-orange-600"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>


          <div className="mt-2 text-center text-[10px] font-medium text-slate-400">
  AI-powered requirement discovery • Your responses help us understand the right solution for your organization.
</div>
        </div>
        )}
      </div>
{showChatDemo &&
  !chatLiveDemoChoice && (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

      <div className="relative w-[95vw] max-w-[1180px] overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-[0_40px_120px_rgba(0,0,0,.45)]">

        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">
              Synaptech Product Demo
            </div>

            <div className="mt-1 text-lg font-black text-slate-950 sm:text-2xl">
              LMS Platform Demonstration
            </div>
          </div>

          <button
  type="button"
  onClick={() => {
    setShowChatDemo(false);
    setChatLiveDemoPrompt(true);

    recordChatEngagementEvent(
      "demo_video_closed",
      "manual_close",
      {
        source: "ai_assistant",
        video: "LMS_Demo.mp4",
      }
    );

    recordChatEngagementEvent(
      "live_demo_offered",
      "after_demo_close",
      {
        source: "ai_assistant",
      }
    );
  }}
  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
  aria-label="Close demo"
>
  <X className="h-5 w-5" />
</button>

        </div>

        <div className="max-h-[82vh] overflow-y-auto bg-slate-50 p-4 sm:p-6">

          <DemoVideoExperience
            videoSrc="/videos/LMS_Demo.mp4"

            title="Synaptech LMS Demo"

            description="Watch this short demonstration. After the video, you can decide whether you would like a personalised live demo for your organization."

            onStarted={() => {
  console.log(
    "Chatbot demo video started"
  );

  recordChatEngagementEvent(
    "demo_video_started",
    "lms_demo",
    {
      source: "ai_assistant",
      video: "LMS_Demo.mp4",
    }
  );
}}

            onProgress={(percentage) => {
  console.log(
    `Chatbot demo progress: ${percentage}%`
  );

  recordChatEngagementEvent(
    `demo_video_${percentage}`,
    String(percentage),
    {
      source: "ai_assistant",
      video: "LMS_Demo.mp4",
      progress: percentage,
    }
  );
}}

            onCompleted={() => {
  console.log(
    "Chatbot demo video completed"
  );

  recordChatEngagementEvent(
    "demo_video_completed",
    "100",
    {
      source: "ai_assistant",
      video: "LMS_Demo.mp4",
      progress: 100,
    }
  );

  setShowChatDemo(false);
  setChatLiveDemoPrompt(true);

  recordChatEngagementEvent(
    "live_demo_offered",
    "after_demo",
    {
      source: "ai_assistant",
    }
  );
}}

            onLiveDemoYes={() => {
              setChatLiveDemoChoice("yes");
              setShowChatDemo(false);

              setMessages((current) => [
                ...current,
                {
                  role: "assistant",
                  text:
                    "Thank you. Your request for a personalised live demo has been recorded. The Synaptech team can contact you using the details you already provided.",
                },
              ]);
            }}

            onLiveDemoNo={() => {
              setChatLiveDemoChoice("no");
              setShowChatDemo(false);

              setMessages((current) => [
                ...current,
                {
                  role: "assistant",
                  text:
                    "Thank you for watching the demo. Your requirement and AI consultation are already recorded, and you can request a live demo later if you wish.",
                },
              ]);
            }}
          />

        </div>

      </div>

    </div>
)}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-5 z-[149] flex items-center gap-3 rounded-full bg-[#11685d] px-4 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(17,104,93,.3)] ring-4 ring-white hover:-translate-y-1 hover:bg-[#0c4f49]"
        aria-label="Open Ask Avni AI assistant"
      >
        <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-white">
          <img src={avniPortrait} alt="" className="h-full w-full object-cover" />
        </span>
        Ask Avni <span className="hidden text-white/70 sm:inline">• AI assistant</span>
      </button>
    </>
  );
}

export default function EducationSolutions() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showContact, setShowContact] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [submitMessage, setSubmitMessage] = useState("");
const [engagementSession, setEngagementSession] = useState(() => {
  try {
    const saved = sessionStorage.getItem(
      "synaptech_business_engagement"
    );

    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
});

const [form, setForm] = useState({
  name: "",
  phone: "",
  email: "",
  organization: "",
  requirementType: "",
  requirement: ""
});
const [submittedCategory, setSubmittedCategory] = useState("");
const [discoveryCategory, setDiscoveryCategory] = useState(null);
const [discoveryActive, setDiscoveryActive] =
  useState(false);

const [discoveryLoading, setDiscoveryLoading] =
  useState(false);

const [discoveryInput, setDiscoveryInput] =
  useState("");

const [discoveryMessages, setDiscoveryMessages] =
  useState([]);

const [discoveryComplete, setDiscoveryComplete] =
  useState(false);

const [leadDisplayName, setLeadDisplayName] =
  useState("");
  const [showFormDemo, setShowFormDemo] =
  useState(false);

const [formDemoDeclined, setFormDemoDeclined] =
  useState(false);

const [formLiveDemoChoice, setFormLiveDemoChoice] =
  useState(null);

const [formDemoStarted, setFormDemoStarted] =
  useState(false);

  useEffect(() => {
    document.title = "Websites, LMS, CRM & AI, Business Software and Digital Marketing | Synaptech";
    window.scrollTo(0, 0);
        // Meta Pixel for Education Solutions landing page
    if (window.fbq) {
      window.fbq("init", "4651638568452914");
      window.fbq("trackSingle", "4651638568452914", "PageView");
    }

  }, []);

  const openDemo = () => {
    setShowContact(true);
    setMobileOpen(false);
  };

  const closeDemo = () => setShowContact(false);
  const startBusinessDiscovery = async (
  secureSession
) => {
  if (!secureSession?.token) {
    throw new Error(
      "Engagement session is unavailable."
    );
  }

  setDiscoveryLoading(true);

  try {
    const response = await fetch(
      "/api/engagement/business/message",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          session_token:
            secureSession.token,
          start:
            true,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Unable to start AI Discovery."
      );
    }

    void recordQualificationJourney({
      sessionToken:
        secureSession.token,
      eventType:
        "qualification_started",
      progress:
        data?.journey_progress,
    });

    const firstQuestion =
      data?.assistant_message?.text;

    if (!firstQuestion) {
      throw new Error(
        "AI Discovery returned no question."
      );
    }

    setDiscoveryMessages([
      {
        role: "assistant",
        text: firstQuestion,
      },
    ]);
    setDiscoveryCategory(data?.assistant_message?.category_key || null);

    setDiscoveryActive(true);

    if (
      data?.next_step ===
        "human_handoff" ||
      data?.intelligence
        ?.human_handoff_required ===
        true
    ) {
      setDiscoveryComplete(true);
    }
  } finally {
    setDiscoveryLoading(false);
  }
};

const sendBusinessDiscoveryReply =
  async () => {
    const value =
      discoveryInput.trim();

    if (
      !value ||
      discoveryLoading ||
      !engagementSession?.token
    ) {
      return;
    }

    setDiscoveryMessages(
      (current) => [
        ...current,
        {
          role: "customer",
          text: value,
        },
      ]
    );

    setDiscoveryInput("");
    setDiscoveryLoading(true);

    try {
      const response = await fetch(
        "/api/engagement/business/message",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session_token:
              engagementSession.token,
            message:
              value,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to continue AI Discovery."
        );
      }

      void recordQualificationJourney({
        sessionToken:
          engagementSession.token,
        eventType:
          "question_answered",
        progress:
          data?.journey_progress,
      });

      const aiText =
        data?.assistant_message?.text;
      if (data?.assistant_message?.category_key) {
        setDiscoveryCategory(data.assistant_message.category_key);
      }

      if (aiText) {
        setDiscoveryMessages(
          (current) => [
            ...current,
            {
              role: "assistant",
              text: aiText,
            },
          ]
        );
      }

      if (
        data?.next_step ===
          "human_handoff" ||
        data?.intelligence
          ?.human_handoff_required ===
          true
      ) {
        setDiscoveryComplete(true);
      }
    } catch (error) {
      console.error(
        "Business AI Discovery reply failed:",
        error
      );

      setDiscoveryMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            text:
              "I couldn't continue the qualification just now. Your enquiry is already safely recorded, and our team can still follow up with you.",
          },
        ]
      );
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const submitEnquiry = async (e) => {
  e.preventDefault();

  if (submitting) return;

  if (!form.requirementType) {
    setSubmitMessage("Please choose the solution you are interested in.");
    return;
  }

  setSubmitting(true);
  setSubmitMessage("");
  setSubmittedCategory(form.requirementType);
  setDiscoveryCategory(null);
  setShowFormDemo(false);
setFormDemoDeclined(false);
setFormLiveDemoChoice(null);
setFormDemoStarted(false);

  try {
    const { error } = await supabase
  .from("synaptech_leads")
  .insert([
    {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      organization: form.organization.trim() || null,
      requirement: describeRequirement(form.requirementType, form.requirement),
    },
  ]);

    if (error) {
  console.error("Supabase lead submission error:", error);
  throw error;
}
// Securely link this exact enquiry to the CRM / AI engagement funnel.
// This is additive and does not change the existing lead capture.
try {
  const engagementResponse = await fetch(
    "/api/engagement/business/start",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        organization: form.organization.trim() || null,
        requirement: describeRequirement(form.requirementType, form.requirement),
      }),
    }
  );

  if (!engagementResponse.ok) {
    console.error(
      "CRM engagement bridge returned:",
      engagementResponse.status
    );
  } else {
    const engagementData = await engagementResponse.json();

    if (
  engagementData.success &&
  engagementData.session?.token
) {
  const secureSession = {
    id:
      engagementData.session.id,

    token:
      engagementData.session.token,

    expires_in:
      engagementData.session.expires_in,

    business_unit:
      engagementData.session.business_unit,
  };

  setEngagementSession(
    secureSession
  );

  sessionStorage.setItem(
    "synaptech_business_engagement",
    JSON.stringify(
      secureSession
    )
  );

  setLeadDisplayName(
    form.name.trim()
  );

  try {
    await startBusinessDiscovery(
      secureSession
    );
  } catch (discoveryError) {
    console.error(
      "Automatic AI Discovery start failed:",
      discoveryError
    );

    setSubmitMessage(
      "Your enquiry has been successfully received. Our team will follow up with you."
    );
  }
}

    console.log("CRM engagement session started:", {
      success: engagementData.success,
      linked: engagementData.lead?.linked,
      newly_created_in_crm:
        engagementData.lead?.newly_created_in_crm,
      next_step: engagementData.next_step,
    });
  }
} catch (engagementError) {
  // CRM engagement must never prevent the original enquiry
  // from being successfully submitted.
  console.error(
    "CRM engagement bridge unavailable:",
    engagementError
  );
}

// Meta Pixel: track a Lead only after successful enquiry submission
if (window.fbq) {
  window.fbq("trackSingle", "4651638568452914", "Lead");
}


    setForm({
      name: "",
      phone: "",
      email: "",
      organization: "",
      requirementType: "",
      requirement: "",
    });

  } catch (error) {
    console.error("Lead submission failed:", error);

    setSubmitMessage(
      "We couldn't submit your enquiry right now. Please try again or contact us on WhatsApp."
    );
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="solutions-page min-h-screen overflow-x-hidden bg-[#f8f6ef] text-slate-900 selection:bg-teal-200 selection:text-slate-950">
      <header className="solutions-header sticky top-0 z-[100] border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[82px] max-w-[1480px] items-center justify-between px-5 lg:px-10">
          <a href="#top" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <img src={synaptechLogo} alt="Synaptech Education & Digital Solutions" className="h-11 w-auto object-contain" />
            <div className="hidden sm:block">
              <div className="text-base font-black tracking-tight text-slate-950">SYNAPTECH</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Education & Digital Solutions</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-[14px] font-bold text-slate-700 xl:flex">
            <a href="#solutions" className="transition hover:text-orange-600">Solutions</a>
            <a href="#websites" className="transition hover:text-orange-600">Websites</a>
            <a href="#lms" className="transition hover:text-orange-600">LMS</a>
            <a href="#crm-ai" className="transition hover:text-orange-600">CRM & AI</a>
            <a href="#business" className="transition hover:text-orange-600">Business Apps</a>
            <a href="#digital-marketing" className="transition hover:text-orange-600">Marketing</a>
            <a href="#process" className="transition hover:text-orange-600">Our Process</a>
          </nav>

          <button onClick={openDemo} className="hidden rounded-full bg-slate-950 px-6 py-3.5 text-[15px] font-black text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-orange-950 lg:block">
            Request a Free Consultation
          </button>
          <button className="rounded-xl p-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">{mobileOpen ? <X /> : <Menu />}</button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-6 lg:hidden">
            <div className="grid gap-5 text-base font-bold">
              {[
                ["#solutions", "Solutions"],
                ["#websites", "Websites"],
                ["#lms", "LMS"],
                ["#crm-ai", "CRM & AI"],
                ["#hrms", "HRMS"],
                ["#inventory", "Inventory"],
                ["#business", "Business Software"],
                ["#digital-marketing", "Digital Marketing"],
                ["#process", "How We Work"],
              ].map(([href, label]) => <a key={href} href={href} onClick={() => setMobileOpen(false)}>{label}</a>)}
              <button onClick={openDemo} className="rounded-2xl bg-slate-950 px-5 py-4 text-left text-white">Request a Free Consultation →</button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="solutions-hero relative overflow-hidden border-b border-slate-200">
          <div className="solutions-hero-orb pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full blur-3xl" />

          <div className="solutions-hero-grid relative mx-auto grid max-w-[1480px] items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:py-24 xl:gap-16">
            <div>
              <SectionLabel>For business & education</SectionLabel>
              <h1 className="max-w-5xl text-[48px] font-black leading-[1.01] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[78px]">
                Your next stage deserves <span className="solutions-gradient-text">better systems.</span>
              </h1>
              <p className="mt-8 max-w-3xl text-[18px] font-medium leading-8 text-slate-600 sm:text-[20px]">
                Beautiful websites. Connected LMS, CRM and HRMS platforms. Inventory software and digital marketing that help the right people discover you and move forward. One thoughtful partner for business and education.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <button onClick={openDemo} className="solutions-primary-button group inline-flex items-center justify-center gap-3 rounded-full px-7 py-4 text-[16px] font-black text-white transition hover:-translate-y-1">
                  Plan My Solution <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </button>
                <a href="#solutions" className="solutions-secondary-button inline-flex items-center justify-center gap-3 rounded-full border px-7 py-4 text-[16px] font-black text-slate-900 shadow-sm transition hover:-translate-y-1">
                  Explore Our Solutions <ChevronDown className="h-5 w-5" />
                </a>
              </div>
              <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4 border-t border-slate-200 pt-7 sm:grid-cols-4">
                {[[ShieldCheck, "Thoughtfully built"], [Zap, "Scalable"], [Code2, "Made for you"], [Sparkles, "AI-enabled"]].map(([I, t]) => (
                  <div key={t} className="flex items-center gap-2.5 text-sm font-extrabold text-slate-700"><I className="h-5 w-5 text-orange-500" />{t}</div>
                ))}
              </div>
            </div>

            <figure className="solutions-hero-visual relative">
              <img src={heroBusiness} alt="Indian business team reviewing connected digital operations" className="solutions-hero-image" fetchPriority="high" />
              <figcaption className="solutions-hero-caption">
                <span className="solutions-caption-mark"><Sparkles className="h-5 w-5" /></span>
                <span><strong>One connected digital experience</strong><small>From first enquiry to everyday operations</small></span>
              </figcaption>
              <div className="solutions-image-tag">DESIGNED AROUND YOUR WORKFLOW <span>↗</span></div>
            </figure>
          </div>
        </section>

        <MotionShowcase onContact={openDemo} />

        <section className="solutions-process-strip border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1480px] gap-0 px-5 py-7 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
            {[
              ["01", "Understand your workflow", "We start with your real process, people and requirements."],
              ["02", "Design the right system", "Roles, screens, modules, approvals and reports are planned together."],
              ["03", "Build around your needs", "Your website and software are developed as practical digital products."],
              ["04", "Grow when you grow", "Start with what you need today and add modules as your organization expands."],
            ].map(([n, t, d], i) => (
              <div key={n} className={`p-6 ${i < 3 ? "lg:border-r lg:border-slate-200" : ""}`}>
                <div className="text-xs font-black tracking-[0.18em] text-orange-600">{n}</div>
                <div className="mt-2 text-lg font-black text-slate-950">{t}</div>
                <p className="mt-2 text-[15px] leading-6 text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="solutions" className="solutions-overview relative mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
          <div className="max-w-4xl">
            <SectionLabel>What we build</SectionLabel>
            <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">One premium technology partner for your entire digital operation.</h2>
            <p className="mt-6 max-w-3xl text-[18px] leading-8 text-slate-600 sm:text-[19px]">You do not have to buy five disconnected tools and then figure out how they fit together. Tell us what your organization needs—we can design the website, portals and management software as one coherent digital ecosystem.</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {solutionGroups.map((s, index) => (
              <article key={s.title} className={`solutions-solution-card group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-2 sm:p-9 ${index === 0 ? "bg-gradient-to-br from-white via-white to-orange-50/70" : index === 1 ? "bg-gradient-to-br from-white via-white to-amber-50/70" : ""}`}>
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-orange-200/20 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-orange-300 shadow-lg"><s.icon className="h-6 w-6" /></div>
                  <span className="text-sm font-black tracking-widest text-slate-300">{s.number}</span>
                </div>
                <h3 className="relative mt-8 text-[26px] font-black tracking-tight text-slate-950 sm:text-[30px]">{s.title}</h3>
                <p className="relative mt-4 text-[16px] leading-7 text-slate-600">{s.description}</p>
                <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
                  {s.items.map(i => <div key={i} className="flex gap-2.5 text-[14px] font-bold leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-4.5 w-4.5 shrink-0 text-orange-500" />{i}</div>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="websites" className="solutions-website border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-28">
            <div>
              <SectionLabel>Professional websites</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Your website is your first business conversation.</h2>
              <p className="mt-6 text-[18px] leading-8 text-slate-600">We build modern websites that explain what you do, build trust, showcase your work and turn visitors into enquiries. Your website can also connect directly to the software behind your organization.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {websiteFeatures.map(i => <div key={i} className="flex gap-2.5 text-[15px] font-bold leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-500" />{i}</div>)}
              </div>
              <button onClick={openDemo} className="mt-9 inline-flex items-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-[16px] font-black text-white shadow-lg hover:-translate-y-1 hover:bg-orange-950">Discuss Your Website <ArrowRight className="h-5 w-5" /></button>
            </div>
            <ProductFrame>
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <img src={dashboardBanner} alt="Synaptech professional website and digital platform preview" className="block w-full h-auto object-contain" />
              </div>
            </ProductFrame>
          </div>
        </section>

        <section id="lms" className="solutions-lms border-b border-slate-200">
          <div className="mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[.82fr_1.18fr]">
              <div>
                <SectionLabel>Learning management systems</SectionLabel>
                <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Turn learning into a complete digital experience.</h2>
                <p className="mt-6 text-[18px] leading-8 text-slate-600">Give students, faculty and administrators a modern platform for learning, assessment, projects, communication and performance tracking.</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {["Student portal", "Faculty workspace", "Course & module management", "Assignments & projects", "Online assessments", "Results & certificates", "Attendance & progress", "Admin analytics"].map(i => <div key={i} className="flex gap-2.5 text-[15px] font-bold text-slate-700"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-500" />{i}</div>)}
                </div>
                <button onClick={openDemo} className="mt-9 inline-flex items-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-[16px] font-black text-white shadow-lg hover:-translate-y-1 hover:bg-orange-950">Request an LMS Demo <ArrowRight className="h-5 w-5" /></button>
              </div>
              <div className="solutions-learning-visual">
                <img src={learningStudio} alt="Learners and mentor collaborating in a digital classroom" loading="lazy" />
                <div className="solutions-learning-dashboard"><MiniDashboard /></div>
              </div>
            </div>
          </div>
        </section>

        <section id="hrms" className="solutions-hrms border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
            <div>
              <SectionLabel>HRMS & workforce management</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Put your people operations on one intelligent platform.</h2>
              <p className="mt-6 text-[18px] leading-8 text-slate-600">Whether you are a startup building your first HR process or an established organization managing multiple departments, we can build an HRMS around your policies, approval hierarchy and workforce structure.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {["Employee & department master", "Attendance, shifts & leave", "Payroll, payslips & deductions", "Performance appraisal & KPIs", "Loans, advances & reimbursements", "Transfer, posting & promotion", "Retirement / PF records", "Travel, approvals & disbursements"].map(i => <div key={i} className="flex gap-2.5 text-[15px] font-bold text-slate-700"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-500" />{i}</div>)}
              </div>
              <button onClick={openDemo} className="mt-9 inline-flex items-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-[16px] font-black text-white shadow-lg hover:-translate-y-1 hover:bg-orange-950">Discuss an HRMS <ArrowRight className="h-5 w-5" /></button>
            </div>

            <ProductFrame>
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                  <div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-700">HRMS concept</div><div className="mt-1 text-xl font-black text-slate-950">Workforce overview</div></div>
                  <div className="rounded-full bg-orange-100 px-3 py-1.5 text-[10px] font-black text-orange-800">LIVE DASHBOARD</div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {[["Employees", "1,284", "Across 18 departments"], ["Attendance", "94.2%", "This month"], ["Payroll", "₹ 48.6L", "Current cycle"], ["Pending approvals", "27", "HR & management"]].map(([label, value, note]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-slate-950">{value}</div><div className="mt-1 text-sm text-slate-500">{note}</div></div>
                  ))}
                </div>
                <div className="p-5 pt-0">
                  <div className="rounded-2xl bg-slate-950 p-6 text-white">
                    <div className="flex items-center justify-between"><span className="text-base font-black">Employee lifecycle</span><span className="text-[10px] font-bold tracking-[0.16em] text-orange-300">WORKFLOW</span></div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {["Join", "Attend", "Appraise", "Promote"].map((x, i) => <div key={x} className="rounded-xl bg-white/10 px-3 py-4 text-center text-sm font-bold"><div className="text-orange-300">0{i + 1}</div><div className="mt-1">{x}</div></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </ProductFrame>
          </div>
        </section>

        <section id="crm-ai" className="solutions-crm">
          <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-28">
            <div>
              <SectionLabel>CRM + thoughtful AI</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Every conversation deserves a clear next step.</h2>
              <p className="mt-6 text-[18px] leading-8 text-slate-600">Capture enquiries from your website, organize follow-ups, understand buyer needs and give your team one reliable view of the pipeline. An AI qualification layer can ask relevant questions and pass context to the right person.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Lead capture and source tracking", "AI-assisted requirement discovery", "Pipeline, owners and follow-ups", "Activity history and reporting"].map(item => <div key={item} className="flex gap-2.5 text-[15px] font-bold text-slate-700"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-teal-600" />{item}</div>)}
              </div>
              <p className="mt-7 text-sm font-semibold text-slate-500">Need a learning platform too? LMS + CRM + AI can connect education enquiries, admissions and learner journeys.</p>
              <button onClick={openDemo} className="solutions-primary-button mt-8 inline-flex items-center gap-3 rounded-full px-7 py-4 text-[16px] font-black text-white">Explore CRM & AI <ArrowRight className="h-5 w-5" /></button>
            </div>
            <div className="solutions-crm-board" aria-label="Illustrative CRM pipeline preview">
              <div className="solutions-board-top"><span><span className="solutions-live-dot" /> Pipeline workspace</span><small>Illustrative workflow</small></div>
              <div className="solutions-board-heading"><div><small>YOUR CUSTOMER JOURNEY</small><strong>From enquiry to handover</strong></div><BarChart3 className="h-7 w-7 text-teal-600" /></div>
              <div className="solutions-board-columns">
                {[
                  ["01", "New enquiry", "Capture interest", "Website form · Campaign"],
                  ["02", "Qualified", "Understand the need", "AI questions · Team review"],
                  ["03", "Next action", "Keep momentum", "Owner · Follow-up · Proposal"],
                ].map(([number, title, purpose, note]) => <div className="solutions-board-column" key={number}><small>{number} / {title}</small><strong>{purpose}</strong><span>{note}</span><div className="solutions-board-line" /></div>)}
              </div>
              <div className="solutions-board-bottom"><Sparkles className="h-4 w-4" /> A useful summary travels with every lead</div>
            </div>
          </div>
        </section>

        <section id="inventory" className="solutions-inventory">
          <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-[1.04fr_.96fr] lg:px-10 lg:py-28">
            <figure className="solutions-inventory-photo"><img src={inventoryOperations} alt="Operations team checking inventory in a modern warehouse" loading="lazy" /><figcaption>Clarity from purchase order to stock movement.</figcaption></figure>
            <div>
              <SectionLabel>Inventory & operations</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Know what you have. Know what happens next.</h2>
              <p className="mt-6 text-[18px] leading-8 text-slate-600">Inventory software can replace manual registers and disconnected spreadsheets with a shared view of goods, locations, movements and purchasing. Your team can spot shortages sooner and maintain a clear audit trail.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Items, SKUs and warehouse locations", "Inward, outward and transfer records", "Reorder alerts and purchase requests", "Supplier, batch and movement history", "Roles, approvals and stock reports", "Connections to sales or finance workflows"].map(item => <div key={item} className="flex gap-2.5 text-[15px] font-bold text-slate-700"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-teal-600" />{item}</div>)}
              </div>
              <button onClick={openDemo} className="solutions-primary-button mt-8 inline-flex items-center gap-3 rounded-full px-7 py-4 text-[16px] font-black text-white">Discuss Inventory Software <ArrowRight className="h-5 w-5" /></button>
            </div>
          </div>
        </section>

        <section id="digital-marketing" className="solutions-marketing">
          <div className="mx-auto grid max-w-[1480px] items-center gap-14 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-28">
            <div>
              <SectionLabel>Digital marketing & lead generation</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Turn the right attention into a real conversation.</h2>
              <p className="mt-6 text-[18px] leading-8 text-slate-600">A strong campaign does more than collect clicks. We can help define the right audience, shape the offer, build a landing page, measure enquiries and connect follow-up to your CRM so your team sees the full journey.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["Audience & message", "Reach the people most likely to value your offer."],
                  ["Search & paid campaigns", "Plan SEO and suitable Meta, Google or LinkedIn activity."],
                  ["Landing page conversion", "Give visitors a clear next step and a focused enquiry flow."],
                  ["CRM & qualification", "Track sources, understand needs and follow up with context."],
                ].map(([title, detail]) => <div key={title} className="solutions-marketing-point"><CheckCircle2 className="h-5 w-5 shrink-0 text-teal-700" /><span><strong>{title}</strong><small>{detail}</small></span></div>)}
              </div>
              <p className="mt-7 text-sm font-semibold text-slate-500">Campaign strategy and investment are tailored to your market. We do not promise a fixed number of leads or sales.</p>
              <button onClick={openDemo} className="solutions-primary-button mt-8 inline-flex items-center gap-3 rounded-full px-7 py-4 text-[16px] font-black text-white">Discuss Lead Generation <ArrowRight className="h-5 w-5" /></button>
            </div>
            <div className="solutions-marketing-visual">
              <figure className="solutions-marketing-main-photo"><img src={marketingStrategy} alt="Marketing team reviewing campaign and lead funnel strategy" loading="lazy" /></figure>
              <figure className="solutions-marketing-inset"><img src={marketingAnalytics} alt="Illustrative campaign analytics and conversion dashboards" loading="lazy" /></figure>
              <div className="solutions-marketing-caption"><BarChart3 className="h-5 w-5" /><span>Campaign → enquiry → qualified follow-up</span></div>
            </div>
          </div>
        </section>

        <section id="business" className="solutions-business">
          <div className="mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
            <div className="max-w-5xl">
              <SectionLabel>Business & management software</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">One connected operation, built a module at a time.</h2>
              <p className="mt-6 max-w-4xl text-[18px] leading-8 text-slate-600">Your everyday work spans people, customers, stock, purchasing, finance and service. We can shape those workflows into practical software, starting with the highest-value need and adding modules as you grow.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {customSoftware.map(s => <article key={s.title} className="solutions-business-card rounded-[28px] border border-slate-200 bg-white p-7 transition hover:-translate-y-1"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-orange-300"><s.icon className="h-5 w-5"/></div><h3 className="mt-6 text-xl font-black text-slate-950">{s.title}</h3><p className="mt-3 text-[15px] leading-7 text-slate-600">{s.text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
            <div className="text-center">
              <SectionLabel>Who we build for</SectionLabel>
              <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">From a new startup to a large organization.</h2>
              <p className="mx-auto mt-6 max-w-3xl text-[18px] leading-8 text-slate-600">Your size should not decide whether your technology feels professional. We build according to your current needs and future growth.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {audiences.map(a => <article key={a.title} className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-orange-300"><a.icon className="h-5 w-5"/></div><h3 className="mt-6 text-xl font-black text-slate-950">{a.title}</h3><p className="mt-3 text-[15px] leading-7 text-slate-600">{a.text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="process" className="bg-[linear-gradient(135deg,#fffaf5,#ffffff)]">
          <div className="mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
            <div className="max-w-4xl"><SectionLabel>How we work</SectionLabel><h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">From your idea to a working digital system.</h2></div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[["01","Understand","We learn about your organization, users, pain points and goals."],["02","Plan","We map screens, roles, data, workflows and the right technology."],["03","Build","We design and develop the website or software in practical stages."],["04","Launch & Improve","We help you deploy, train users and continue improving the system."]].map(([n,t,d]) => <div key={n} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm"><div className="text-sm font-black tracking-[0.15em] text-orange-600">{n}</div><h3 className="mt-5 text-2xl font-black text-slate-950">{t}</h3><p className="mt-3 text-[15px] leading-7 text-slate-600">{d}</p></div>)}
            </div>
          </div>
        </section>

        <section className="solutions-why bg-slate-950 text-white">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-20 lg:grid-cols-[1fr_.8fr] lg:px-10 lg:py-24">
            <div><SectionLabel light>Why Synaptech</SectionLabel><h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] sm:text-6xl">Technology should fit your organization—not force your organization to fit the technology.</h2></div>
            <div className="grid gap-3">
              {["Custom solutions instead of one-size-fits-all templates","Modern, responsive interfaces for every screen","Role-based access and structured workflows","Scalable architecture for future modules","Analytics that help management make decisions","One partner for website, portals and software"].map(i => <div key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-[15px] font-bold text-slate-200"><CheckCircle2 className="h-5 w-5 shrink-0 text-orange-300"/>{i}</div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1100px] px-5 py-20 lg:py-28">
          <div className="text-center"><SectionLabel>Questions</SectionLabel><h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">Before you contact us, here are a few answers.</h2></div>
          <div className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-[30px] border border-slate-200 bg-white px-7 shadow-sm">
            {faqs.map(([q,a], i) => <div key={q}><button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-7 text-left text-[16px] font-black sm:text-lg"><span>{q}</span><ChevronDown className={`h-5 w-5 shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`}/></button>{openFaq === i && <p className="pb-7 pr-8 text-[15px] leading-7 text-slate-600">{a}</p>}</div>)}
          </div>
        </section>

        <section className="px-5 pb-20 lg:pb-28">
          <div className="solutions-final-cta mx-auto max-w-[1480px] overflow-hidden rounded-[38px] px-7 py-14 sm:px-12 lg:px-16 lg:py-18">
            <div className="grid items-center gap-9 lg:grid-cols-[1fr_auto]">
              <div><div className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-700">Synaptech Education & Digital Solutions</div><h2 className="mt-4 max-w-4xl text-[42px] font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">Let's build a system your team loves to use.</h2><p className="mt-5 max-w-3xl text-[17px] leading-7 text-slate-800">Whether you need a website, LMS, CRM with AI, HRMS, inventory platform, digital marketing or a custom application, tell us where you want to begin.</p></div>
              <button onClick={openDemo} className="inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-8 py-4.5 text-[16px] font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-orange-950">Start a Conversation <MessageCircle className="h-5 w-5"/></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="solutions-footer bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div><div className="text-base font-black">Synaptech Education & Digital Solutions</div><div className="mt-2 text-sm text-slate-400">Websites • LMS • CRM & AI • HRMS • Inventory • Digital Marketing</div></div>
          <div className="text-sm text-slate-400">© {new Date().getFullYear()} Synaptech. All rights reserved.</div>
        </div>
      </footer>

      <Chatbot
  onContact={openDemo}
/>

      {showContact && (
        <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xl" onClick={closeDemo}>
          <div className="my-8 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_40px_120px_rgba(2,8,23,.28)]" onClick={e => e.stopPropagation()}>
            <div className="bg-[linear-gradient(120deg,#fff7ed,#ffedd5)] p-7 sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-700">Free consultation</div><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tell us what you want to build.</h3><p className="mt-3 text-[15px] leading-6 text-slate-600">Share a few details and the Synaptech team can discuss the right website, software or digital marketing approach with you.</p></div>
                <button onClick={closeDemo} className="rounded-full bg-white p-2.5 shadow-sm" aria-label="Close contact form"><X className="h-5 w-5"/></button>
              </div>
            </div>

            {discoveryActive ? (
              <div className="p-7 sm:p-9">
  <div className="rounded-[28px] border border-orange-200 bg-orange-50/70 p-6 sm:p-8">

    <div className="flex items-start gap-4">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md">
        <img src={avniPortrait} alt="Ask Avni" className="h-full w-full object-cover" />
      </div>

      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">
          Ask Avni • AI Requirement Discovery
        </div>

        <h4 className="mt-1 text-2xl font-black text-slate-950">
          Thanks{leadDisplayName ? `, ${leadDisplayName}` : ""}. Let's understand your requirement.
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your enquiry has been recorded. Our AI will ask a few relevant questions so our team can understand your requirement before contacting you.
        </p>
      </div>
    </div>

    <div className="mt-6 max-h-[330px] space-y-3 overflow-y-auto rounded-2xl border border-orange-100 bg-white p-4">
      {discoveryMessages.map(
        (message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "customer"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "customer"
                  ? "rounded-br-md bg-slate-950 text-white"
                  : "rounded-bl-md bg-orange-50 text-slate-700"
              }`}
            >
              {message.text}
            </div>
          </div>
        )
      )}

      {discoveryLoading && (
        <div className="text-xs font-bold text-slate-400">
          AI is reviewing your response…
        </div>
      )}
    </div>

    {!discoveryComplete ? (
      <div className="mt-4 flex gap-2">
        <input
          value={discoveryInput}
          onChange={(e) =>
            setDiscoveryInput(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              sendBusinessDiscoveryReply();
            }
          }}
          placeholder="Type your answer…"
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />

        <button
          type="button"
          disabled={
            discoveryLoading ||
            !discoveryInput.trim()
          }
          onClick={
            sendBusinessDiscoveryReply
          }
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    ) : (
  <div className="mt-5">

    {!showFormDemo &&
      (discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) &&
      !formDemoDeclined &&
      !formLiveDemoChoice && (
        <div className="rounded-2xl border border-orange-200 bg-white p-5">

          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">
            One more thing
          </div>

          <div className="mt-2 text-lg font-black text-slate-950">
            Would you like to see a short Synaptech LMS demo?
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your requirement discovery is complete. Before we finish, you can watch a short demonstration of our LMS platform to see the type of digital solution Synaptech can build.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">

            <button
              type="button"
              onClick={() => {
                setShowFormDemo(true);
                setFormDemoDeclined(false);
              }}
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-600"
            >
              Yes, show me the demo
            </button>

            <button
              type="button"
              onClick={() => {
                setFormDemoDeclined(true);
                setShowFormDemo(false);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Not right now
            </button>

          </div>

        </div>
      )}


    {showFormDemo &&
      (discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) &&
      !formLiveDemoChoice && (
        <DemoVideoExperience

          videoSrc="/videos/LMS_Demo.mp4"

          title="Synaptech LMS Platform Demo"

          description="Watch this short demonstration of the Synaptech LMS. We can later customise the solution around your organization's exact requirements."

          onStarted={() => {
            setFormDemoStarted(true);

            console.log(
              "Demo video started from enquiry funnel"
            );
          }}

          onProgress={(percentage) => {
            console.log(
              `Demo video progress: ${percentage}%`
            );
          }}

          onCompleted={() => {
            console.log(
              "Demo video completed from enquiry funnel"
            );
          }}


        />
      )}


    {(discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) && formLiveDemoChoice === "yes" && (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-green-700">
          Live demo requested
        </div>

        <div className="mt-2 text-lg font-black text-green-950">
          Thank you. Your interest in a personalised Synaptech demo has been recorded.
        </div>

        <p className="mt-2 text-sm leading-6 text-green-900">
          The Synaptech team can contact you using the details you already provided. You do not need to fill in another enquiry form.
        </p>

      </div>
    )}


    {(discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) && formLiveDemoChoice === "no" && (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">

        <div className="font-black text-slate-950">
          Thank you for watching the demo.
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your requirement and AI Discovery responses have already been recorded. You can request a personalised demo later if you wish.
        </p>

      </div>
    )}


    {(discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) && formDemoDeclined && (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">

        <div className="font-black text-slate-950">
          Thank you.
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your requirement and AI Discovery responses have been recorded. The Synaptech team can follow up based on your enquiry.
        </p>

      </div>
    )}

    {!(discoveryCategory ? isLmsCategory(discoveryCategory) : includesLms(submittedCategory)) && (
      <div className="rounded-2xl border border-teal-200 bg-white p-5">
        <div className="font-black text-[#14564f]">Thank you for sharing your requirements.</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your enquiry and discovery responses have been recorded. Our team can discuss a relevant solution and demonstration with you.</p>
      </div>
    )}

  </div>
)}

    <button
      type="button"
      onClick={closeDemo}
      className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
    >
      Close
    </button>
  </div>
</div>
            ) : (
              <form onSubmit={submitEnquiry} className="grid gap-5 p-7 sm:grid-cols-2 sm:p-9">
                <label className="grid gap-2 text-sm font-black text-slate-800">Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Your name" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-800">Phone<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder={PHONE_DISPLAY} /></label>
                <label className="grid gap-2 text-sm font-black text-slate-800">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="you@company.com" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-800">Organization / Institution<input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Company, school, institute…" /></label>
                <label className="grid gap-2 text-sm font-black text-slate-800 sm:col-span-2">Solution of interest
                  <select required value={form.requirementType} onChange={e => setForm({ ...form, requirementType: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                    <option value="">Select the closest option</option>
                    {requirementOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-800 sm:col-span-2">Tell us a little more (optional)<textarea rows={3} value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" placeholder="Your users, current tools, goals or project scope…" /></label>
                {submitMessage && <p role="status" className="sm:col-span-2 rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900">{submitMessage}</p>}
                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-[15px] font-black text-white hover:bg-orange-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send Enquiry"}
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                  <a href={`https://wa.me/91${PHONE}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] font-black text-slate-900 hover:border-orange-300">WhatsApp {PHONE_DISPLAY}</a>
                </div>
                <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  Prefer to call? <a href={`tel:+91${PHONE}`} className="font-black text-slate-950">{PHONE_DISPLAY}</a> &nbsp;•&nbsp; Email: <a href={`mailto:${EMAIL}`} className="font-black text-slate-950">{EMAIL}</a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
