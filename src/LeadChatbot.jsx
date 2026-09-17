import { useEffect, useMemo, useRef, useState } from "react";
import airaAvatar from "./assets/aira-avatar.png";
import { supabase } from "./supabase/supabase";
import { recordQualificationJourney } from "./utils/crmJourneyTelemetry";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const CHAT_API = import.meta.env.VITE_CHATBOT_API_URL || "/api/chat";
const LEAD_API = import.meta.env.VITE_LEAD_API_URL || "/api/lead";
const ADMISSIONS_BROCHURE_URL = "/brochures/Brochure_Synaptech.pdf";

const FAQS = [
  {
    id: "courses",
    title: "Courses offered",
    short: "Explore Synaptech programs",
    icon: GraduationCap,
    answer:
      "Synaptech Education offers three programs: Data Analytics, Data Science, and Data Science with Generative AI & Agentic AI.",
  },
  {
    id: "duration",
    title: "Course duration",
    short: "How long are the programs?",
    icon: Sparkles,
    answer:
      "Data Analytics is a 4-month program. Data Science is a 6-month program. Data Science with Generative AI & Agentic AI is a 10-month program.",
  },
  {
    id: "fasttrack",
    title: "Fast-track course",
    short: "Complete the advanced program faster",
    icon: ArrowRight,
    answer:
      "A fast-track option is available for Data Science with Generative AI & Agentic AI and can be completed in 6 months.",
  },
  {
    id: "teaching",
    title: "Mode of teaching",
    short: "Online, offline, hybrid & flexible",
    icon: MessageCircle,
    answer:
      "Synaptech offers Online, Offline and Hybrid learning at the same fee. Weekend classes are standard. Weekday classes may be arranged only subject to management approval and student availability. Doubt sessions are included, and the first 10 Python programming sessions are conducted one-to-one directly with faculty.",
  },
  {
    id: "eligibility",
    title: "Who is eligible?",
    short: "Students, graduates & professionals",
    icon: UserRound,
    answer:
      "Eligible candidates include Class XII pass-outs, candidates pursuing or having completed any graduation, and working professionals.",
  },
  {
    id: "placement",
    title: "Placement assistance",
    short: "Career preparation & placement support",
    icon: Phone,
    answer:
      "Graduation is required for placement. Eligible successful candidates receive interview preparation, mock interviews, GitHub and LinkedIn profile preparation, portfolio support and placement assistance for suitable opportunities across leading companies and fields. Employment is not guaranteed.",
  },
  {
    id: "certificate",
    title: "Certificates",
    short: "Synaptech & IIT Roorkee certification",
    icon: CheckCircle2,
    answer:
      "Candidates receive a certificate from Synaptech Education. To obtain the Synaptech IIT Roorkee Certificate, candidates must secure 70% marks and meet the required attendance criteria.",
  },
  {
    id: "fees",
    title: "Fees & no-cost EMI",
    short: "Course fees and payment plans",
    icon: MessageCircle,
    answer:
      "Data Analytics is ₹28,000 including GST (₹10,000 admission + 2 EMIs of ₹9,000). Data Science is ₹45,000 including GST (₹15,000 admission + 3 EMIs of ₹10,000). Data Science with Gen AI & Agentic AI is ₹53,000 including GST (₹25,000 admission + approximately 3 EMIs of ₹9,334). Its 6-month fast-track option is ₹69,800 including GST (₹30,000 admission + approximately 3 EMIs of ₹13,267). The advanced regular and fast-track programmes receive a ₹5,000 discount on one-time payment; no discount applies to EMI. EMIs are no-cost and payable by the 5th of the applicable month.",
  },
];

const LOOKING_FOR = [
  "Myself",
  "My child",
  "My sibling",
  "My friend",
  "My relative",
];

const initialLead = {
  name: "",
  phone: "",
  email: "",
  place: "",
  lookingFor: "",
  question: "",
};

function scoreLead(lead, interactions = 0) {
  let score = 0;
  if (lead.name) score += 15;
  if (lead.phone) score += 20;
  if (lead.email) score += 10;
  if (lead.place) score += 10;
  if (lead.lookingFor) score += 15;
  if (lead.question) score += 10;
  score += Math.min(interactions * 5, 20);
  return Math.min(score, 100);
}

