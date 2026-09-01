import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  FileText,
  GraduationCap,
  Headphones,
  Layers3,
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
import { supabase } from "../supabase/supabase";

const PHONE = "9560940039";
const PHONE_DISPLAY = "+91 95609 40039";
const EMAIL = "admission@synaptecheducation.in";

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
  "Programs, services & product pages",
  "Admissions / enquiry forms",
  "Faculty, team & organization profiles",
  "Events, notices, blogs & announcements",
  "SEO-ready structure and fast performance",
];

const customSoftware = [
  { icon: WalletCards, title: "Finance & Accounts", text: "Expense, reimbursement, payment and approval workflows tailored to your organization." },
  { icon: BarChart3, title: "Analytics & MIS", text: "Decision-ready dashboards, KPIs, reports and drill-down views for management." },
  { icon: FileText, title: "Workflow & Approvals", text: "Digitize requests, approvals, sanctions, disbursements and internal processes." },
  { icon: Database, title: "Data & Records", text: "Structured, searchable records with role-based access and audit-friendly history." },
  { icon: Headphones, title: "Customer / Support Portals", text: "Portals that let customers, members or employees access the services they need." },
  { icon: Layers3, title: "Custom Applications", text: "If your process is unique, we design the software around your process—not the other way around." },
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
  return (
    <section className="border-y border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1480px] px-5 py-16 lg:px-10 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <SectionLabel light>Motion • Digital experience</SectionLabel>
            <h2 className="text-[38px] font-black leading-[1.04] tracking-[-0.045em] sm:text-5xl">
              Don't just show software. <span className="text-orange-300">Show it in motion.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-slate-300">
              We use lightweight motion graphics to make digital learning, websites and
              software feel more alive—without turning the landing page into a heavy video wall.
            </p>
            <button
              onClick={onContact}
              className="mt-7 inline-flex items-center gap-3 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-black text-white hover:bg-orange-600"
            >
              Want a similar experience? <ArrowRight className="h-4 w-4" />
            </button>
            <div className="mt-5 text-[11px] leading-5 text-slate-500">
              Motion assets are hosted externally and are used according to their respective
              licenses. LottieFiles provides free animations under its Lottie Simple License.
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-3 shadow-2xl">
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-950 via-slate-900 to-slate-950">
                <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200 backdrop-blur">
                  LMS / E-learning
                </div>
                <dotlottie-wc
                  src="https://lottie.host/f315768c-a29b-41fd-b5a8-a1c1dfb36cd2/CRiiNg8fqQ.lottie"
                  speed="1"
                  mode="forward"
                  loop
                  autoplay
                  style={{ width: "100%", height: "320px" }}
                />
              </div>
              <div className="px-2 pb-2 pt-4">
                <div className="text-lg font-black">Learning in motion</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">
                  Courses, learning journeys and digital experiences can be presented visually.
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-3 shadow-2xl">
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950">
                <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 backdrop-blur">
                  Web / Software
                </div>
                <dotlottie-wc
                  src="https://lottie.host/647eb023-6040-4b60-a275-e2546994dd7f/zDCfp5lhLe.json"
                  speed="1"
                  mode="forward"
                  loop
                  autoplay
                  style={{ width: "100%", height: "320px" }}
                />
              </div>
              <div className="px-2 pb-2 pt-4">
                <div className="text-lg font-black">Digital product motion</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">
                  Motion can make a website or management platform feel like a real product.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chatbot({ onContact }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Ask me almost anything about LMS, websites, HRMS, ERP, CRM, portals, software architecture, features, implementation, integrations, hosting, security or typical development costs. I can use current web information for general questions. If your question is specifically about Synaptech—pricing, demos, scope or your project—I can take you directly to the enquiry form.",
    },
  ]);

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

  const sendMessage = async (preset) => {
    const value = (preset ?? input).trim();
    if (!value || typing) return;

    setMessages((current) => [...current, { role: "user", text: value }]);
    setInput("");
    setTyping(true);

    try {
      // All questions go to the secure server endpoint.
      // The server decides whether web search is useful and whether the
      // question is Synaptech-specific. The OpenAI API key never lives here.
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });

      if (!response.ok) throw new Error("AI endpoint unavailable");

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer || localFallback(value),
          action: Boolean(data.isSynaptechQuery),
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch {
      // The visitor still gets a useful answer if the AI backend is
      // temporarily unavailable.
      const synaptechQuery =
        /\b(synaptech|your company|your pricing|your price|your cost|your quote|your demo|your lms|your hrms|your software|contact you|call you|whatsapp you|build for me|my project|my requirement)\b/i.test(value);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: localFallback(value),
          action: synaptechQuery,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <div className={`fixed bottom-6 right-5 z-[150] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,.22)] backdrop-blur-2xl transition-all duration-300 ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}>
        <div className="bg-gradient-to-r from-slate-950 via-orange-950 to-orange-800 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Bot className="h-5 w-5 text-orange-200" />
              </div>
              <div>
                <div className="text-base font-black">Synaptech AI Assistant</div>
                <div className="text-xs text-orange-100/80">General software knowledge + Synaptech enquiries</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close chatbot">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[430px] space-y-3 overflow-y-auto bg-orange-50/30 p-4">
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

                {message.action && (
                  <button
                    onClick={onContact}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-orange-600"
                  >
                    Discuss this with Synaptech <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              AI is preparing an answer…
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {[
              "How much does an LMS cost?",
              "How long does an LMS take?",
              "What should an LMS include?",
              "What is an HRMS?",
              "ERP vs CRM",
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
              placeholder="Ask a technical question…"
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

          <button
            onClick={onContact}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black text-orange-800 hover:bg-orange-100"
          >
            Have a Synaptech-specific question? Contact us <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="mt-2 text-center text-[10px] font-medium text-slate-400">
            General technical questions are answered by AI using its knowledge and, when useful, current web sources. Company-specific pricing, demos and project requirements go to Synaptech.
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-5 z-[149] flex items-center gap-3 rounded-full bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-[0_18px_50px_rgba(234,88,12,.28)] ring-4 ring-white hover:-translate-y-1 hover:bg-orange-600"
        aria-label="Open Synaptech AI Assistant"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-orange-600">
          <Bot className="h-4 w-4" />
        </span>
        Ask our AI Assistant
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

const [form, setForm] = useState({
  name: "",
  phone: "",
  email: "",
  organization: "",
  requirement: ""
});

  useEffect(() => {
    document.title = "Websites, LMS, HRMS & Business Software | Synaptech";
    window.scrollTo(0, 0);
        // Meta Pixel for Education Solutions landing page
    if (window.fbq) {
      window.fbq("init", "4651638568452914");
      window.fbq("trackSingle", "4651638568452914", "PageView");
    }

    // Hosted Lottie web component for lightweight motion graphics.
    // It is loaded only once and does not require another npm package.
    if (!document.querySelector('script[data-synaptech-lottie]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js";
      script.type = "module";
      script.dataset.synaptechLottie = "true";
      document.head.appendChild(script);
    }
  }, []);

  const openDemo = () => {
    setShowContact(true);
    setMobileOpen(false);
  };

  const closeDemo = () => setShowContact(false);

  const submitEnquiry = async (e) => {
  e.preventDefault();

  if (submitting) return;

  setSubmitting(true);
  setSubmitMessage("");

  try {
    const { error } = await supabase
      .from("synaptech_leads")
      .insert([
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          organization: form.organization.trim() || null,
          requirement: form.requirement.trim(),
        },
      ]);

    if (error) {
  console.error("Supabase lead submission error:", error);
  throw error;
}

// Meta Pixel: track a Lead only after successful enquiry submission
if (window.fbq) {
  window.fbq("trackSingle", "4651638568452914", "Lead");
}

setSubmitMessage(
  "Your enquiry has been successfully sent. A Synaptech representative will get back to you to discuss your requirements."
);

    setForm({
      name: "",
      phone: "",
      email: "",
      organization: "",
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
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf7] text-slate-900 selection:bg-orange-200 selection:text-slate-950">
      <header className="sticky top-0 z-[100] border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[82px] max-w-[1480px] items-center justify-between px-5 lg:px-10">
          <a href="#top" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <img src={synaptechLogo} alt="Synaptech Education & Digital Solutions" className="h-11 w-auto object-contain" />
            <div className="hidden sm:block">
              <div className="text-base font-black tracking-tight text-slate-950">SYNAPTECH</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Education & Digital Solutions</div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-[15px] font-bold text-slate-700 xl:flex">
            <a href="#solutions" className="transition hover:text-orange-600">Solutions</a>
            <a href="#websites" className="transition hover:text-orange-600">Websites</a>
            <a href="#lms" className="transition hover:text-orange-600">LMS</a>
            <a href="#hrms" className="transition hover:text-orange-600">HRMS</a>
            <a href="#business" className="transition hover:text-orange-600">Business Software</a>
            <a href="#process" className="transition hover:text-orange-600">How We Work</a>
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
                ["#hrms", "HRMS"],
                ["#business", "Business Software"],
                ["#process", "How We Work"],
              ].map(([href, label]) => <a key={href} href={href} onClick={() => setMobileOpen(false)}>{label}</a>)}
              <button onClick={openDemo} className="rounded-2xl bg-slate-950 px-5 py-4 text-left text-white">Request a Free Consultation →</button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_78%_20%,rgba(249,115,22,.20),transparent_28%),radial-gradient(circle_at_12%_20%,rgba(245,158,11,.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#fff7ed_48%,#fffaf0_100%)]">
          <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-orange-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-[440px] w-[440px] rounded-full bg-amber-200/25 blur-3xl" />

          <div className="relative mx-auto grid max-w-[1480px] items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:py-24 xl:gap-20">
            <div>
              <SectionLabel>Websites • LMS • HRMS • Business Software</SectionLabel>
              <h1 className="max-w-5xl text-[48px] font-black leading-[1.01] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[78px]">
                Premium digital systems for organizations ready to <span className="bg-gradient-to-r from-orange-700 via-orange-500 to-amber-400 bg-clip-text text-transparent">grow.</span>
              </h1>
              <p className="mt-8 max-w-3xl text-[18px] font-medium leading-8 text-slate-600 sm:text-[20px]">
                From a high-converting professional website to a complete LMS, HRMS, ERP, CRM or custom management platform, Synaptech designs and builds technology around the way your organization actually works.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <button onClick={openDemo} className="group inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-7 py-4.5 text-[16px] font-black text-white shadow-[0_18px_45px_rgba(15,23,42,.18)] transition hover:-translate-y-1 hover:bg-orange-950">
                  Tell Us What You Need <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </button>
                <a href="#solutions" className="inline-flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white/80 px-7 py-4.5 text-[16px] font-black text-slate-900 shadow-sm transition hover:-translate-y-1 hover:border-orange-300">
                  Explore Our Solutions <ChevronDown className="h-5 w-5" />
                </a>
              </div>
              <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4 border-t border-slate-200 pt-7 sm:grid-cols-4">
                {[[ShieldCheck, "Secure"], [Zap, "Scalable"], [Code2, "Custom-built"], [Sparkles, "AI-ready"]].map(([I, t]) => (
                  <div key={t} className="flex items-center gap-2.5 text-sm font-extrabold text-slate-700"><I className="h-5 w-5 text-orange-500" />{t}</div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[50px] bg-orange-300/20 blur-3xl" />
              <ProductFrame className="relative rotate-[0.4deg]">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <img src={dashboardBanner} alt="Synaptech digital systems preview" className="mx-auto h-[330px] w-full object-contain sm:h-[430px]" />
                  <div className="border-t border-slate-200 bg-white p-5 sm:p-6">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">One technology partner</div>
                    <div className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Website + LMS + HRMS + Management Software</div>
                  </div>
                </div>
              </ProductFrame>
            </div>
          </div>
        </section>

        <MotionShowcase onContact={openDemo} />

        <section className="border-b border-slate-200 bg-white">
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

        <section id="solutions" className="relative mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
          <div className="max-w-4xl">
            <SectionLabel>What we build</SectionLabel>
            <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">One premium technology partner for your entire digital operation.</h2>
            <p className="mt-6 max-w-3xl text-[18px] leading-8 text-slate-600 sm:text-[19px]">You do not have to buy five disconnected tools and then figure out how they fit together. Tell us what your organization needs—we can design the website, portals and management software as one coherent digital ecosystem.</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {solutionGroups.map((s, index) => (
              <article key={s.title} className={`group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(15,23,42,.12)] sm:p-9 ${index === 0 ? "bg-gradient-to-br from-white via-white to-orange-50/70" : index === 1 ? "bg-gradient-to-br from-white via-white to-amber-50/70" : ""}`}>
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

        <section id="websites" className="border-y border-slate-200 bg-white">
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

        <section id="lms" className="border-b border-slate-200 bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,.14),transparent_28%),linear-gradient(135deg,#fffaf5,#fff7ed)]">
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
              <MiniDashboard />
            </div>
          </div>
        </section>

        <section id="hrms" className="border-y border-slate-200 bg-white">
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

        <section id="business" className="bg-[#fffaf5]">
          <div className="mx-auto max-w-[1480px] px-5 py-20 lg:px-10 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <SectionLabel>Business & management software</SectionLabel>
                <h2 className="text-[42px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl">If your business has a process, we can turn it into software.</h2>
                <p className="mt-6 text-[18px] leading-8 text-slate-600">From HRMS and CRM to ERP, finance, inventory, project management and custom approval systems, we build applications that help teams work with less manual effort and better visibility.</p>
                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-700">Built around your workflow</div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold">
                    <span className="rounded-full bg-slate-100 px-4 py-2.5">Request</span><ArrowRight className="h-4 w-4 text-orange-500"/><span className="rounded-full bg-slate-100 px-4 py-2.5">Approval</span><ArrowRight className="h-4 w-4 text-orange-500"/><span className="rounded-full bg-slate-100 px-4 py-2.5">Verification</span><ArrowRight className="h-4 w-4 text-orange-500"/><span className="rounded-full bg-orange-100 px-4 py-2.5 text-orange-900">Action</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {customSoftware.map(s => <article key={s.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-orange-300"><s.icon className="h-5 w-5"/></div><h3 className="mt-6 text-xl font-black text-slate-950">{s.title}</h3><p className="mt-3 text-[15px] leading-7 text-slate-600">{s.text}</p></article>)}
              </div>
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

        <section className="bg-slate-950 text-white">
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
          <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[38px] bg-[linear-gradient(110deg,#fed7aa,#fb923c,#ffedd5)] px-7 py-14 shadow-[0_30px_80px_rgba(234,88,12,.18)] sm:px-12 lg:px-16 lg:py-18">
            <div className="grid items-center gap-9 lg:grid-cols-[1fr_auto]">
              <div><div className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-700">Synaptech Education & Digital Solutions</div><h2 className="mt-4 max-w-4xl text-[42px] font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">Have a website, LMS, HRMS or software idea?</h2><p className="mt-5 max-w-3xl text-[17px] leading-7 text-slate-800">Tell us what you want to build. We will discuss your requirements, suggest the right approach and show you what your digital solution can look like.</p></div>
              <button onClick={openDemo} className="inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-8 py-4.5 text-[16px] font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-orange-950">Start a Conversation <MessageCircle className="h-5 w-5"/></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div><div className="text-base font-black">Synaptech Education & Digital Solutions</div><div className="mt-2 text-sm text-slate-400">Professional websites • LMS • HRMS • Business & management software</div></div>
          <div className="text-sm text-slate-400">© {new Date().getFullYear()} Synaptech. All rights reserved.</div>
        </div>
      </footer>

      <Chatbot onContact={openDemo} />

      {showContact && (
        <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xl" onClick={closeDemo}>
          <div className="my-8 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_40px_120px_rgba(2,8,23,.28)]" onClick={e => e.stopPropagation()}>
            <div className="bg-[linear-gradient(120deg,#fff7ed,#ffedd5)] p-7 sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-700">Free consultation</div><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tell us what you want to build.</h3><p className="mt-3 text-[15px] leading-6 text-slate-600">Share a few details and the Synaptech team can discuss the right website, LMS, HRMS or custom software approach with you.</p></div>
                <button onClick={closeDemo} className="rounded-full bg-white p-2.5 shadow-sm" aria-label="Close contact form"><X className="h-5 w-5"/></button>
              </div>
            </div>

            {submitMessage ? (
              <div className="p-7 sm:p-9">
                <div className="rounded-[28px] border border-orange-200 bg-orange-50/70 p-8 text-center sm:p-10">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-500 text-white shadow-lg">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="mt-6 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Enquiry Sent Successfully
                  </h4>
                  <p className="mx-auto mt-4 max-w-xl text-[16px] leading-7 text-slate-600">
                    {submitMessage}
                  </p>
                  <button
                    type="button"
                    onClick={closeDemo}
                    className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white hover:bg-orange-950"
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
                <label className="grid gap-2 text-sm font-black text-slate-800 sm:col-span-2">What do you need?<textarea required rows={4} value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Website, LMS, HRMS, ERP, CRM, custom software, existing system modernization…" /></label>
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
