import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  GraduationCap,
  Menu,
  Play,
  Sparkles,
  Target,
  X,
  BarChart3,
  Bot,
  Layers3,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import aiHeroVideo from "./assets/ai-hero-clean.mp4";
import aiHeroCleanPoster from "./assets/ai-hero-clean-poster.jpg";
import aiHero from "./assets/ai-hero.png";
import ai1 from "./assets/ai1.jpg";
import ai2 from "./assets/ai2.jpg";
import ai3 from "./assets/ai3.jpg";
import dataAnalyticsPDF from "./assets/modules/data-analytics-module.pdf";
import dataSciencePDF from "./assets/modules/data-science-module.pdf";
import genAIPDF from "./assets/modules/genai-agenticai-module.pdf";
import aboutBg from "./assets/about-bg.jpg";
import placementBg from "./assets/placement-bg.jpg";
import placementsImg from "./assets/placements.png";
import iitLogo from "./assets/IIT_Roorkee_Bright.png";
import synaptechLogo from "./assets/Synaptech_Education_Logo.png";
import certificate1 from "./assets/Sample_Certificate.png";
import certificate2 from "./assets/Internship_Certificate.png";
import contact1 from "./assets/contact1.jpg";
import contact2 from "./assets/contact2.jpg";
import Footer from "./components/Footer";
import LeadChatbot from "./LeadChatbot";

const courses = [
  {
    number: "01",
    title: "Data Analytics",
    description:
      "Turn business data into decisions with Excel, SQL, Power BI, Tableau and Python.",
    tags: ["Excel", "SQL", "Power BI", "Python"],
    href: dataAnalyticsPDF,
    image: ai1,
  },
  {
    number: "02",
    title: "Data Science",
    description:
      "Build strong foundations in statistics, machine learning, deep learning and applied Python.",
    tags: ["Python", "ML", "Statistics", "Projects"],
    href: dataSciencePDF,
    image: ai2,
  },
  {
    number: "03",
    title: "Generative & Agentic AI",
    description:
      "Work with LLMs, RAG, vector databases, prompt engineering and intelligent AI agents.",
    tags: ["LLMs", "RAG", "Agents", "GenAI"],
    href: genAIPDF,
    image: ai3,
  },
];

const capabilities = [
  {
    icon: BrainCircuit,
    title: "Artificial Intelligence",
    text: "Understand the technologies shaping intelligent products, automation and decision systems.",
    href: "https://developers.google.com/machine-learning/crash-course",
  },
  {
    icon: BarChart3,
    title: "Data Intelligence",
    text: "Move from raw data to meaningful insights, predictive models and measurable business outcomes.",
    href: "https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/",
  },
  {
    icon: Bot,
    title: "Generative & Agentic AI",
    text: "Build with modern AI patterns including LLMs, RAG pipelines and autonomous agent workflows.",
    href: "https://platform.openai.com/overview",
  },
  {
    icon: Code2,
    title: "Applied Engineering",
    text: "Learn through practical implementation, projects and tools used across modern technology teams.",
    href: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  },
];

const learningPillars = [
  "Industry-aligned curriculum",
  "Hands-on projects and assessments",
  "Live learning and recorded resources",
  "Progress, analytics and feedback",
  "Career and placement support",
  "Recognised certification pathways",
];

