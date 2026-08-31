import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { FaArrowLeft, FaUsers, FaUserCheck, FaUserClock, FaUserTimes, FaBook, FaSyncAlt, FaExclamationTriangle } from "react-icons/fa";

const safeNumber = (v) => Number(v || 0);
const dateValue = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function Kpi({ label, value, sub, icon, tone }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,.06)]">
    <div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div><span className="text-[9px] font-black tracking-[.18em] text-slate-300">LIVE</span></div>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{sub}</p>
  </div>;
}

const Panel = ({ eyebrow, title, children, className="" }) => <section className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.065)] md:p-7 ${className}`}>
  <p className="text-[10px] font-black tracking-[.22em] text-blue-600">{eyebrow}</p>
  <h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">{title}</h2>
  {children}
</section>;

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [mcqTests, setMcqTests] = useState([]);
  const [mcqResults, setMcqResults] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const read = async (name) => {
      try {
        const snap = await getDocs(collection(db, name));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        return [];
      }
    };
    const [
      st, rej, cr, ba, mo, asg, sub, tests, results, sessions, recs
    ] = await Promise.all([
      read("students"), read("rejectedStudents"), read("courses"), read("batches"),
      read("modules"), read("assignments"), read("submissions"), read("mcqTests"),
      read("mcqResults"), read("liveSessions"), read("recordedSessions")
    ]);
    setStudents(st); setRejected(rej); setCourses(cr); setBatches(ba); setModules(mo);
    setAssignments(asg); setSubmissions(sub); setMcqTests(tests); setMcqResults(results);
    setLiveSessions(sessions); setRecordings(recs);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approved = students.filter((s) => s.approved === true).length;
  const pending = students.filter((s) => !s.approved).length;
  const active = students.filter((s) => String(s.status || "").toLowerCase() === "active").length;
  const approvalRate = students.length ? Math.round((approved / students.length) * 100) : 0;

  const studentStatus = useMemo(() => [
    { name: "Approved", value: approved }, { name: "Pending", value: pending },
    { name: "Rejected", value: rejected.length }
  ].filter(x => x.value > 0), [approved, pending, rejected.length]);

  const operational = [
    { name: "Students", value: students.length },
    { name: "Courses", value: courses.length },
    { name: "Batches", value: batches.length },
    { name: "Modules", value: modules.length },
    { name: "Assignments", value: assignments.length },
    { name: "Submissions", value: submissions.length },
    { name: "Mini Tests", value: mcqTests.length },
    { name: "Live Sessions", value: liveSessions.length },
    { name: "Recordings", value: recordings.length }
  ];

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6-i));
      return { date: d, name: d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" }), Students:0, Submissions:0, Sessions:0 };
    });
    students.forEach(s => { const d=dateValue(s.createdAt || s.registeredAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Students++; });
    submissions.forEach(s => { const d=dateValue(s.submittedAt || s.createdAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Submissions++; });
    liveSessions.forEach(s => { const d=dateValue(s.startTime || s.scheduledAt || s.createdAt); if(!d)return; const x=days.find(y=>y.date.toDateString()===d.toDateString()); if(x)x.Sessions++; });
    return days;
  }, [students, submissions, liveSessions]);

  const redFlags = [
    pending > 0 && { label: `${pending} student${pending > 1 ? "s" : ""} awaiting approval`, severity: "Attention", action: "Review Student Management" },
    assignments.length > 0 && submissions.length === 0 && { label: "No assignment submissions are currently recorded", severity: "Watch", action: "Review Submissions" },
    liveSessions.filter(s => !dateValue(s.startTime || s.scheduledAt)).length > 0 && { label: "Some live-session records have no recognised schedule date", severity: "Data quality", action: "Review Live Sessions" },
  ].filter(Boolean);

  return <div className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
    <div className="mx-auto max-w-[1750px] space-y-6">
      <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-[0_25px_80px_rgba(15,23,42,.20)] md:p-9">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"/><div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl"/>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><button onClick={()=>navigate("/admin")} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300"><FaArrowLeft/> Admin Console</button>
            <p className="text-[10px] font-black tracking-[.25em] text-blue-300">EXECUTIVE ANALYTICS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Admin Analytics Command Centre</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Serious operational analytics built from the existing Firestore collections. Read-only: no existing records are modified.</p>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900"><FaSyncAlt className={loading?"animate-spin":""}/> Refresh data</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total students" value={students.length} sub="Registered student records" icon={<FaUsers/>} tone="bg-blue-50 text-blue-700"/>
        <Kpi label="Approved" value={approved} sub={`${approvalRate}% approval rate`} icon={<FaUserCheck/>} tone="bg-emerald-50 text-emerald-700"/>
        <Kpi label="Pending" value={pending} sub="Requires administrative review" icon={<FaUserClock/>} tone="bg-amber-50 text-amber-700"/>
        <Kpi label="Rejected" value={rejected.length} sub={`${active} currently marked active`} icon={<FaUserTimes/>} tone="bg-rose-50 text-rose-700"/>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Panel eyebrow="7-DAY OPERATING PULSE" title="Student, submission & session activity">
          <div className="mt-6 h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={activity}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="Students" stroke="#2563eb" strokeWidth={3}/><Line type="monotone" dataKey="Submissions" stroke="#10b981" strokeWidth={3}/><Line type="monotone" dataKey="Sessions" stroke="#8b5cf6" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="STUDENT HEALTH" title="Approval distribution">
          <div className="mt-4 h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={studentStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>{studentStatus.map((_,i)=><Cell key={i} fill={["#2563eb","#f59e0b","#f43f5e"][i%3]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-3 gap-2">{studentStatus.map((x)=><div key={x.name} className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-lg font-black text-slate-900">{x.value}</p><p className="text-[10px] font-bold text-slate-500">{x.name}</p></div>)}</div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="INSTITUTIONAL FOOTPRINT" title="Operational volume by function">
          <div className="mt-6 h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={operational} layout="vertical" margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={85}/><Tooltip/><Bar dataKey="value" fill="#4f46e5" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="MANAGEMENT FLAGS" title="What needs attention now">
          <div className="mt-6 space-y-3">
            {redFlags.length ? redFlags.map((f,i)=><div key={i} className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><div className="mt-1 text-amber-600"><FaExclamationTriangle/></div><div><p className="text-sm font-black text-slate-900">{f.label}</p><p className="mt-1 text-xs font-bold text-amber-700">{f.severity} • {f.action}</p></div></div>) : <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-black text-emerald-800">No immediate red flags detected.</p><p className="mt-1 text-xs text-emerald-700">The current snapshot is within the available data signals.</p></div>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course library</p><p className="mt-1 text-2xl font-black">{courses.length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Learning modules</p><p className="mt-1 text-2xl font-black">{modules.length}</p></div></div>
        </Panel>
      </div>

      <Panel eyebrow="MANAGEMENT REGISTER" title="Live operating data">
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="p-3">Area</th><th className="p-3">Records</th><th className="p-3">Signal</th></tr></thead><tbody>{operational.map(x=><tr key={x.name} className="border-b border-slate-100"><td className="p-3 text-sm font-bold text-slate-800">{x.name}</td><td className="p-3 text-sm font-black text-slate-900">{x.value}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">READ-ONLY LIVE</span></td></tr>)}</tbody></table></div>
        <p className="mt-4 text-xs text-slate-400">{lastUpdated ? `Last refreshed ${lastUpdated.toLocaleString("en-IN")}` : "Loading live snapshot…"}</p>
      </Panel>
    </div>
  </div>;
}
