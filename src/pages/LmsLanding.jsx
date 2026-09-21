import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  ArrowRight, BarChart3, BookOpen, BrainCircuit, CheckCircle2,
  ClipboardCheck, GraduationCap, LockKeyhole, PlayCircle, Receipt,
  ShieldCheck, Sparkles, Video,
} from "lucide-react";

import { auth } from "../firebase/firebaseConfig";
import logo from "../assets/Synaptech_Education_Logo.png";
import dashboardImage from "../assets/lms-student-dashboard.svg";

const programmes = [
  { title: "Data Analytics", duration: "4 months", text: "Excel, SQL, Python, Tableau and Power BI for practical business analytics.", href: "/modules/data-analytics-module.pdf" },
  { title: "Data Science", duration: "6 months", text: "Statistics, machine learning, deep learning and project-led Python practice.", href: "/modules/data-science-module.pdf" },
  { title: "Data Science with Generative & Agentic AI", duration: "10 months", text: "Advanced data science with LLMs, RAG, intelligent agents and MLOps.", href: "/modules/genai-agenticai-module.pdf" },
];

const features = [
  [Video, "Live & recorded learning", "Join scheduled classes and revisit authorised recordings from one learning hub."],
  [BookOpen, "Structured course material", "Access reading, practice and interview resources organised by module and batch."],
  [ClipboardCheck, "Assignments & assessments", "Complete assignments, mini tests and projects with faculty evaluation and feedback."],
  [BarChart3, "Learning analytics", "Track progress, results, streaks and performance through an individual dashboard."],
  [Receipt, "Real-time payment status", "View full-payment or EMI schedules, paid instalments and outstanding amounts from Finance."],
  [GraduationCap, "Certificates & outcomes", "Access eligible certificates and career-readiness resources as your programme progresses."],
];

