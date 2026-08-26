import React, { useEffect, useMemo, useState } from "react";
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

import loadMiniTestEvaluationData from "../utils/miniTestEvaluationService";

const PIE_COLORS = ["#4f46e5", "#8b5cf6", "#06b6d4", "#94a3b8"];

function formatScore(score, maximum) {
  if (score === null || score === undefined || maximum === null || maximum === undefined) {
    return "—";
  }

  return `${Number(score).toFixed(0)}/${Number(maximum).toFixed(0)}`;
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return `${number.toFixed(0)}%`;
}

function statusBadge(status) {
  if (status === "Attempted") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function ViewMcqResults({ student }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!student?.email || !student?.batchId) {
        throw new Error(
          "Your student profile or batch could not be resolved. Please log in again."
        );
      }

      const result = await loadMiniTestEvaluationData({
        studentEmail: student.email,
        batchId: student.batchId,
        moduleId: selectedModuleId,
        testId: selectedTestId,
      });

      setData(result);
    } catch (err) {
      console.error("Mini-Test Evaluation load error:", err);
      setError(
        err?.message ||
          "Unable to load Mini-Test evaluation data."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [student?.email, student?.batchId, selectedModuleId, selectedTestId]);

  // Defensive UI filter:
  // Interview Questions & Answers is never an assessment module.
  const isAssessmentModule = (module) => {
    const value = String(
      module?.module ||
        module?.name ||
        module?.moduleName ||
        module?.moduleId ||
        ""
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    return value !== "interviewquestionsanswers";
  };

  const visibleTests = useMemo(() => {
    if (!data?.tests) return [];

    return data.tests.filter(isAssessmentModule);
  }, [data]);

  const tableRows = useMemo(() => {
    if (!data?.modules) return [];

    return data.modules.filter(isAssessmentModule);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.moduleChartData) return [];

    return data.moduleChartData
      .filter(isAssessmentModule)
      .map((item) => ({
        ...item,
        displayScore: Number(item.averagePercentage || 0),
      }));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <p className="mt-4 text-slate-600 font-medium">
              Loading Mini-Test Evaluation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border border-red-200 bg-white shadow-sm p-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Mini-Test Evaluation
            </h1>
            <p className="mt-3 text-red-600">
              {error}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="mt-5 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const scoreDistribution =
    data?.scoreDistributionChart || [];

  const totalTests = Number(kpis.totalMiniTests || 0);
  const studentsAttempted = Number(
    kpis.totalStudentsAttempted ??
      kpis.studentsAttempted ??
      0
  );
  const totalAttempts = Number(
    kpis.totalAttempts || 0
  );
  const averagePercentage =
    kpis.averagePercentage === null ||
    kpis.averagePercentage === undefined
      ? null
      : Number(kpis.averagePercentage);
  const highestPercentage =
    kpis.highestPercentage === null ||
    kpis.highestPercentage === undefined
      ? null
      : Number(kpis.highestPercentage);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 pointer-events-none" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Assessment Centre
                </p>

                <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                  Mini-Test Evaluation
                </h1>

                <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-500">
                  Module-wise Mini-Test performance based on
                  actual student submissions and auto-evaluated results.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedModuleId}
                  onChange={(event) => {
                    setSelectedModuleId(event.target.value);
                    setSelectedTestId("");
                  }}
                  className="min-w-[190px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Modules</option>
                  {(data?.modules || []).map((module) => (
                    <option
                      key={module.moduleId}
                      value={module.moduleId}
                    >
                      {module.module}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTestId}
                  onChange={(event) =>
                    setSelectedTestId(event.target.value)
                  }
                  className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Mini-Tests</option>
                  {visibleTests.map((test) => (
                    <option
                      key={test.testId}
                      value={test.testId}
                    >
                      {test.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-100/70 blur-2xl" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-slate-500">
              Mini-Tests
            </p>
            <p className="relative mt-2 text-3xl font-black text-slate-900">
              {totalTests}
            </p>
            <p className="relative mt-1 text-xs text-slate-400">
              configured Mini-Tests
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-violet-100/70 blur-2xl" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-slate-500">
              Tests Attempted
            </p>
            <p className="relative mt-2 text-3xl font-black text-slate-900">
              {studentsAttempted}
            </p>
            <p className="relative mt-1 text-xs text-slate-400">
              attempted by you
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-cyan-100/70 blur-2xl" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Attempts
            </p>
            <p className="relative mt-2 text-3xl font-black text-slate-900">
              {totalAttempts}
            </p>
            <p className="relative mt-1 text-xs text-slate-400">
              all submitted attempts
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-100/70 blur-2xl" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Score
            </p>
            <p className="relative mt-2 text-3xl font-black text-emerald-600">
              {formatPercent(averagePercentage)}
            </p>
            <p className="relative mt-1 text-xs text-slate-400">
              best attempt per Mini-Test
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-amber-100/70 blur-2xl" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-slate-500">
              Highest Score
            </p>
            <p className="relative mt-2 text-3xl font-black text-amber-600">
              {formatPercent(highestPercentage)}
            </p>
            <p className="relative mt-1 text-xs text-slate-400">
              best recorded performance
            </p>
          </div>
        </section>

        {/* ANALYTICS */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* BAR */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Module Analytics
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Module-wise Average Score
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Based only on actual student Mini-Test results.
              </p>
            </div>

            <div className="h-[340px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 55,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="module"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={75}
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toFixed(1)}%`,
                        "Average Score",
                      ]}
                    />

                    <Bar
                      dataKey="displayScore"
                      name="Average Score"
                      fill="#4f46e5"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No Mini-Test module data available.
                </div>
              )}
            </div>
          </div>

          {/* PIE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                Performance Distribution
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Score Distribution
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Best attempt per student/test.
              </p>
            </div>

            <div className="h-[340px]">
              {scoreDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={3}
                      label
                    >
                      {scoreDistribution.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={
                            PIE_COLORS[index % PIE_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip />

                    <Legend
                      verticalAlign="bottom"
                      height={45}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No evaluated Mini-Test results available.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MODULE EVALUATION TABLE */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Evaluation Results
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Module-wise Mini-Test Evaluation
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Every assessment module is represented dynamically. Modules
              without a Mini-Test or student attempt remain visible.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-5 py-4 font-bold text-slate-600">
                    #
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Module
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Mini-Tests
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Attempted
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Attempts
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Average Score
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Highest
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableRows.length > 0 ? (
                  tableRows.map((row, index) => (
                    <tr
                      key={row.moduleId}
                      className="border-b border-slate-100 hover:bg-indigo-50/40 transition"
                    >
                      <td className="px-5 py-4 font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {row.module}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {row.moduleId}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {row.totalTests}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {row.studentsAttempted}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {row.totalAttempts}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-black text-indigo-700">
                          {row.averagePercentage !== null &&
                          row.averagePercentage !== undefined
                            ? `${Number(
                                row.averagePercentage
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-emerald-700">
                          {row.highestPercentage !== null &&
                          row.highestPercentage !== undefined
                            ? `${Number(
                                row.highestPercentage
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-bold ${statusBadge(
                            row.completedTests > 0
                              ? "Attempted"
                              : "Not Attempted"
                          )}`}
                        >
                          {row.completedTests > 0
                            ? "Attempted"
                            : "Not Attempted"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No modules are available for Mini-Test evaluation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TEST DETAIL TABLE */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
              Assessment Detail
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Mini-Test Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Only actual student attempts are included below.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Module
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Mini-Test
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Score
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Percentage
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Attempt
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Due Date
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Submitted
                  </th>
                  <th className="px-5 py-4 font-bold text-slate-600">
                    Evaluated
                  </th>
                </tr>
              </thead>

              <tbody>
                {data?.results?.filter((result) => {
                  const test = data.tests.find(
                    (item) => item.testId === result.testId
                  );

                  return isAssessmentModule(test);
                }).length ? (
                  data.results
                    .filter((result) => {
                      const test = data.tests.find(
                        (item) => item.testId === result.testId
                      );

                      return isAssessmentModule(test);
                    })
                    .map((result) => {
                      const test = data.tests.find(
                        (item) => item.testId === result.testId
                      );

                      return (
                      <tr
                        key={result.id}
                        className="border-b border-slate-100 hover:bg-violet-50/30 transition"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {test?.module ||
                            result.moduleId}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {test?.title ||
                            result.testTitle ||
                            "Mini Test"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-black text-indigo-700">
                            {formatScore(
                              result.score,
                              result.maximum
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-700">
                          {formatPercent(
                            result.percentage
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {result.attemptNumber ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {test?.dueDate || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {result.submittedDate || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {result.evaluationDate || result.submittedDateTime || "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No student Mini-Test submissions
                      have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
