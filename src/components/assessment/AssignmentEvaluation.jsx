import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { loadAssignmentEvaluation } from "../../services/assessmentEvaluationService";

const STATUS_COLORS = ["#10b981", "#f59e0b", "#cbd5e1"];

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(1)}%`;
};

const statusClasses = {
  Complete:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Evaluation Awaited":
    "bg-amber-50 text-amber-700 border-amber-200",
  "Evaluation Awaited":
    "bg-amber-50 text-amber-700 border-amber-200",
  "Not Submitted":
    "bg-slate-50 text-slate-500 border-slate-200",
  "Not Started":
    "bg-slate-50 text-slate-500 border-slate-200",
  "In Progress":
    "bg-blue-50 text-blue-700 border-blue-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${
        statusClasses[status] ||
        "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function KpiCard({ label, value, helper, icon }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-100/60 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {value}
          </p>
          <p className="text-xs text-slate-500 mt-1">{helper}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentEvaluation({ student }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!student?.email) {
        if (active) {
          setData(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await loadAssignmentEvaluation(
          student.email,
          student.batchId
        );

        if (active) {
          setData(result);
        }
      } catch (err) {
        console.error("Assignment Evaluation load failed:", err);
        if (active) {
          setError(
            "Unable to load assignment evaluation data. Please refresh the page."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [student?.email, student?.batchId]);

  const summary = data?.summary || {
    totalAssignments: 0,
    submittedAssignments: 0,
    evaluatedAssignments: 0,
    pendingEvaluations: 0,
    notSubmittedAssignments: 0,
    averagePercentage: null,
    highestPercentage: null,
  };

  const moduleRows = data?.moduleRows || [];
  const details = data?.details || [];

  const chartRows = useMemo(
    () =>
      moduleRows
        .filter(
          (row) =>
            Number(row.evaluatedCount || 0) > 0 &&
            row.averagePercentage !== null
        )
        .map((row) => ({
          module: row.module,
          score: Number(row.averagePercentage),
        })),
    [moduleRows]
  );

  const pieData = useMemo(
    () =>
      [
        {
          name: "Complete",
          value: Number(summary.completedAssignments || 0),
        },
        {
          name: "Evaluation Awaited",
          value: Number(summary.pendingEvaluations || 0),
        },
        {
          name: "Not Submitted",
          value: Number(summary.notSubmittedAssignments || 0),
        },
      ].filter((item) => item.value > 0),
    [summary]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
          <div className="mx-auto w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="mt-4 font-bold text-slate-700">
            Loading assignment evaluation...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-bold text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* KPI SECTION */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
              Assignment Performance
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Assignment Evaluation
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Evaluation is based on actual assignments and student submissions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Assignments"
            value={summary.totalAssignments}
            helper="Configured for your batch"
            icon="📘"
          />
          <KpiCard
            label="Submitted"
            value={summary.submittedAssignments}
            helper="Actual student submissions"
            icon="📤"
          />
          <KpiCard
            label="Evaluated"
            value={summary.evaluatedAssignments}
            helper="At least one attempt evaluated"
            icon="✓"
          />
          <KpiCard
            label="Average Score"
            value={formatPercent(summary.averagePercentage)}
            helper="Evaluated submissions only"
            icon="📈"
          />
          <KpiCard
            label="Highest Score"
            value={formatPercent(summary.highestPercentage)}
            helper="Best evaluated result"
            icon="🏆"
          />
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="bg-white/90 border border-slate-200 rounded-3xl shadow-[0_18px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-100">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Performance Analytics
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Assignment Analytics
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Only evaluated submissions contribute to scores; status reflects the latest submission.
          </p>
        </div>

        <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6">
          {/* BAR CHART */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Average Evaluated Score by Module
            </div>

            {chartRows.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-slate-500">
                No assignment has been evaluated yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={chartRows}
                  margin={{ top: 10, right: 15, left: 0, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="module"
                    angle={-28}
                    textAnchor="end"
                    interval={0}
                    height={75}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      "Average Score",
                    ]}
                  />
                  <Bar
                    dataKey="score"
                    name="Average Score"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* PIE CHART */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Assignment Status
            </div>

            {pieData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-slate-500">
                No assignment records available.
              </div>
            ) : (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="48%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-2">
                  {pieData.map((item, index) => (
                    <div
                      key={item.name}
                      className="rounded-xl bg-white border border-slate-100 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[index % STATUS_COLORS.length],
                          }}
                        />
                        <span className="text-xs font-semibold text-slate-600">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-black text-slate-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* MODULE-WISE TABLE */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-[0_18px_60px_rgba(15,23,42,0.07)] overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-slate-50 border-b border-slate-100">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Module Performance
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Module-wise Assignment Evaluation
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            The table expands automatically as modules and assignments are added.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  #
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Module
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide">
                  Assignments
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide">
                  Submitted
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide">
                  Evaluated
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide">
                  Avg. Score
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide">
                  Highest
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {moduleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No modules are available for Assignment Evaluation.
                  </td>
                </tr>
              ) : (
                moduleRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-blue-50/40 transition"
                  >
                    <td className="px-5 py-4 font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-800">
                      {row.module}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">
                      {row.assignmentCount}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">
                      {row.submittedCount}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-emerald-700">
                      {row.evaluatedCount}
                    </td>
                    <td className="px-5 py-4 text-center font-black text-blue-700">
                      {formatPercent(row.averagePercentage)}
                    </td>
                    <td className="px-5 py-4 text-center font-black text-indigo-700">
                      {formatPercent(row.highestPercentage)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DETAILED RESULTS */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-[0_18px_60px_rgba(15,23,42,0.07)] overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-100">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Evaluation History
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Assignment Evaluation Results
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Actual Assignment definitions and the student's latest submission status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Module
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Assignment
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Due Date
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Score
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Submission Date
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Evaluation Date
                </th>
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No Assignment records are configured for this batch yet.
                  </td>
                </tr>
              ) : (
                details.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {item.module}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900">
                      {item.title}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.dueDate || "—"}
                    </td>
                    <td className="px-5 py-4 font-black text-blue-700">
                      {item.scoreDisplay || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.submissionDate || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.evaluationDate || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
