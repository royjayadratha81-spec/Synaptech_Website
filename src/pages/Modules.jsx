import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Link } from "react-router-dom";

export default function Modules() {

  const [modules, setModules] = useState([]);
  useEffect(() => {

  fetchModules();

}, []);

const fetchModules = async () => {

  const snapshot = await getDocs(
    collection(db, "modules")
  );

  const moduleList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    // Interview Q&A is accessed from the Learning Hub sidebar,
    // so it is intentionally excluded from the 16 academic modules.
    if (String(data.moduleName || "").trim().toLowerCase() === "interview questions & answers" ||
        String(data.moduleName || "").trim().toLowerCase() === "interview") {
      return;
    }

    moduleList.push({
      id: docItem.id,
      ...data,
    });

  });

  moduleList.sort(
    (a, b) => a.moduleOrder - b.moduleOrder
  );

  setModules(moduleList);

};

  const moduleIcon = (name) => ({
    "Python": "🐍",
    "NumPy": "◈",
    "Pandas": "🐼",
    "Data Visualization": "◒",
    "EDA": "⌕",
    "Tableau": "▦",
    "Power BI": "◩",
    "SQL": "▤",
    "Excel": "▥",
    "R Language": "R",
    "Statistics & Mathematics": "∑",
    "Machine Learning": "◎",
    "Deep Learning": "◉",
    "Generative AI": "✦",
    "Agentic AI": "⚡",
    "MLOps": "↗",
  }[name] || "•");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -left-20 bottom-[-180px] h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1400px] px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">Synaptech Learning Hub</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Course Modules</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Explore your 16-module learning journey, track your progress and build practical skills from fundamentals to advanced AI.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {modules.length} learning modules
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module, index) => (
            <Link to={`/module/${module.id}`} key={module.id} className="group block focus:outline-none">
              <article className="relative h-full overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl focus:ring-4 focus:ring-blue-100">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-50 blur-2xl transition-all group-hover:bg-indigo-100" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white shadow-lg">
                      {moduleIcon(module.moduleName)}
                    </div>
                    <span className="text-xs font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-7 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Module {index + 1}</p>
                  <h2 className="mt-2 min-h-[58px] text-xl font-black leading-tight text-slate-900">{module.moduleName}</h2>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-semibold text-slate-500">Open module</span>
                    <span className="text-lg font-black text-blue-600 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}