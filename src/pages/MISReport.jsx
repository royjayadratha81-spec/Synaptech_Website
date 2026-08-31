import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { FaArrowLeft, FaFileAlt, FaPrint, FaSyncAlt, FaExclamationTriangle, FaCheckCircle, FaUsers, FaWallet, FaBook, FaVideo } from "react-icons/fa";

const dateOf = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

function Kpi({ icon, label, value, sub, tone }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,.06)]">
    <div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</span><span className="text-[9px] font-black tracking-[.18em] text-slate-300">MIS</span></div>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p>
  </div>;
}
function Panel({ eyebrow, title, children }) {
  return <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.065)] md:p-7"><p className="text-[10px] font-black tracking-[.22em] text-blue-600">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">{title}</h2>{children}</section>;
}

export default function MISReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [data, setData] = useState({
    students: [], rejected: [], courses: [], batches: [], modules: [], assignments: [],
    submissions: [], tests: [], results: [], sessions: [], recordings: [], finance: [],
    payments: [], certificates: [], faculty: [], news: [], materials: []
  });

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
    const names = ["students","rejectedStudents","courses","batches","modules","assignments","submissions","mcqTests","mcqResults","liveSessions","recordedSessions","finance","payments","certificates","faculties","newsItems","courseMaterials"];
    const values = await Promise.all(names.map(read));
    const [students,rejected,courses,batches,modules,assignments,submissions,tests,results,sessions,recordings,finance,payments,certificates,faculty,news,materials] = values;
    setData({students,rejected,courses,batches,modules,assignments,submissions,tests,results,sessions,recordings,finance,payments,certificates,faculty,news,materials});
    setLastUpdated(new Date());
    setLoading(false);
  }, []);
  useEffect(()=>{load();},[load]);

  const approved = data.students.filter(s=>s.approved===true).length;
  const pending = data.students.filter(s=>!s.approved).length;
  const expected = data.finance.reduce((a,r)=>a+Number(r.agreedFee||0),0);
  const collected = data.finance.reduce((a,r)=>a+Number(r.amountPaid||0),0);
  const outstanding = data.finance.reduce((a,r)=>a+Math.max(0,Number(r.balanceAmount||0)),0);
  const collectionRate = expected ? Math.round(collected/expected*100) : 0;
  const verified = data.finance.filter(r=>r.verified===true).length;
  const paid = data.finance.filter(r=>r.paymentStatus==="Paid").length;

  const financeMix = [
    {name:"Collected",value:collected},{name:"Outstanding",value:outstanding}
  ].filter(x=>x.value>0);

  const activity = useMemo(()=>{
    const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-i));return {d,name:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),Students:0,Submissions:0,Sessions:0,Payments:0};});
    const add=(rows,keys,field)=>rows.forEach(r=>{const d=dateOf(keys.map(k=>r[k]).find(Boolean));if(!d)return;const x=days.find(y=>y.d.toDateString()===d.toDateString());if(x)x[field]++;});
    add(data.students,["createdAt","registeredAt","createdDate"],"Students");
    add(data.submissions,["submittedAt","createdAt"],"Submissions");
    add(data.sessions,["startTime","scheduledAt","createdAt"],"Sessions");
    add(data.payments,["createdAt","paymentDate","paidAt"],"Payments");
    return days;
  },[data]);

  const redFlags = [
    pending>0 && {title:`${pending} student${pending>1?"s":""} awaiting approval`,severity:"HIGH",action:"Review Student Management"},
    outstanding>0 && {title:`${money(outstanding)} outstanding fee balance`,severity:"HIGH",action:"Open Finance Dashboard"},
    data.finance.filter(r=>r.paymentProofUploaded && !r.verified).length>0 && {title:`${data.finance.filter(r=>r.paymentProofUploaded && !r.verified).length} uploaded receipt${data.finance.filter(r=>r.paymentProofUploaded && !r.verified).length>1?"s":""} awaiting verification`,severity:"MEDIUM",action:"Verify payment receipts"},
    data.assignments.length>0 && data.submissions.length===0 && {title:"No assignment submissions recorded in the current data snapshot",severity:"WATCH",action:"Review Submissions"},
    data.sessions.filter(r=>!dateOf(r.startTime||r.scheduledAt)).length>0 && {title:"Some live-session records have no recognised schedule date",severity:"DATA",action:"Review Live Sessions"}
  ].filter(Boolean);

  return <div className="min-h-screen bg-[#f3f6fa] px-4 py-5 sm:px-6 lg:px-10 lg:py-8 print:bg-white print:px-0">
    <div className="mx-auto max-w-[1800px] space-y-6">
      <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,.20)] md:p-10 print:bg-slate-950">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"/><div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl"/>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><button onClick={()=>navigate("/admin")} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 print:hidden"><FaArrowLeft/> Admin Console</button>
          <p className="text-[10px] font-black tracking-[.25em] text-cyan-300">MANAGEMENT INFORMATION SYSTEM</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Daily Institute MIS Report</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">A read-only executive snapshot of the institute's students, academics, assessments, sessions, content, finance and operating signals.</p></div>
          <div className="flex flex-wrap gap-2 print:hidden"><button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold"><FaSyncAlt className={loading?"animate-spin":""}/> Refresh</button><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"><FaPrint/> Generate / Print MIS</button></div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<FaUsers/>} label="Student base" value={data.students.length} sub={`${approved} approved • ${pending} pending`} tone="bg-blue-50 text-blue-700"/>
        <Kpi icon={<FaBook/>} label="Academic footprint" value={`${data.courses.length} / ${data.modules.length}`} sub="Courses / modules" tone="bg-violet-50 text-violet-700"/>
        <Kpi icon={<FaWallet/>} label="Collected revenue" value={money(collected)} sub={`${collectionRate}% of expected ${money(expected)}`} tone="bg-emerald-50 text-emerald-700"/>
        <Kpi icon={<FaVideo/>} label="Delivery activity" value={data.sessions.length} sub={`${data.recordings.length} recordings`} tone="bg-cyan-50 text-cyan-700"/>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Panel eyebrow="7-DAY INSTITUTE PULSE" title="Activity trend">
          <div className="mt-5 h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={activity}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="Students" stroke="#2563eb" strokeWidth={3}/><Line type="monotone" dataKey="Submissions" stroke="#10b981" strokeWidth={3}/><Line type="monotone" dataKey="Sessions" stroke="#8b5cf6" strokeWidth={3}/><Line type="monotone" dataKey="Payments" stroke="#f59e0b" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="FINANCIAL POSITION" title="Collected vs outstanding">
          <div className="mt-4 h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={financeMix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>{financeMix.map((_,i)=><Cell key={i} fill={["#10b981","#f59e0b"][i]}/>)}</Pie><Tooltip formatter={(v)=>money(v)}/></PieChart></ResponsiveContainer></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">Verified accounts</p><p className="mt-1 text-2xl font-black">{verified}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-700">Paid accounts</p><p className="mt-1 text-2xl font-black">{paid}</p></div></div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="ACADEMIC & OPERATIONS" title="Functional volume">
          <div className="mt-5 h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[
            {name:"Students",value:data.students.length},{name:"Batches",value:data.batches.length},{name:"Courses",value:data.courses.length},{name:"Assignments",value:data.assignments.length},{name:"Submissions",value:data.submissions.length},{name:"Mini Tests",value:data.tests.length},{name:"Sessions",value:data.sessions.length},{name:"Recordings",value:data.recordings.length}
          ]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-18} textAnchor="end" height={60}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#4f46e5" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel eyebrow="EXECUTIVE EXCEPTIONS" title="Red flags & management actions">
          <div className="mt-5 space-y-3">{redFlags.length?redFlags.map((f,i)=><div key={i} className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><FaExclamationTriangle className="mt-1 text-amber-600"/><div><p className="text-sm font-black text-slate-900">{f.title}</p><p className="mt-1 text-[10px] font-black tracking-wider text-amber-700">{f.severity} • {f.action}</p></div></div>):<div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><FaCheckCircle className="text-emerald-600"/><p className="mt-2 font-black text-emerald-800">No immediate red flags detected.</p></div>}</div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Outstanding</p><p className="mt-1 text-xl font-black">{money(outstanding)}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Receipts pending verification</p><p className="mt-1 text-xl font-black">{data.finance.filter(r=>r.paymentProofUploaded&&!r.verified).length}</p></div></div>
        </Panel>
      </div>

      <Panel eyebrow="DAILY MANAGEMENT REGISTER" title="Institute operating table">
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="p-3">Function</th><th className="p-3">Current records</th><th className="p-3">Management signal</th><th className="p-3">Report note</th></tr></thead>
        <tbody>{[
          ["Students",data.students.length,pending?"Attention":"Stable",`${approved} approved / ${pending} pending`],
          ["Courses",data.courses.length,"Stable","Existing course catalogue"],
          ["Batches",data.batches.length,"Stable","Existing batch records"],
          ["Assignments",data.assignments.length,"Monitor",`${data.submissions.length} submissions recorded`],
          ["Mini Tests",data.tests.length,"Monitor",`${data.results.length} result records`],
          ["Live Sessions",data.sessions.length,"Monitor",`${data.recordings.length} recordings`],
          ["Finance",data.finance.length,outstanding?"Attention":"Stable",`${money(collected)} collected / ${money(outstanding)} outstanding`],
          ["Certificates",data.certificates.length,"Monitor","Issued certificate records"],
          ["Faculty",data.faculty.length,"Monitor","Faculty records"],
          ["Course Materials",data.materials.length,"Monitor","Published/uploaded resource records"],
          ["News",data.news.length,"Monitor","News item records"]
        ].map(row=><tr key={row[0]} className="border-b border-slate-100"><td className="p-3 text-sm font-black text-slate-800">{row[0]}</td><td className="p-3 text-sm font-black">{row[1]}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-[10px] font-black ${row[2]==="Attention"?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"}`}>{row[2]}</span></td><td className="p-3 text-sm text-slate-500">{row[3]}</td></tr>)}</tbody></table></div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500">
        <span><FaFileAlt className="mr-2 inline text-blue-600"/>Daily MIS snapshot • {lastUpdated ? lastUpdated.toLocaleString("en-IN") : "Loading…"}</span>
        <span className="font-semibold">Read-only report • Existing Firestore data is the source of truth</span>
      </div>
    </div>
  </div>;
}