export default function LeadChatbot() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("profile");
  const [lead, setLead] = useState(initialLead);
  const [messages, setMessages] = useState([]);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [otherQuery, setOtherQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counsellorReady, setCounsellorReady] = useState(false);
  const [counsellorQuestion, setCounsellorQuestion] = useState("");
  const [interactions, setInteractions] = useState(0);
  const [admissionSession, setAdmissionSession] = useState(null);
  const [qualificationInput, setQualificationInput] = useState("");
  const [qualificationMessages, setQualificationMessages] = useState([]);
  const [qualificationLoading, setQualificationLoading] = useState(false);
  const [qualificationComplete, setQualificationComplete] = useState(false);
  const [qualificationError, setQualificationError] = useState("");
  const [sessionId] = useState(() => `syn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const openedTracked = useRef(false);
  const externalStartHandled = useRef(false);
  const endRef = useRef(null);
  const guidanceAttempt = useRef({});

  const leadScore = useMemo(() => scoreLead(lead, interactions), [lead, interactions]);
  const intentLabel = leadScore >= 75 ? "High-intent enquiry" : leadScore >= 45 ? "Warm enquiry" : "Exploring";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, qualificationMessages, selectedFaq, loading, submitted]);

  useEffect(() => {
    function beginExternalAdmission(candidate) {
      if (externalStartHandled.current || !candidate?.name || !candidate?.phone || !candidate?.email || !candidate?.place) return;
      externalStartHandled.current = true;
      const nextLead = {
        ...initialLead,
        ...candidate,
        lookingFor: candidate.lookingFor || "Myself",
      };
      setLead(nextLead);
      setOpen(true);
      void startAdmissionGuidance(nextLead);
    }

    function handleExternalAdmission(event) {
      beginExternalAdmission(event.detail);
    }

    window.addEventListener("synaptech:start-admissions-aira", handleExternalAdmission);
    try {
      const pending = JSON.parse(sessionStorage.getItem("synaptech_pending_admissions_aira") || "null");
      if (pending) {
        sessionStorage.removeItem("synaptech_pending_admissions_aira");
        beginExternalAdmission(pending);
      }
    } catch {
      sessionStorage.removeItem("synaptech_pending_admissions_aira");
    }

    return () => window.removeEventListener("synaptech:start-admissions-aira", handleExternalAdmission);
  }, []);

  async function notify(event, extra = {}) {
    try {
      await fetch(LEAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          sessionId,
          page: window.location.href,
          referrer: document.referrer || "direct",
          timestamp: new Date().toISOString(),
          lead,
          ...extra,
        }),
        keepalive: true,
      });
    } catch {
      // The chatbot remains usable if notification infrastructure is unavailable.
    }
  }

  function openChat() {
    setOpen(true);
    if (!openedTracked.current) {
      openedTracked.current = true;
      notify("chat_opened");
    }
  }

  function updateLead(key, value) {
    setLead((current) => ({ ...current, [key]: value }));
  }

  async function startAdmissionGuidance(candidate) {
    if (!candidate?.name || !candidate?.phone || !candidate?.email || !candidate?.place || !candidate?.lookingFor) return;
    setQualificationLoading(true);
    setQualificationError("");
    setStage("profile");

    void notify("candidate_profile_submitted", {
      lead: candidate,
      score: scoreLead(candidate, 0),
      intent: "new enquiry",
    });

    try {
      const requirement = `Admission enquiry for ${candidate.lookingFor}; location: ${candidate.place}`;
      const profileKey = JSON.stringify([candidate.name, candidate.phone, candidate.email, requirement]);
      if (guidanceAttempt.current.key !== profileKey) guidanceAttempt.current = { key: profileKey };
      if (!guidanceAttempt.current.sourceSaved) {
      const { error: sourceError } = await supabase.from("synaptech_leads").insert([{
        name: candidate.name.trim(),
        phone: candidate.phone.trim(),
        email: candidate.email.trim() || null,
        organization: null,
        requirement,
      }]);
      if (sourceError) throw sourceError;
      guidanceAttempt.current.sourceSaved = true;
      }

      let secureSession = guidanceAttempt.current.session;
      if (!secureSession) {
      const startResponse = await fetch("/api/engagement/admissions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name.trim(),
          phone: candidate.phone.trim(),
          email: candidate.email.trim() || null,
        }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData?.session?.token) {
        throw new Error(startData?.error || "Unable to start admission guidance.");
      }

      secureSession = startData.session;
      guidanceAttempt.current.session = secureSession;
      }
      setAdmissionSession(secureSession);
      sessionStorage.setItem("synaptech_admissions_engagement", JSON.stringify(secureSession));

      const discoveryResponse = await fetch("/api/engagement/admissions/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: secureSession.token, start: true }),
      });
      const discoveryData = await discoveryResponse.json();
      if (!discoveryResponse.ok) {
        throw new Error(discoveryData?.error || "Unable to start admission guidance.");
      }

      void recordQualificationJourney({
        sessionToken: secureSession.token,
        eventType: "qualification_started",
        progress: discoveryData?.journey_progress,
      });

      setQualificationMessages([{
        role: "assistant",
        text: discoveryData?.assistant_message?.text || "Which Synaptech programme are you interested in?",
        options: discoveryData?.assistant_message?.answer_options || [],
        links: discoveryData?.assistant_message?.links || [],
      }]);
      setStage("qualification");
    } catch (error) {
      console.error("Admissions AI qualification start failed:", error);
      setQualificationError("Aira could not start admission guidance. Please retry using the button below. Your entered details are still here.");
      setStage("profile");
    } finally {
      setQualificationLoading(false);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (qualificationLoading) return;
    await startAdmissionGuidance(lead);
  }

  async function sendQualificationReply(event) {
    event.preventDefault();
    const value = qualificationInput.trim();
    if (!value || qualificationLoading || !admissionSession?.token) return;

    setQualificationMessages((current) => [...current, { role: "user", text: value }]);
    setQualificationInput("");
    setQualificationLoading(true);
    setQualificationError("");

    try {
      const response = await fetch("/api/engagement/admissions/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: admissionSession.token, message: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to continue admission guidance.");

      void recordQualificationJourney({
        sessionToken: admissionSession.token,
        eventType: "question_answered",
        progress: data?.journey_progress,
      });

      setQualificationMessages((current) => [...current, {
        role: "assistant",
        text: data?.assistant_message?.text || "Thank you. I have recorded that information.",
        options: data?.assistant_message?.answer_options || [],
        links: data?.assistant_message?.links || [],
      }]);
      const hasPendingQuestion = Boolean(data?.journey_progress?.next_question_key);
      setQualificationComplete(data?.counselling_complete === true && !hasPendingQuestion);
    } catch (error) {
      console.error("Admissions AI qualification failed:", error);
      setQualificationError("Aira could not confirm this answer. Please retry; counselling has not been marked complete.");
      setQualificationInput(value);
      setQualificationComplete(false);
    } finally {
      setQualificationLoading(false);
    }
  }

  async function chooseFaq(faq) {
    setSelectedFaq(faq);
    setInteractions((value) => value + 1);
    await notify("faq_interaction", {
      topic: faq.title,
      answer: faq.answer,
      score: scoreLead(lead, interactions + 1),
      intent: intentLabel,
    });
  }

  async function askOtherQuery(event) {
    event.preventDefault();
    const question = otherQuery.trim();
    if (!question || loading) return;

    setLoading(true);
    setCounsellorReady(false);
    setCounsellorQuestion("");
    setInteractions((value) => value + 1);

    let answer = "";
    try {
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: question,
          history: messages.slice(-8),
          lead,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        answer = data.answer || "";
      }
    } catch {
      // Use counsellor handoff if the AI service is unavailable.
    }

    const isOutsideDomain = !answer;

    if (isOutsideDomain) {
      answer = "This is outside my immediate information. Please submit the query below and a Synaptech counsellor will get back to you.";
      setCounsellorQuestion(question);
      setCounsellorReady(true);
    }

    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: answer },
    ]);
    setOtherQuery("");
    setLoading(false);

    await notify("other_query_interaction", {
      question,
      answer,
      score: scoreLead({ ...lead, question }, interactions + 1),
      intent: intentLabel,
    });
  }

  async function submitCounsellorQuery(event) {
    event.preventDefault();
    const question = otherQuery.trim() || counsellorQuestion.trim();
    if (!question) return;

    const nextLead = { ...lead, question };
    setLead(nextLead);

    await notify("counsellor_query_submitted", {
      lead: nextLead,
      question,
      score: scoreLead(nextLead, interactions),
      intent: scoreLead(nextLead, interactions) >= 75 ? "high" : scoreLead(nextLead, interactions) >= 45 ? "warm" : "exploring",
    });

    setSubmitted(true);
    setCounsellorReady(false);
  }

    return (
    <>
      <style>{`
        [data-aira-admissions] input, [data-aira-admissions] textarea,
        [data-aira-admissions] select, [data-aira-admissions] option {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a !important;
        }
      `}</style>
      {open && (
        <div data-aira-admissions className="fixed left-2 right-2 top-[4.75rem] bottom-[5.5rem] z-[190] flex w-auto max-w-none flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_30px_100px_rgba(2,8,23,0.3)] sm:left-auto sm:right-4 sm:top-[5.25rem] sm:bottom-24 sm:w-[430px] sm:max-h-[calc(100dvh-8.25rem)] sm:rounded-[28px] lg:right-6">
          <div className="shrink-0 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={airaAvatar} alt="Aira" className="h-11 w-11 rounded-full border-2 border-cyan-300/60 object-cover shadow-lg shadow-cyan-500/20" />
                <div>
                  <p className="text-sm font-black">Ask Aira</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Your AI Advisor · online
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close AI advisor">
                <X size={18} />
              </button>
            </div>
          </div>

          {stage === "profile" && !submitted && (
            <form onSubmit={submitProfile} className="min-h-0 flex-1 overflow-y-auto bg-white p-5">
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <img src={airaAvatar} alt="Aira" className="h-12 w-12 rounded-full border-2 border-cyan-200 object-cover shadow-md" />
                  <div>
                    <p className="text-sm font-black text-slate-950">Hi, I’m Aira.</p>
                    <p className="text-[11px] text-slate-500">Your Synaptech AI Advisor</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  <Sparkles size={14} /> Before we begin
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Let’s personalise your answers.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Please share these details first. This helps Synaptech understand who is exploring the program and allows our counsellors to follow up when needed.
                </p>
              </div>

              <div className="space-y-3">
                <input required value={lead.name} onChange={(e) => updateLead("name", e.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white" />
                <input required value={lead.phone} onChange={(e) => updateLead("phone", e.target.value)} placeholder="Phone number" inputMode="tel" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white" />
                <input required value={lead.email} onChange={(e) => updateLead("email", e.target.value)} placeholder="Email address" type="email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white" />
                <div className="relative">
                  <MapPin size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required value={lead.place} onChange={(e) => updateLead("place", e.target.value)} placeholder="City / place" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white" />
                </div>
                <select required value={lead.lookingFor} onChange={(e) => updateLead("lookingFor", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-950 outline-none focus:border-cyan-400 focus:bg-white">
                  <option value="">Who are you looking for?</option>
                  {LOOKING_FOR.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>

              {qualificationError && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{qualificationError}</p>}

              <button
                type="submit"
                disabled={qualificationLoading}
                aria-busy={qualificationLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-75"
              >
                {qualificationLoading ? (
                  <><LoaderCircle size={17} className="animate-spin" /> Aira is preparing your guidance…</>
                ) : (
                  <>Continue to AI Advisor <ArrowRight size={16} /></>
                )}
              </button>
              {qualificationLoading && (
                <p className="mt-3 text-center text-xs font-semibold text-cyan-800" role="status">
                  Please wait while Aira securely records your enquiry and prepares the first question.
                </p>
              )}
            </form>
          )}

          {stage === "menu" && !submitted && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
              <div className="mb-4 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-950">Hi {lead.name.split(" ")[0]}, what would you like to know?</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Select a topic for an immediate answer from Synaptech AI.</p>
              </div>

              <div className="grid gap-2">
                {FAQS.map((faq) => {
                  const Icon = faq.icon;
                  const isOpen = selectedFaq?.id === faq.id;
                  return (
                    <div key={faq.id} className={`overflow-hidden rounded-2xl border bg-white transition ${isOpen ? "border-cyan-300 shadow-sm" : "border-slate-200"}`}>
                      <button
                        onClick={() => chooseFaq(faq)}
                        className="group flex w-full items-center gap-3 p-3.5 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-cyan-300"><Icon size={18} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold text-slate-900">{faq.title}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">{faq.short}</span>
                        </span>
                        <ChevronRight size={16} className={`text-slate-400 transition ${isOpen ? "rotate-90 text-cyan-600" : "group-hover:translate-x-0.5 group-hover:text-cyan-600"}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-cyan-100 bg-cyan-50 px-4 py-3.5">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-800">Immediate answer</p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-700">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {admissionSession?.token && !qualificationComplete && (
                <button
                  onClick={() => setStage("qualification")}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3.5 text-xs font-extrabold text-white transition hover:bg-cyan-800"
                >
                  <Sparkles size={15} /> Continue admission guidance <ChevronRight size={15} />
                </button>
              )}

              <button onClick={() => setStage("other")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-xs font-extrabold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
                <MessageCircle size={15} /> Other queries — speak to a Synaptech counsellor <ChevronRight size={15} />
              </button>
              <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">Your details are already captured for this enquiry.</p>
            </div>
          )}

          {stage === "qualification" && !submitted && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">
              <button
                onClick={() => setStage("menu")}
                className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-950"
              >
                <ChevronLeft size={15} /> View course information
              </button>

              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <img src={airaAvatar} alt="Aira" className="h-12 w-12 rounded-full border-2 border-cyan-200 object-cover shadow-md" />
                  <div>
                    <p className="text-sm font-black text-slate-950">Admission guidance</p>
                    <p className="text-[11px] text-slate-500">Aira will ask one question at a time</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Your answers help our counsellor understand the right programme, learning mode and next step. You may request a human counsellor at any time.
                </p>
              </div>

              <div className="max-h-[270px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                {qualificationMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-2xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "ml-8 bg-slate-950 text-white" : "mr-8 border border-slate-200 bg-white text-slate-700"}`}
                  >
                    {message.text}
                    {message.links?.map(link => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
                        className="mt-2 block rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-950 underline">
                        {link.label}
                      </a>
                    ))}
                    {message.role === "assistant" && message.options?.length > 0 && index === qualificationMessages.length - 1 && !qualificationComplete && (
                      <div className="mt-3 grid gap-2">
                        {message.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={qualificationLoading}
                            onClick={() => setQualificationInput(option)}
                            className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-left text-xs font-bold text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-100"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {qualificationLoading && (
                  <div className="mr-8 rounded-2xl border border-cyan-100 bg-white px-3 py-2.5 text-sm text-slate-500">
                    Aira is reviewing your answer…
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {!qualificationComplete ? (
                <form onSubmit={sendQualificationReply} className="mt-3 flex gap-2">
                  <input
                    value={qualificationInput}
                    onChange={(event) => setQualificationInput(event.target.value)}
                    placeholder="Type your answer…"
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!qualificationInput.trim() || qualificationLoading}
                    className="rounded-2xl bg-slate-950 px-4 text-white disabled:opacity-40"
                    aria-label="Send admission answer"
                  >
                    <Send size={17} />
                  </button>
                </form>
              ) : (
                <div className="mt-3 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-extrabold text-emerald-950">Thank you. Your admission guidance details are ready for our counsellor.</p>
                  <a
                    href={ADMISSIONS_BROCHURE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white"
                  >
                    View / Download Programme Brochure <ArrowRight size={15} />
                  </a>
                  <button
                    onClick={() => setStage("menu")}
                    className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-extrabold text-emerald-800"
                  >
                    Continue to course information
                  </button>
                </div>
              )}

              {qualificationError && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{qualificationError}</p>
              )}
            </div>
          )}

          {stage === "other" && !submitted && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">
              <button onClick={() => setStage("menu")} className="mb-4 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-950"><ChevronLeft size={15} /> Back</button>
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <img src={airaAvatar} alt="Aira" className="h-12 w-12 rounded-full border-2 border-cyan-200 object-cover shadow-md" />
                  <div>
                    <p className="text-sm font-black text-slate-950">Hi, I’m Aira.</p>
                    <p className="text-[11px] text-slate-500">Your Synaptech AI Advisor</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700"><MessageCircle size={14} /> Other queries</div>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Ask your question.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">If your question is not covered above, submit it here. Synaptech counsellors will get back to you.</p>
              </div>

              <form onSubmit={askOtherQuery}>
                <textarea value={otherQuery} onChange={(e) => setOtherQuery(e.target.value)} placeholder="Type your question here…" rows={4} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-950 caret-slate-950 placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white" />
                <button disabled={!otherQuery.trim() || loading} type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-extrabold text-white disabled:opacity-40">
                  {loading ? "Checking…" : "Ask Synaptech AI"} <Send size={16} />
                </button>
              </form>

              {messages.length > 0 && (
                <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
                  {messages.map((message, index) => (
                    <div key={index} className={`rounded-2xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                      {message.text}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )}

              <button onClick={submitCounsellorQuery} disabled={!counsellorReady && !otherQuery.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-40">
                Submit query to counsellor <ArrowRight size={15} />
              </button>
            </div>
          )}

          {submitted && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-7 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={30} /></div>
              <h3 className="mt-5 text-2xl font-black text-slate-950">Query submitted</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Thank you, {lead.name.split(" ")[0]}. A Synaptech counsellor will get back to you regarding your query.</p>
            </div>
          )}
        </div>
      )}

      <button onClick={openChat} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[180] flex items-center gap-3 rounded-full border border-cyan-300/30 bg-gradient-to-r from-slate-950 to-blue-950 px-4 py-3 text-white shadow-[0_18px_50px_rgba(2,8,23,0.35)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(34,211,238,0.22)]" aria-label="Open Ask Aira">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white p-0.5 text-slate-950 shadow-lg shadow-cyan-500/20">
          <img src={airaAvatar} alt="Aira" className="h-full w-full rounded-full object-cover" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">AI ADVISOR</span>
          <span className="block text-sm font-extrabold">Ask Aira</span>
        </span>
      </button>
    </>
  );
}
