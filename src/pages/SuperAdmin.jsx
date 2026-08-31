import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  FaBuilding,
  FaUsersCog,
  FaUserGraduate,
  FaBook,
  FaWallet,
  FaShieldAlt,
  FaArrowRight,
  FaChartLine,
  FaDatabase,
  FaFileAlt,
  FaUserFriends,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function Metric({ label, value, icon, tone }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_15px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    admins: 0,
    students: 0,
    courses: 0,
    batches: 0,
    modules: 0,
    financeAccounts: 0,
    expected: 0,
    collected: 0,
  });
  const [adminList, setAdminList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatform();
  }, []);

  const loadPlatform = async () => {
    setLoading(true);
    try {
      const [adminsSnap, studentsSnap, coursesSnap, batchesSnap, modulesSnap, financeSnap] =
        await Promise.all([
          getDocs(collection(db, "admins")),
          getDocs(collection(db, "students")),
          getDocs(collection(db, "courses")),
          getDocs(collection(db, "batches")),
          getDocs(collection(db, "modules")),
          getDocs(collection(db, "finance")),
        ]);

      const finance = financeSnap.docs.map((d) => d.data());
      setData({
        admins: adminsSnap.size,
        students: studentsSnap.size,
        courses: coursesSnap.size,
        batches: batchesSnap.size,
        modules: modulesSnap.size,
        financeAccounts: financeSnap.size,
        expected: finance.reduce((s, r) => s + Number(r.agreedFee || 0), 0),
        collected: finance.reduce((s, r) => s + Number(r.amountPaid || 0), 0),
      });

      // Never expose admin passwords in the UI.
      setAdminList(
        adminsSnap.docs.map((d) => ({
          id: d.id,
          email: d.id,
          role: d.data()?.role || "Administrator",
        }))
      );
    } catch (error) {
      console.error("Super Admin platform load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: "Students", value: data.students },
    { name: "Courses", value: data.courses },
    { name: "Batches", value: data.batches },
    { name: "Modules", value: data.modules },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1750px] space-y-6">
        <header className="relative overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] md:p-10">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.22em] text-violet-200">
                <FaShieldAlt /> SYNAPTECH • SUPER ADMIN
              </div>
              <h1 className="text-3xl font-black tracking-[-0.04em] md:text-5xl">Platform command centre</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                SaaS-level overview of the existing Synaptech LMS tenant. This page is read-only and aggregates the existing Firestore collections without changing their contracts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/admin")} className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold hover:bg-white/15">Admin Console</button>
              <button onClick={() => navigate("/finance")} className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">Finance Dashboard</button>
              <button onClick={() => navigate("/mis-report")} className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold hover:bg-white/15">Daily MIS</button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Students" value={data.students} icon={<FaUserGraduate />} tone="bg-blue-50 text-blue-700" />
          <Metric label="Administrators" value={data.admins} icon={<FaUsersCog />} tone="bg-violet-50 text-violet-700" />
          <Metric label="Courses" value={data.courses} icon={<FaBook />} tone="bg-emerald-50 text-emerald-700" />
          <Metric label="Finance accounts" value={data.financeAccounts} icon={<FaWallet />} tone="bg-amber-50 text-amber-700" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] md:p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-blue-600">TENANT FOOTPRINT</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Platform scale</h2>
              </div>
              <FaDatabase className="text-2xl text-blue-600" />
            </div>
            <div className="mt-5 h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[9, 9, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50 p-6 shadow-[0_18px_55px_rgba(16,185,129,0.09)] md:p-7">
            <div className="flex h-full flex-col">
              <p className="text-[10px] font-black tracking-[0.2em] text-emerald-700">REVENUE OVERVIEW</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Financial footprint</h2>
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold text-slate-400">Expected revenue</p><p className="mt-1 text-2xl font-black text-slate-900">₹{data.expected.toLocaleString()}</p></div>
                <div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold text-slate-400">Collected revenue</p><p className="mt-1 text-2xl font-black text-emerald-700">₹{data.collected.toLocaleString()}</p></div>
              </div>
              <button onClick={() => navigate("/finance")} className="mt-auto inline-flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">
                Open Finance Dashboard <FaArrowRight />
              </button>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
            <p className="text-[10px] font-black tracking-[0.2em] text-violet-600">ADMIN DIRECTORY</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Platform administrators</h2>
            <p className="mt-1 text-sm text-slate-500">Only account identifiers and role labels are displayed; credentials are never rendered.</p>
            <div className="mt-5 space-y-3">
              {loading ? <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Loading administrators…</div> :
                adminList.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No administrator records found.</div> :
                adminList.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div><p className="text-sm font-black text-slate-800">{admin.email}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{admin.role}</p></div>
                    <FaUsersCog className="text-violet-500" />
                  </div>
                ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
            <p className="text-[10px] font-black tracking-[0.2em] text-cyan-600">SAAS OPERATIONS</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Management surfaces</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Admin Console", "/admin", "Academic and operational control", <FaShieldAlt />, "from-blue-600 to-indigo-600"],
                ["Finance Dashboard", "/finance", "Revenue and payment verification", <FaWallet />, "from-emerald-600 to-teal-600"],
                ["Admin Analytics", "/admin-analytics", "Executive analytics, trends and red flags", <FaChartLine />, "from-violet-600 to-fuchsia-600"],
                ["Student Management", "/admin/students", "Student records, approvals and operations", <FaUserFriends />, "from-cyan-600 to-blue-600"],
                ["Daily MIS Report", "/mis-report", "Institute-wide management information report", <FaFileAlt />, "from-orange-500 to-rose-600"],
              ].map(([label, path, desc, icon, gradient]) => (
                <button key={path} onClick={() => navigate(path)} className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>{icon}</div>
                  <div className="flex items-start justify-between gap-3"><span className="text-sm font-black text-slate-900">{label}</span><FaArrowRight className="mt-0.5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" /></div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                  <div className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-slate-300 group-hover:text-blue-500">Open workspace</div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
              <FaChartLine /> <span>Existing student, course, batch, module and finance data remains the source of truth.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