function SectionLabel({ children, light = false }) {
  return (
    <div
      className={`mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] ${
        light ? "text-red-300" : "text-red-700"
      }`}
    >
      <span className={`h-px w-10 ${light ? "bg-red-300" : "bg-red-700"}`} />
      {children}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="border-l border-white/15 pl-5">
      <div className="text-2xl font-bold text-white md:text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

export default function App() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", place: "", question: "" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("open") === "admissions") {
      setShowContactForm(true);
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  const openContact = () => {
    setShowContactForm(true);
    setMobileOpen(false);
  };

  const submitContactToAira = (event) => {
    event.preventDefault();
    if (contactSubmitting) return;
    setContactSubmitting(true);
    window.dispatchEvent(new CustomEvent("synaptech:start-admissions-aira", {
      detail: {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        place: contactForm.place.trim(),
        question: contactForm.question.trim(),
        lookingFor: "Myself",
      },
    }));
    setShowContactForm(false);
    setContactSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white selection:bg-red-700 selection:text-white">
      {/* Premium navigation */}
      <header
        className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
          scrolled
            ? "border-b border-red-950/80 bg-black/90 shadow-[0_12px_50px_rgba(127,29,29,0.18)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[88px] w-full max-w-[1500px] items-center justify-between px-4 sm:h-[96px] sm:px-6 lg:px-10 xl:px-14">
          <a href="#home" className="group flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Synaptech Education home">
            <img
              src={synaptechLogo}
              alt="Synaptech Education"
              className="h-[68px] w-[174px] shrink-0 rounded-2xl object-cover object-center shadow-[0_12px_35px_rgba(220,38,38,0.18)] ring-1 ring-white/10 transition duration-300 group-hover:ring-red-500/50 sm:h-[76px] sm:w-[194px]"
            />
            <div className="hidden min-w-0 sm:block">
              <div
                className={`text-lg font-black tracking-[0.02em] lg:text-xl ${
                  "text-white"
                }`}
              >
                SYNAPTECH
              </div>
              <div
                className={`mt-0.5 text-[11px] font-bold uppercase tracking-[0.3em] ${
                  scrolled ? "text-red-300" : "text-slate-300"
                }`}
              >
                Education
              </div>
            </div>
          </a>

          <nav
            className={`hidden items-center gap-2 text-[15px] font-bold lg:flex ${
              scrolled ? "text-slate-200" : "text-white"
            }`}
          >
            <a className="rounded-full px-4 py-2.5 transition hover:bg-white/10 hover:text-red-300" href="#about">
              About
            </a>
            <a className="rounded-full px-4 py-2.5 transition hover:bg-white/10 hover:text-red-300" href="#courses">
              Programs
            </a>
            <a className="rounded-full px-4 py-2.5 transition hover:bg-white/10 hover:text-red-300" href="#experience">
              Learning Experience
            </a>
            <a className="rounded-full px-4 py-2.5 transition hover:bg-white/10 hover:text-red-300" href="#careers">
              Careers
            </a>
            <button
              onClick={openContact}
              className="rounded-full px-4 py-2.5 transition hover:bg-white/10 hover:text-red-300"
            >
              Contact
            </button>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="/login"
              className={`rounded-full border border-white/15 px-5 py-3 text-[15px] font-bold transition ${
                scrolled
                  ? "text-slate-100 hover:bg-red-950/70"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Student Portal
            </a>
            <a
              href="/register"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 text-[15px] font-black text-white shadow-[0_14px_35px_rgba(220,38,38,0.3)] transition hover:-translate-y-0.5 hover:from-red-500 hover:to-red-400"
            >
              Enroll Now
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </a>
          </div>

          <button
            className={`rounded-full p-2 lg:hidden ${
              "text-white"
            }`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-black px-5 py-5 shadow-xl lg:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 text-base font-bold text-white">
              <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
              <a href="#courses" onClick={() => setMobileOpen(false)}>Programs</a>
              <a href="#experience" onClick={() => setMobileOpen(false)}>Learning Experience</a>
              <a href="#careers" onClick={() => setMobileOpen(false)}>Careers</a>
              <button className="text-left" onClick={openContact}>Contact</button>
              <div className="mt-2 flex gap-3">
                <a href="/login" className="rounded-full border border-slate-200 px-5 py-3">Student Portal</a>
                <a href="/register" className="rounded-full bg-slate-950 px-5 py-3 text-white">Enroll Now</a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero: cinematic AI motion section */}
      <section id="home" className="relative min-h-[760px] overflow-hidden bg-black lg:min-h-[820px]">
        <div className="absolute inset-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={aiHeroCleanPoster}
            preload="metadata"
            aria-hidden="true"
          >
            <source src={aiHeroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.99)_0%,rgba(8,3,3,0.92)_38%,rgba(20,4,4,0.52)_68%,rgba(0,0,0,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_50%,rgba(220,38,38,0.30),transparent_34%)]" />
        </div>

        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto flex min-h-[720px] w-full max-w-[1440px] items-center px-4 pb-16 pt-28 sm:px-5 sm:pt-32 lg:min-h-[820px] lg:px-10">
          <div className="grid w-full gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-200 backdrop-blur-md">
                <Sparkles size={14} />
                AI • Data • Future Skills
              </div>

              <h1 className="max-w-4xl text-[clamp(3.25rem,7.4vw,6.5rem)] font-black leading-[0.92] tracking-[-0.055em] text-white drop-shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
  Learn Data, AI &
  <span className="block bg-gradient-to-r from-red-300 via-rose-300 to-white bg-clip-text text-transparent">
    Future Technologies.
  </span>
</h1>

              <p className="mt-8 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg sm:leading-9 lg:text-xl">
  Synaptech Education offers industry-focused Data Analytics,
  Data Science, Artificial Intelligence, Generative AI and
  Agentic AI programs in Ghaziabad, designed around practical
  projects, assessments and career readiness.
</p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#courses"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(220,38,38,0.35)] transition hover:-translate-y-1 hover:from-red-500 hover:to-red-400"
                >
                  Explore Programs
                  <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </a>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base font-extrabold text-white backdrop-blur-md transition hover:border-red-400/60 hover:bg-white/15"
                >
                  <Play size={16} fill="currentColor" />
                  Start Learning
                </a>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:mt-12 sm:grid-cols-4 sm:gap-6 sm:pt-7">
                <Stat value="300+" label="Learners" />
                <Stat value="20+" label="Projects" />
                <Stat value="10+" label="AI Specialisations" />
                <Stat value="2025" label="Established" />
              </div>
            </div>

            <div className="relative hidden min-h-[420px] lg:block">
              <div className="absolute right-0 top-4 w-[360px] rounded-[28px] border border-white/15 bg-slate-950/35 p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">
                      Intelligence Layer
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      Learning in motion
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-400/15 text-red-300">
                    <BrainCircuit size={20} />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {["Data → Insight", "Model → Intelligence", "Prompt → Creation", "Agent → Action"].map((item, i) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-red-200">
                        0{i + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">{item}</span>
                      <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-red-300" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-10 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-300" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    Future-ready learning ecosystem
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#about"
          className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 lg:flex"
        >
          Scroll to explore
          <ChevronDown size={14} className="animate-bounce" />
        </a>
      </section>

      {/* Partnership / credibility strip */}
      <section className="border-b border-white/10 bg-[#09090b]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-5">
            <div className="rounded-2xl px-1 py-2 drop-shadow-[0_0_18px_rgba(255,255,255,0.16)]">
              <img src={iitLogo} alt="Indian Institute of Technology Roorkee" className="h-auto w-[300px] object-contain sm:w-[360px]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Academic collaboration
              </p>
              <p className="mt-1 text-base font-extrabold text-white">
                In collaboration with IIT Roorkee
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-bold uppercase tracking-[0.13em] text-slate-300">
            <span>Project-led</span>
            <span>Assessment-driven</span>
            <span>Career-focused</span>
            <span>AI-first</span>
          </div>
        </div>
      </section>

      {/* About / positioning */}
      <section id="about" className="bg-[#09090b] px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <SectionLabel>Who we are</SectionLabel>
            <h2 className="max-w-xl text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              Education built around capability, not just content.
            </h2>
          </div>
          <div className="max-w-3xl">
            <p className="text-lg leading-8 text-slate-300">
              Synaptech Education is a future-focused technical education
initiative in Ghaziabad dedicated to building practical skills
across Data, Artificial Intelligence and emerging technologies. Our programs combine conceptual
              foundations with projects, assessments, guided learning and
              career-oriented outcomes.
            </p>
            <p className="mt-6 text-base leading-7 text-slate-400">
              From analytics and machine learning to Generative AI and Agentic
              AI, the goal is simple: help learners understand the technology,
              build with it and become confident applying it in real-world
              environments.
            </p>
          </div>
        </div>
      </section>

      {/* Capability cards */}
      <section className="bg-[#0f0f11] px-5 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 max-w-3xl">
            <SectionLabel>Technology domains</SectionLabel>
            <h2 className="text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl">
              The intelligence stack you need to understand next.
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-red-950/30 md:grid-cols-2 xl:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, text, href }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block cursor-pointer bg-[#111114] p-8 text-white transition duration-300 hover:bg-red-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:p-10"
                aria-label={`Explore ${title} resources`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-red-300 transition group-hover:bg-red-600 group-hover:text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-8 text-xl font-extrabold">{title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-300 transition group-hover:text-white">
                  {text}
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600 transition group-hover:translate-x-1 group-hover:text-red-300">
                  Explore domain <ArrowRight size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="courses" className="bg-black px-5 py-24 text-white lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <SectionLabel light>Programs</SectionLabel>
              <h2 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Learn the technologies behind the next wave.
              </h2>
            </div>
            <a href="/register" className="group inline-flex w-fit items-center gap-2 text-sm font-bold text-red-300">
              View enrolment options
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {courses.map((course) => (
              <a
                href={course.href}
                target="_blank"
                rel="noreferrer"
                key={course.title}
                className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] transition duration-500 hover:-translate-y-2 hover:border-red-300/30"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-red-200 backdrop-blur">
                    PROGRAM {course.number}
                  </span>
                </div>
                <div className="p-7">
                  <h3 className="text-2xl font-extrabold">{course.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-300">{course.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Explore curriculum
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-400 text-slate-950 transition group-hover:translate-x-1">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Learning experience */}
      <section id="experience" className="relative overflow-hidden bg-[#09090b] px-5 py-24 lg:px-10 lg:py-32">
        <div className="absolute -right-40 top-10 h-96 w-96 rounded-full bg-red-950/60 blur-3xl" />
        <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <SectionLabel>Learning experience</SectionLabel>
            <h2 className="max-w-2xl text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              A learning ecosystem that follows the learner.
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Our digital learning environment connects content, live
              sessions, assessments, projects, submissions, feedback and
              progress into one continuous experience.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {learningPillars.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-red-600" size={18} />
                  <span className="text-sm font-semibold text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 shadow-2xl">
              <img
                src={aiHero}
                alt="AI learning ecosystem"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <div className="relative min-h-[480px]">
                <div className="absolute left-0 top-0 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <Layers3 className="text-red-300" size={22} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Curriculum</p>
                  <p className="mt-1 text-lg font-extrabold text-white">Structured learning</p>
                </div>
                <div className="absolute right-0 top-24 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <Target className="text-red-300" size={22} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Assessment</p>
                  <p className="mt-1 text-lg font-extrabold text-white">Measure progress</p>
                </div>
                <div className="absolute bottom-0 left-10 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <Rocket className="text-red-300" size={22} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Outcome</p>
                  <p className="mt-1 text-lg font-extrabold text-white">Build confidence</p>
                </div>
                <div className="absolute bottom-16 right-2 rounded-2xl border border-red-300/20 bg-red-300/10 p-5 backdrop-blur-xl">
                  <ShieldCheck className="text-red-200" size={22} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-red-100">Analytics</p>
                  <p className="mt-1 text-lg font-extrabold text-white">See the journey</p>
                </div>
                <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/40 bg-red-300/10 shadow-[0_0_80px_rgba(220,38,38,0.28)]">
                  <div className="absolute inset-5 rounded-full border border-red-200/50" />
                  <BrainCircuit className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-200" size={32} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About image / careers */}
      <section id="careers" className="relative overflow-hidden px-5 py-24 lg:px-10 lg:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${placementBg})` }}
        />
        <div className="absolute inset-0 bg-slate-950/85" />
        <div className="relative mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionLabel light>Career readiness</SectionLabel>
            <h2 className="max-w-3xl text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              From learning a technology to being ready to use it.
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Build a portfolio through practical work, develop confidence
              through assessments and receive structured support as you move
              toward internships and career opportunities.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {["Projects", "Internships", "Career support", "Portfolio building"].map((item) => (
                <span key={item} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur">
            <img
              src={placementsImg}
              alt="Career and hiring ecosystem"
              className="w-full rounded-[20px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="bg-[#0f0f11] px-5 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-3xl">
            <SectionLabel>Certification</SectionLabel>
            <h2 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Evidence of learning that looks as serious as the journey.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {[certificate1, certificate2].map((src, index) => (
              <div key={src} className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#151518] p-3 shadow-[0_25px_70px_rgba(0,0,0,.35)] transition hover:-translate-y-1 hover:border-red-800">
                <img
                  src={src}
                  alt={index === 0 ? "Sample certificate" : "Internship certificate"}
                  className="w-full rounded-[18px] object-cover transition duration-500 group-hover:scale-[1.01]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#09090b] px-5 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <SectionLabel>Learner perspective</SectionLabel>
          <div className="grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-red-950/30 md:grid-cols-3">
            {[
              ["Mayank Yadav", "Data Scientist", "Excellent training and industry-oriented projects."],
              ["Arpita Shome", "Data Analyst", "Great support for placements and internships."],
              ["Rupam Kohli", "AIML Engineer", "Very practical learning approach."],
            ].map(([name, role, quote]) => (
              <article key={name} className="bg-[#111114] p-8 lg:p-10">
                <div className="text-4xl font-black text-red-500">“</div>
                <p className="mt-3 min-h-20 text-lg leading-8 text-slate-300">{quote}</p>
                <div className="mt-8 border-t border-slate-200 pt-5">
                  <p className="font-extrabold text-white">{name}</p>
                  <p className="mt-1 text-sm text-slate-500">{role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-gradient-to-r from-red-950 via-red-700 to-red-950 px-5 py-20 lg:px-10 lg:py-24">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100/70">
              Start your next chapter
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Ready to build with AI, data and what comes next?
            </h2>
          </div>
          <button
            onClick={openContact}
            className="group flex w-fit shrink-0 items-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5"
          >
            Talk to Synaptech
            <ArrowRight size={18} className="transition group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-black px-5 py-24 text-white lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionLabel light>Connect</SectionLabel>
            <h2 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Let&apos;s build the future of learning.
            </h2>
            <div className="mt-8 space-y-4 text-slate-300">
              <a href="tel:+919560940039" className="block transition hover:text-red-300">+91 9560940039</a>
              <a href="mailto:admission@synaptecheducation.in" className="block transition hover:text-red-300">
                admission@synaptecheducation.in
              </a>
              <a
                href="https://maps.google.com/?q=Bollco+Co-working+Vaishali+Ghaziabad"
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-md leading-7 transition hover:text-red-300"
              >
                Plot No. 15, Bollco Co-working, Vaishali, Ghaziabad,
                Uttar Pradesh - 201010
              </a>
            </div>
            <button
              onClick={openContact}
              className="mt-8 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              Send an enquiry
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="overflow-hidden rounded-[26px] border border-white/10">
              <img src={contact1} alt="Synaptech technology" className="h-full min-h-[260px] w-full object-cover opacity-80" />
            </div>
            <div className="overflow-hidden rounded-[26px] border border-white/10">
              <img src={contact2} alt="AI network" className="h-full min-h-[260px] w-full object-cover opacity-80" />
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <LeadChatbot />

      {/* Contact modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 px-5 py-8 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[28px] bg-white p-7 shadow-2xl sm:p-10">
            <button
              onClick={() => setShowContactForm(false)}
              className="absolute right-5 top-5 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
              aria-label="Close contact form"
            >
              <X size={20} />
            </button>

            <div className="mb-8 pr-10">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
                Get in touch
              </div>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                Start a conversation.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Tell us what you want to learn and our team will get back to you.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submitContactToAira}>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Your name"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-950 caret-red-600 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
                />
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email address"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-950 caret-red-600 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
                />
              </div>
              <input
                type="tel"
                required
                value={contactForm.phone}
                onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-950 caret-red-600 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
              />
              <input
                type="text"
                required
                value={contactForm.place}
                onChange={(event) => setContactForm((current) => ({ ...current, place: event.target.value }))}
                placeholder="City / place"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-950 caret-red-600 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
              />
              <textarea
                value={contactForm.question}
                onChange={(event) => setContactForm((current) => ({ ...current, question: event.target.value }))}
                placeholder="How can we help?"
                rows="5"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-950 caret-red-600 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={contactSubmitting}
                className="w-full rounded-2xl bg-slate-950 px-6 py-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
              >
                {contactSubmitting ? "Connecting to Aira…" : "Continue with Aira"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
