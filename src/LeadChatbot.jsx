import { useEffect, useMemo, useRef, useState } from "react";
import airaAvatar from "./assets/aira-avatar.png";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
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
      "Synaptech offers Online, Offline and Hybrid learning. Weekend as well as weekday classes are available, with doubt sessions. The first 10 Python programming sessions are conducted one-to-one directly with faculty.",
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
      "Graduation is required for placement. Candidates receive Synaptech IIT Roorkee certification as applicable, and placement assistance is provided to top global companies. Support includes interview preparation, mock interviews and personal grooming.",
  },
  {
    id: "certificate",
    title: "Certificates",
    short: "Synaptech & IIT Roorkee certification",
    icon: CheckCircle2,
    answer:
      "Candidates receive a certificate from Synaptech Education. To obtain the Synaptech IIT Roorkee Certificate, candidates must secure 70% marks and meet the required attendance criteria.",
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
  const [sessionId] = useState(() => `syn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const openedTracked = useRef(false);
  const endRef = useRef(null);

  const leadScore = useMemo(() => scoreLead(lead, interactions), [lead, interactions]);
  const intentLabel = leadScore >= 75 ? "High-intent enquiry" : leadScore >= 45 ? "Warm enquiry" : "Exploring";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedFaq, loading, submitted]);

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

  async function submitProfile(event) {
    event.preventDefault();
    if (!lead.name || !lead.phone || !lead.email || !lead.place || !lead.lookingFor) return;

    await notify("candidate_profile_submitted", {
      score: scoreLead(lead, 0),
      intent: "new enquiry",
    });

    setStage("menu");
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
      {open && (
        <div className="fixed left-2 right-2 top-[4.75rem] bottom-[5.5rem] z-[190] flex w-auto max-w-none flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_30px_100px_rgba(2,8,23,0.3)] sm:left-auto sm:right-4 sm:top-[5.25rem] sm:bottom-24 sm:w-[430px] sm:max-h-[calc(100dvh-8.25rem)] sm:rounded-[28px] lg:right-6">
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
                <input required value={lead.name} onChange={(e) => updateLead("name", e.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
                <input required value={lead.phone} onChange={(e) => updateLead("phone", e.target.value)} placeholder="Phone number" inputMode="tel" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
                <input required value={lead.email} onChange={(e) => updateLead("email", e.target.value)} placeholder="Email address" type="email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
                <div className="relative">
                  <MapPin size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required value={lead.place} onChange={(e) => updateLead("place", e.target.value)} placeholder="City / place" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
                </div>
                <select required value={lead.lookingFor} onChange={(e) => updateLead("lookingFor", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-cyan-400 focus:bg-white">
                  <option value="">Who are you looking for?</option>
                  {LOOKING_FOR.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>

              <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-slate-800">
                Continue to AI Advisor <ArrowRight size={16} />
              </button>
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

              <button onClick={() => setStage("other")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-xs font-extrabold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
                <MessageCircle size={15} /> Other queries — speak to a Synaptech counsellor <ChevronRight size={15} />
              </button>
              <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">Your details are already captured for this enquiry.</p>
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
                <textarea value={otherQuery} onChange={(e) => setOtherQuery(e.target.value)} placeholder="Type your question here…" rows={4} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
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