export default function LmsLanding() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const activateAccount = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/lms/account-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Eligibility could not be checked.");
      if (!result.eligible) {
        setMessageType("warning");
        setMessage(result.message);
        return;
      }
      await sendPasswordResetEmail(auth, normalizedEmail);
      setMessageType("success");
      setMessage("Your secure LMS password setup link has been sent. Open the registered email, create your password, then return here and sign in. Please also check Spam or Promotions.");
    } catch (error) {
      console.error(error);
      setMessageType("warning");
      setMessage(error?.code === "auth/too-many-requests" ? "Too many requests were made. Please wait a few minutes and try again." : error.message || "The activation link could not be sent.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f3] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <a href="/" className="flex items-center gap-3"><img src={logo} alt="Synaptech Education" className="h-12 w-12 rounded-xl object-contain" /><div><p className="text-lg font-black">Synaptech Education</p><p className="text-xs font-semibold text-emerald-700">Learning Management System</p></div></a>
          <div className="flex items-center gap-3"><a href="/" className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex">Main website</a><a href="/login" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15">Student sign in</a></div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 py-16 lg:px-10 lg:py-24">
          <div className="absolute -left-28 top-0 h-80 w-80 rounded-full bg-lime-200/50 blur-3xl" /><div className="absolute right-0 top-12 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-extrabold text-emerald-800 shadow-sm"><Sparkles size={16} />Your complete digital learning campus</div><h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">Learn data. Build with AI. <span className="text-emerald-700">Track every milestone.</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">A secure learning space for approved Synaptech students—bringing classes, resources, assessments, analytics, payments and certificates together.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#activate" className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-7 py-4 text-base font-black text-white shadow-xl shadow-emerald-700/20">Activate LMS account <ArrowRight size={18} /></a><a href="/login" className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white px-7 py-4 text-base font-black text-emerald-900"><LockKeyhole size={18} />Student sign in</a><a href="/brochures/Brochure_Synaptech.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-7 py-4 text-base font-black text-amber-950"><BookOpen size={18} />Programme brochure</a></div>
              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">{[["Live", "Classes"], ["24×7", "Resources"], ["Real-time", "Analytics"], ["Secure", "Access"]].map(([value,label]) => <div key={label} className="rounded-2xl border border-white bg-white/70 p-4 shadow-sm"><p className="text-xl font-black text-emerald-800">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>)}</div>
            </div>
            <div className="relative"><div className="rounded-[36px] border border-white bg-white/80 p-4 shadow-[0_35px_100px_rgba(6,78,59,.16)] backdrop-blur"><img src={dashboardImage} alt="Synaptech LMS student dashboard preview" className="w-full rounded-[28px]" /></div><div className="absolute -bottom-6 -left-4 max-w-xs rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl"><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck /></div><div><p className="font-black">Admission-controlled access</p><p className="mt-1 text-sm leading-5 text-slate-500">Only approved students with LMS access enabled can activate an account.</p></div></div></div></div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 lg:px-10"><div className="mx-auto max-w-[1440px]"><p className="text-sm font-black uppercase tracking-[.2em] text-emerald-700">Inside your LMS</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.04em] sm:text-5xl">Everything required for a connected learning journey.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon,title,text]) => <article key={title} className="rounded-[28px] border border-emerald-950/10 bg-[#fbfcf8] p-6 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon /></div><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{text}</p></article>)}</div></div></section>

        <section className="px-5 py-20 lg:px-10"><div className="mx-auto max-w-[1440px]"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-black uppercase tracking-[.2em] text-amber-700">Explore programmes</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">Choose the learning path that fits.</h2></div><a href="/brochures/Brochure_Synaptech.pdf" target="_blank" rel="noreferrer" className="font-black text-emerald-800">View complete brochure →</a></div><div className="mt-10 grid gap-6 lg:grid-cols-3">{programmes.map((programme,index) => <a key={programme.title} href={programme.href} target="_blank" rel="noreferrer" className="group rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="text-sm font-black text-emerald-700">0{index+1} · {programme.duration}</span><h3 className="mt-5 text-2xl font-black">{programme.title}</h3><p className="mt-4 text-base leading-7 text-slate-600">{programme.text}</p><span className="mt-7 inline-flex items-center gap-2 font-black text-emerald-800">Explore curriculum <ArrowRight size={17} /></span></a>)}</div></div></section>

        <section id="activate" className="bg-gradient-to-br from-emerald-950 to-emerald-800 px-5 py-20 text-white lg:px-10"><div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><div className="inline-flex items-center gap-2 rounded-full bg-lime-300/15 px-4 py-2 text-sm font-black text-lime-200"><CheckCircle2 size={17} />For approved students</div><h2 className="mt-5 text-4xl font-black tracking-[-.04em] sm:text-5xl">Activate your LMS account securely.</h2><p className="mt-5 text-lg leading-8 text-emerald-100">Use the same real email approved during admission. We first verify that LMS access is enabled; then Firebase sends a secure link for you to create your own password.</p><div className="mt-7 space-y-3 text-base text-emerald-50">{["No public or unapproved account creation", "No password stored in Firestore", "Existing student UID and learning history preserved"].map(item => <p key={item} className="flex items-center gap-3"><CheckCircle2 className="text-lime-300" size={19} />{item}</p>)}</div></div>
            <form onSubmit={activateAccount} className="rounded-[32px] bg-white p-7 text-slate-900 shadow-2xl sm:p-9"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><BrainCircuit /></div><div><h3 className="text-2xl font-black">Create / activate account</h3><p className="text-sm text-slate-500">Available only after LMS access is approved</p></div></div><label className="mt-7 block text-base font-bold text-slate-700">Admission email</label><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-base outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /><button disabled={busy || !email.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 text-base font-black text-white disabled:opacity-50">{busy ? "Checking secure access…" : "Verify access & create password"}<ArrowRight size={18} /></button>{message && <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{message}</div>}<p className="mt-5 text-center text-sm text-slate-500">Already created your password? <a href="/login" className="font-black text-emerald-700">Sign in to LMS</a></p></form>
          </div></section>
      </main>
      <footer className="bg-white px-5 py-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© Synaptech Education · Your Future with AI</p><div className="flex gap-5"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact support</a></div></div></footer>
    </div>
  );
}
