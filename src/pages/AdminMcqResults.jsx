import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString("en-IN") : "—";
};

export default function AdminMcqResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(collection(db, "mcqResults"));
        const rows = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        rows.sort((a, b) => {
          const aDate = a.submittedAt || a.completedAt || a.createdAt;
          const bDate = b.submittedAt || b.completedAt || b.createdAt;
          return (toDate(bDate)?.getTime() || 0) - (toDate(aDate)?.getTime() || 0);
        });

        if (active) setResults(rows);
      } catch (err) {
        console.error("Admin MCQ results load failed:", err);
        if (active) setError("Unable to load Mini-Test results.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = normalize(search);
    if (!query) return results;

    return results.filter((row) =>
      [row.studentEmail, row.moduleId, row.testId, row.studentName]
        .some((value) => normalize(value).includes(query))
    );
  }, [results, search]);

  const average = useMemo(() => {
    const percentages = results
      .map((row) => {
        const score = Number(row.score);
        const maximum = Number(row.totalQuestions || row.maxScore || row.totalMarks);
        return maximum > 0 ? (score / maximum) * 100 : null;
      })
      .filter((value) => value !== null && Number.isFinite(value));

    return percentages.length
      ? `${(percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(1)}%`
      : "—";
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-7">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white shadow-2xl p-7 md:p-9">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Assessment Administration</p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">Mini-Test Results</h1>
            <p className="text-blue-100/80 mt-2">All student Mini-Test attempts and automatically evaluated scores.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Attempts</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{results.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Students</p>
            <p className="text-3xl font-black text-blue-700 mt-2">{new Set(results.map((row) => normalize(row.studentEmail)).filter(Boolean)).size}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Average Score</p>
            <p className="text-3xl font-black text-emerald-700 mt-2">{average}</p>
          </div>
        </section>

        <section className="rounded-[28px] bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Student Results</p>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Mini-Test Attempt History</h2>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, module or test"
                className="w-full md:w-80 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading Mini-Test results...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 font-semibold">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No Mini-Test results found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-5 py-4 text-left">Student</th>
                    <th className="px-5 py-4 text-left">Module</th>
                    <th className="px-5 py-4 text-left">Test</th>
                    <th className="px-5 py-4 text-center">Score</th>
                    <th className="px-5 py-4 text-center">Attempt</th>
                    <th className="px-5 py-4 text-center">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const maximum = Number(row.totalQuestions || row.maxScore || row.totalMarks || 0);
                    return (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                        <td className="px-5 py-4 font-semibold text-slate-800">{row.studentEmail || row.studentName || "—"}</td>
                        <td className="px-5 py-4 text-slate-600">{row.moduleId || "—"}</td>
                        <td className="px-5 py-4 text-slate-600">{row.testId || "—"}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 font-black text-blue-700">
                            {maximum ? `${row.score ?? 0}/${maximum}` : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-600">{row.attemptNumber ?? "—"}</td>
                        <td className="px-5 py-4 text-center text-slate-600">{formatDate(row.submittedAt || row.completedAt || row.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
