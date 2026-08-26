import AssessmentSummaryCards from "../components/assessment/AssessmentSummaryCards";
import AssessmentHistoryTable from "../components/assessment/AssessmentHistoryTable";
import CapstoneHistoryTable from "../components/assessment/CapstoneHistoryTable";
import AssessmentAnalytics from "../components/assessment/AssessmentAnalytics";
import ViewMcqResults from "./ViewMcqResults";
import AssignmentEvaluation from "../components/assessment/AssignmentEvaluation";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";
import {
  loadLatestFeedback,
  loadAssessmentTable,
} from "../services/assessmentAnalyticsService";

const INTERVIEW_MODULE = "interviewquestionsanswers";

const normalise = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isInterviewRow = (item) =>
  normalise(item?.module) === INTERVIEW_MODULE;

const formatAssessmentDate = (value) => {
  if (!value) return "—";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("en-IN");
  }

  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000).toLocaleDateString("en-IN");
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("en-IN");
  }

  return String(value);
};

const scoreToPercentage = (score) => {
  if (score === null || score === undefined) return 0;

  const match = String(score).match(
    /(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/
  );

  if (!match) return Number(score) || 0;

  const obtained = Number(match[1]);
  const maximum = Number(match[2]);

  return maximum > 0
    ? Math.round((obtained / maximum) * 100)
    : 0;
};

const getEvaluationRows = (rows, type) => {
  return (rows || []).filter((row) => {
    if (isInterviewRow(row)) return false;

    if (type === "Assignment") {
      return (
        row.assignmentExists &&
        row.assignmentStatus &&
        row.assignmentStatus !== "Not Started"
      );
    }

    if (type === "Project") {
      return (
        row.projectExists &&
        row.projectStatus &&
        row.projectStatus !== "Not Started"
      );
    }

    return false;
  });
};

const PremiumEvaluationAnalytics = ({
  title,
  subtitle,
  rows,
  type,
}) => {
  /*
   * Assignment Evaluation:
   * Keep the existing behaviour.
   *
   * Project Evaluation:
   * Include ALL configured projects so that the
   * status pie chart can show:
   * - Evaluated
   * - Evaluation Awaited
   * - Not Submitted
   */

  const relevantRows =
    type === "Project"
      ? (rows || []).filter(
          (row) =>
            !isInterviewRow(row) &&
            row.projectExists === true
        )
      : getEvaluationRows(rows, type);

  const scoreKey =
    type === "Assignment"
      ? "assignmentScore"
      : "projectScore";

  const statusKey =
    type === "Assignment"
      ? "assignmentStatus"
      : "projectStatus";

  /*
   * Projects with at least one evaluated attempt should appear in
   * the score bar chart, even if a newer attempt is awaiting evaluation.
   *
   * We deliberately do NOT create a 0% bar
   * for projects that have not been submitted.
   */
  const scoredRows =
    type === "Project"
      ? relevantRows.filter(
          (row) =>
            row.projectEvaluated === true &&
            row[scoreKey] !== null &&
            row[scoreKey] !== undefined &&
            row[scoreKey] !== ""
        )
      : relevantRows;

  const barData = scoredRows.map((row) => ({
    module: row.module,
    score: scoreToPercentage(row[scoreKey]),
  }));

  /*
   * Evaluation status counts.
   */
  const complete = relevantRows.filter(
    (row) => row[statusKey] === "Complete"
  ).length;

  const awaited = relevantRows.filter(
    (row) =>
      row[statusKey] ===
      "Evaluation Awaited"
  ).length;

  const notStarted = relevantRows.filter(
    (row) =>
      !row[statusKey] ||
      row[statusKey] === "Not Started"
  ).length;

  const statusData = [
    {
      name: "Evaluated",
      value: complete,
    },
    {
      name: "Evaluation Awaited",
      value: awaited,
    },
    {
      name: "Not Submitted",
      value: notStarted,
    },
  ].filter((item) => item.value > 0);

  const COLORS =
    type === "Project"
      ? ["#10b981", "#f59e0b", "#cbd5e1"]
      : ["#2563eb", "#f59e0b", "#cbd5e1"];

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">

      {/* =====================================================
          ANALYTICS HEADER
      ===================================================== */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-100">

        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
          Performance Analytics
        </p>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">

          <div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              {title}
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              {subtitle}
            </p>

          </div>

          <div className="text-xs font-semibold text-slate-500">
            Submission-based evaluation
          </div>

        </div>

      </div>


      {/* =====================================================
          NO CONFIGURED ASSESSMENTS
      ===================================================== */}
      {relevantRows.length === 0 ? (

        <div className="p-8 text-center">

          <div className="text-3xl mb-3">
            📊
          </div>

          <p className="font-bold text-slate-800">
            No {type.toLowerCase()} configured yet.
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Analytics will appear automatically after the{" "}
            {type.toLowerCase()} is configured.
          </p>

        </div>

      ) : (

        <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">

          {/* =================================================
              SCORE BAR CHART
          ================================================= */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">

            <div className="text-sm font-bold text-slate-700 mb-3">
              {type === "Project"
                ? "Evaluated Project Score"
                : "Average Evaluated Score"}
            </div>

            {barData.length === 0 ? (

              <div className="h-[300px] flex flex-col items-center justify-center text-center">

                <div className="text-3xl mb-3">
                  📊
                </div>

                <p className="font-bold text-slate-700">
                  No evaluated {type.toLowerCase()} scores yet.
                </p>

                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Scores will appear here after a{" "}
                  {type.toLowerCase()} has been evaluated.
                </p>

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={barData}
                  margin={{
                    top: 10,
                    right: 12,
                    left: 0,
                    bottom: 55,
                  }}
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
                    height={70}
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Score",
                    ]}
                  />

                  <Legend />

                  <Bar
                    dataKey="score"
                    name={
                      type === "Project"
                        ? "Project Score"
                        : "Average Score"
                    }
                    fill="#2563eb"
                    radius={[7, 7, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>


          {/* =================================================
              STATUS PIE CHART
          ================================================= */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">

            <div className="text-sm font-bold text-slate-700 mb-3">
              {type === "Project"
                ? "Project Status"
                : "Evaluation Status"}
            </div>

            <div className="h-[250px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >

                    {statusData.map(
                      (entry, index) => (
                        <Cell
                          key={`status-${index}`}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={36}
                  />

                </PieChart>

              </ResponsiveContainer>

            </div>


            {/* =================================================
                STATUS SUMMARY CARDS
            ================================================= */}
            <div className="grid grid-cols-2 gap-3 mt-2">

              {statusData.map(
                (item, index) => (

                  <div
                    key={item.name}
                    className="rounded-xl bg-white border border-slate-100 p-3"
                  >

                    <div className="flex items-center gap-2">

                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            COLORS[
                              index %
                                COLORS.length
                            ],
                        }}
                      />

                      <span className="text-xs text-slate-500">
                        {item.name}
                      </span>

                    </div>

                    <div className="text-xl font-black text-slate-900 mt-1">
                      {item.value}
                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      )}

    </section>
  );
};

const MiniTestAnalytics = ({ data }) => {
  const filtered = (data || []).filter(
    (item) =>
      !isInterviewRow(item) &&
      Number(item?.mcq || 0) > 0
  );

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-900">
          Mini-Test Analytics
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Module-wise mini-test scores will appear here after students complete tests.
        </p>
      </div>
    );
  }

  const barData = filtered.map((item) => ({
    module: item.module,
    score: Math.round(Number(item.mcq || 0)),
  }));

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
          Performance Analytics
        </p>

        <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
          Mini-Test Analytics
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Module-wise automatically evaluated mini-test performance
        </p>
      </div>

      <div className="p-5 md:p-6">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={barData}
            margin={{ top: 10, right: 12, left: 0, bottom: 55 }}
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
              height={70}
              tick={{ fontSize: 11 }}
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              formatter={(value) => [
                `${value}%`,
                "Score",
              ]}
            />

            <Bar
              dataKey="score"
              name="Mini-Test Score"
              fill="#2563eb"
              radius={[7, 7, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

const CapstoneKpiCards = ({ rows = [] }) => {
  const capstones = rows.filter(
    (row) =>
      row?.isCapstone === true &&
      !isInterviewRow(row)
  );

  const submitted = capstones.filter(
    (row) =>
      row?.status === "Complete" ||
      row?.status === "Evaluation Awaited"
  ).length;

  const evaluated = capstones.filter(
    (row) =>
      row?.status === "Complete" &&
      row?.percentage !== null &&
      row?.percentage !== undefined &&
      Number.isFinite(Number(row?.percentage))
  );

  const evaluatedScores = evaluated.map(
    (row) => Number(row.percentage)
  );

  const evaluatedCount = evaluatedScores.length;

  const averageScore =
    evaluatedCount > 0
      ? Number(
          (
            evaluatedScores.reduce(
              (sum, score) => sum + score,
              0
            ) / evaluatedCount
          ).toFixed(1)
        )
      : null;

  const highestScore =
    evaluatedCount > 0
      ? Math.max(...evaluatedScores)
      : null;

  const cards = [
    {
      label: "CAPSTONES",
      value: capstones.length,
      footer: "Configured capstone projects",
      icon: "📁",
      iconClass: "bg-orange-50 text-orange-600",
    },
    {
      label: "SUBMITTED",
      value: submitted,
      footer: "Actual student submissions",
      icon: "📤",
      iconClass: "bg-purple-50 text-purple-600",
    },
    {
      label: "EVALUATED",
      value: evaluatedCount,
      footer: "Completed evaluations",
      icon: "✓",
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "AVERAGE SCORE",
      value:
        averageScore !== null
          ? `${averageScore}%`
          : "—",
      footer: "Evaluated capstones only",
      icon: "📊",
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "HIGHEST SCORE",
      value:
        highestScore !== null
          ? `${highestScore}%`
          : "—",
      footer: "Best evaluated capstone",
      icon: "🏆",
      iconClass: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">

      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5"
        >

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-[11px] font-extrabold tracking-wider text-slate-400">
                {card.label}
              </p>

              <p className="text-3xl font-black text-slate-900 mt-2">
                {card.value}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                {card.footer}
              </p>
            </div>

            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black ${card.iconClass}`}
            >
              {card.icon}
            </div>

          </div>

        </div>
      ))}

    </div>
  );
};
const CapstoneAnalytics = ({ rows }) => {
  const capstones = (rows || []).filter(
    (row) =>
      !isInterviewRow(row) &&
      row.isCapstone === true
  );

  /*
   * Only evaluated capstones should appear
   * in the score bar chart.
   */
  const evaluatedCapstones = capstones.filter(
    (row) =>
      row.status === "Complete" &&
      row.percentage !== null &&
      row.percentage !== undefined &&
      row.percentage !== ""
  );

  const barData = evaluatedCapstones.map((row) => ({
    title: row.title || "Capstone Project",
    score: scoreToPercentage(row.percentage),
  }));

  /*
   * Capstone evaluation status
   */
  const complete = capstones.filter(
    (row) => row.status === "Complete"
  ).length;

  const awaited = capstones.filter(
    (row) => row.status === "Evaluation Awaited"
  ).length;

  const notStarted = capstones.filter(
    (row) =>
      !row.status ||
      row.status === "Not Started"
  ).length;

  const statusData = [
    {
      name: "Evaluated",
      value: complete,
    },
    {
      name: "Evaluation Awaited",
      value: awaited,
    },
    {
      name: "Not Submitted",
      value: notStarted,
    },
  ].filter((item) => item.value > 0);

  const COLORS = [
    "#10b981",
    "#f59e0b",
    "#cbd5e1",
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">

      {/* =====================================================
          ANALYTICS HEADER
      ===================================================== */}
      <div className="px-6 py-5 bg-gradient-to-r from-orange-50 via-white to-red-50 border-b border-orange-100">

        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
          Course-Level Analytics
        </p>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">

          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              Capstone Analytics
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Performance across the three course-level capstone projects
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Submission-based evaluation
          </div>

        </div>
      </div>


      {/* =====================================================
          NO CAPSTONES
      ===================================================== */}
      {capstones.length === 0 ? (

        <div className="p-8 text-center">

          <div className="text-3xl mb-3">
            🏆
          </div>

          <p className="font-bold text-slate-800">
            No capstone projects configured yet.
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Capstone analytics will appear automatically after
            a course-level capstone is configured.
          </p>

        </div>

      ) : (

        <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">

          {/* =================================================
              CAPSTONE SCORE BAR CHART
          ================================================= */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">

            <div className="text-sm font-bold text-slate-700 mb-3">
              Evaluated Capstone Score
            </div>

            {barData.length === 0 ? (

              <div className="h-[300px] flex flex-col items-center justify-center text-center">

                <div className="text-3xl mb-3">
                  📊
                </div>

                <p className="font-bold text-slate-700">
                  No evaluated capstone scores yet.
                </p>

                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Scores will appear here after a capstone
                  project has been evaluated.
                </p>

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={barData}
                  margin={{
                    top: 10,
                    right: 12,
                    left: 0,
                    bottom: 65,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="title"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={80}
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Score",
                    ]}
                  />

                  <Legend />

                  <Bar
                    dataKey="score"
                    name="Capstone Score"
                    fill="#f97316"
                    radius={[7, 7, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>


          {/* =================================================
              CAPSTONE STATUS PIE CHART
          ================================================= */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">

            <div className="text-sm font-bold text-slate-700 mb-3">
              Capstone Status
            </div>

            <div className="h-[250px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >

                    {statusData.map(
                      (entry, index) => (
                        <Cell
                          key={`capstone-status-${index}`}
                          fill={
                            COLORS[
                              index % COLORS.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={36}
                  />

                </PieChart>

              </ResponsiveContainer>

            </div>


            {/* =================================================
                STATUS SUMMARY CARDS
            ================================================= */}
            <div className="grid grid-cols-2 gap-3 mt-2">

              {statusData.map(
                (item, index) => (

                  <div
                    key={item.name}
                    className="rounded-xl bg-white border border-orange-100 p-3"
                  >

                    <div className="flex items-center gap-2">

                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            COLORS[
                              index % COLORS.length
                            ],
                        }}
                      />

                      <span className="text-xs text-slate-500">
                        {item.name}
                      </span>

                    </div>

                    <div className="text-xl font-black text-slate-900 mt-1">
                      {item.value}
                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      )}

    </section>
  );
};

export default function Assignments() {
  const studentData = JSON.parse(
    localStorage.getItem("studentData") || "null"
  );

  const [searchParams] = useSearchParams();

  const currentView =
    searchParams.get("view") || "overview";

  const [assignments, setAssignments] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [assessmentTableData, setAssessmentTableData] = useState([]);
  const [selectedCapstone, setSelectedCapstone] =
    useState("");
  const [selectedFile, setSelectedFile] =
    useState(null);
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "assignments")
        );

        const data = snapshot.docs
          .map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
          .filter(
            (item) =>
              item.batchId === studentData?.batchId &&
              item.active !== false
          );

        setAssignments(data);
      } catch (error) {
        console.error(
          "Error loading assessments:",
          error
        );
      }
    };

    fetchAssignments();
  }, [studentData?.batchId]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!studentData?.email) return;

      try {
        const tableData =
          await loadAssessmentTable(
            studentData.email,
            studentData.batchId
          );

        const filteredTableData =
          (tableData || []).filter(
            (row) => !isInterviewRow(row)
          );

        setAssessmentTableData(filteredTableData);

        /*
          IMPORTANT: Assessment Overview charts are now derived
          directly from the same History Table rows.

          This prevents the table, KPIs and charts from calculating
          different assessment states independently.
        */
        const chartRows = filteredTableData
          .filter((row) => !row.isCapstone)
          .map((row) => ({
            ...row,
            mcq: row.mcqStatus === "Complete"
  ? scoreToPercentage(row.mcq)
  : null,
            assignment: row.assignmentStatus === "Complete"
              ? scoreToPercentage(row.assignment)
              : null,
            project: row.projectStatus === "Complete"
              ? scoreToPercentage(row.project)
              : null,
          }));

        setChartData(chartRows);

        await loadLatestFeedback(
          studentData.email,
          studentData.batchId
        );
      } catch (error) {
        console.error(
          "Assessment analytics load failed:",
          error
        );
      }
    };

    loadAnalytics();
  }, [studentData?.email, studentData?.batchId]);

  const capstoneAssignments = assignments.filter(
    (item) =>
      normalise(item.type) ===
      "capstoneproject"
  );

  const selectedCapstoneDefinition =
    capstoneAssignments.find(
      (item) => item.id === selectedCapstone
    );

  const handleCapstoneSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCapstoneDefinition) {
      alert("Please select a capstone project.");
      return;
    }

    if (!selectedFile) {
      alert("Please select your completed capstone ZIP file.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      alert("Capstone submissions must be uploaded as a .zip file.");
      return;
    }

    try {
      setSubmitting(true);

      const fileName =
        `${Date.now()}-${selectedFile.name}`;

      const { error } =
        await supabase.storage
          .from("assignments")
          .upload(fileName, selectedFile);

      if (error) {
        console.error(
          "CAPSTONE SUPABASE ERROR:",
          error
        );
        alert("Capstone upload failed.");
        return;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("assignments")
          .getPublicUrl(fileName);

      const fileUrl =
        publicUrlData.publicUrl;

      await addDoc(
        collection(db, "submissions"),
        {
          assignmentId:
            selectedCapstoneDefinition.id,

          assignmentTitle:
            selectedCapstoneDefinition.title,

          assignmentType:
            "Capstone Project",

          moduleId: null,

          batchId: studentData.batchId,

          batchName: studentData.batchName,

          fileName:
            selectedFile.name,

          fileUrl,

          studentName:
            studentData.name,

          studentEmail:
            studentData.email,

          submittedAt:
            new Date().toLocaleString(),

          status: "Submitted",

          evaluated: false,

          marks: 0,

          remarks: "",
        }
      );

      setSelectedFile(null);

      alert(
        "Capstone project submitted successfully."
      );
    } catch (error) {
      console.error(
        "CAPSTONE SUBMISSION ERROR:",
        error
      );

      alert(
        "Capstone submission failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const evaluationRows =
    assessmentTableData;
      const projectRows = (evaluationRows || []).filter(
    (row) =>
      !isInterviewRow(row) &&
      row.projectExists === true
  );

  const submittedProjectRows = projectRows.filter(
    (row) =>
      row.projectStatus !== "Not Started"
  );

  const evaluatedProjectRows = projectRows.filter(
    (row) =>
      row.projectEvaluated === true &&
      row.projectScore
  );

  const awaitingProjectRows = projectRows.filter(
    (row) =>
      row.projectStatus ===
      "Evaluation Awaited"
  );

  const projectScores = evaluatedProjectRows
    .map((row) => scoreToPercentage(row.projectScore))
    .filter((score) => Number.isFinite(score));

  const averageProjectScore =
    projectScores.length > 0
      ? Math.round(
          projectScores.reduce(
            (sum, score) => sum + score,
            0
          ) / projectScores.length
        )
      : null;

  const highestProjectScore =
    projectScores.length > 0
      ? Math.max(...projectScores)
      : null;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar student={studentData} />

      <main className="flex-1 min-w-0 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-blue-800 text-white p-8">
              <h1 className="text-4xl font-bold">
                {currentView === "overview" &&
                  "Assessment Overview"}

                {currentView === "submit-assignment" &&
                  "Submit Capstone"}

                {currentView === "assignment-evaluation" &&
                  "Assignment Evaluation"}

                {currentView === "project-evaluation" &&
                  "Project Evaluation"}

                {currentView === "mcq-evaluation" &&
                  "Mini-Test Evaluation"}

                {currentView === "capstone-evaluation" &&
                  "Capstone Evaluation"}
              </h1>

              <p className="mt-2 text-blue-100">
                {currentView === "overview" &&
                  "View your overall assessment performance"}

                {currentView === "submit-assignment" &&
                  "Download the course capstone and submit your completed project"}

                {currentView === "assignment-evaluation" &&
                  "View your assignment evaluation results"}

                {currentView === "project-evaluation" &&
                  "View your project evaluation results"}

                {currentView === "mcq-evaluation" &&
                  "View your mini-test and MCQ results"}

                {currentView === "capstone-evaluation" &&
                  "View your final course-level capstone evaluation"}
              </p>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {currentView === "overview" && (
                <>
                  <AssessmentSummaryCards data={assessmentTableData} />

                  <AssessmentAnalytics
                    data={chartData}
                  />

                  <AssessmentHistoryTable
                    data={assessmentTableData}
                  />
                  <div className="mt-10">
  <CapstoneHistoryTable
    data={assessmentTableData}
  />
</div>
                </>
              )}

              {currentView === "submit-assignment" && (
                <section className="space-y-8">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-3xl p-8 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                        🏆
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] font-black text-orange-100">
                          Course-Level Assessment
                        </p>

                        <h2 className="text-3xl font-black mt-1">
                          Submit Capstone
                        </h2>

                        <p className="text-orange-50 mt-2 max-w-3xl">
                          Download the capstone project provided by your institute,
                          complete your work, and submit the final project as one ZIP file.
                        </p>
                      </div>
                    </div>
                  </div>

                  {capstoneAssignments.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center">
                      <div className="text-4xl mb-3">🏆</div>
                      <h3 className="text-xl font-bold text-slate-800">
                        No capstone project is available yet.
                      </h3>
                      <p className="text-slate-500 mt-2">
                        Your administrator will publish the course capstone here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {capstoneAssignments.map(
                          (capstone, index) => (
                            <div
                              key={capstone.id}
                              className="bg-white border border-orange-100 rounded-3xl shadow-lg p-6 hover:-translate-y-1 transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                                  {index + 1}
                                </span>

                                <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
                                  Capstone
                                </span>
                              </div>

                              <h3 className="text-xl font-black text-slate-900 mt-5">
                                {capstone.title}
                              </h3>

                              <p className="text-sm text-slate-500 mt-2 min-h-[48px]">
                                {capstone.description ||
                                  "Course-level capstone project"}
                              </p>

                              <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-[10px] font-bold uppercase text-slate-400">
                                    Due Date
                                  </p>
                                  <p className="text-sm font-bold text-slate-800 mt-1">
                                    {formatAssessmentDate(
                                      capstone.dueDate
                                    )}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-[10px] font-bold uppercase text-slate-400">
                                    Maximum
                                  </p>
                                  <p className="text-sm font-bold text-slate-800 mt-1">
                                    {capstone.maximumMarks || 50} marks
                                  </p>
                                </div>
                              </div>

                              {capstone.assignmentFileUrl ? (
                                <a
                                  href={
                                    capstone.assignmentFileUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl transition"
                                >
                                  ⬇ Download Capstone ZIP
                                </a>
                              ) : capstone.fileUrl ? (
                                <a
                                  href={capstone.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl transition"
                                >
                                  ⬇ Download Capstone
                                </a>
                              ) : (
                                <div className="mt-5 w-full text-center bg-slate-100 text-slate-500 font-semibold px-5 py-3 rounded-xl">
                                  Download file not uploaded yet
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>

                      <form
                        onSubmit={handleCapstoneSubmit}
                        className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden"
                      >
                        <div className="bg-slate-900 text-white px-8 py-6">
                          <h3 className="text-2xl font-black">
                            Submit Your Completed Capstone
                          </h3>
                          <p className="text-slate-300 mt-1">
                            Select the capstone and upload the complete project as a ZIP file.
                          </p>
                        </div>

                        <div className="p-8 space-y-6">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Select Capstone Project
                            </label>

                            <select
                              value={selectedCapstone}
                              onChange={(event) =>
                                setSelectedCapstone(
                                  event.target.value
                                )
                              }
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white"
                            >
                              <option value="">
                                Choose Capstone Project
                              </option>

                              {capstoneAssignments.map(
                                (capstone) => (
                                  <option
                                    key={capstone.id}
                                    value={capstone.id}
                                  >
                                    {capstone.title}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Upload Completed Capstone ZIP
                            </label>

                            <input
                              type="file"
                              accept=".zip"
                              onChange={(event) =>
                                setSelectedFile(
                                  event.target.files?.[0] ||
                                    null
                                )
                              }
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white"
                            />

                            <p className="text-xs text-slate-500 mt-2">
                              Only .zip files are accepted for capstone submission.
                            </p>
                          </div>

                          {selectedFile && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                              <p className="text-xs font-bold uppercase text-emerald-600">
                                File Selected
                              </p>

                              <p className="font-bold text-slate-800 mt-1">
                                {selectedFile.name}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={submitting}
                              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-60 text-white font-black px-8 py-4 rounded-xl shadow-lg transition"
                            >
                              {submitting
                                ? "Submitting..."
                                : "Submit Capstone →"}
                            </button>
                          </div>
                        </div>
                      </form>
                    </>
                  )}
                </section>
              )}

              {currentView === "assignment-evaluation" && (
  <AssignmentEvaluation student={studentData} />
)}

              {currentView === "project-evaluation" && (
  <div className="space-y-6">

    {/* =====================================================
        HEADER
    ===================================================== */}
    <div>
      <h2 className="text-2xl font-bold text-gray-800">
        Project Evaluation
      </h2>

      <p className="text-gray-500 mt-1">
        Review module-wise project submissions, marks and evaluation status.
      </p>
    </div>


    {/* =====================================================
        KPI CARDS
    ===================================================== */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">

      {/* PROJECTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Projects
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {projectRows.length}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Configured for your modules
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
            📁
          </div>
        </div>
      </div>


      {/* SUBMITTED */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Submitted
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {submittedProjectRows.length}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Projects submitted
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-xl">
            📤
          </div>
        </div>
      </div>


      {/* EVALUATED */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Evaluated
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {evaluatedProjectRows.length}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Completed evaluations
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">
            ✓
          </div>
        </div>
      </div>


      {/* AVERAGE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Average Score
            </p>

            <h3 className="text-3xl font-black text-blue-700 mt-2">
              {averageProjectScore !== null
                ? `${averageProjectScore}%`
                : "—"}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Evaluated projects
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
            📊
          </div>
        </div>
      </div>


      {/* HIGHEST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Highest Score
            </p>

            <h3 className="text-3xl font-black text-emerald-700 mt-2">
              {highestProjectScore !== null
                ? `${highestProjectScore}%`
                : "—"}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Best evaluated project
            </p>
          </div>

          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">
            🏆
          </div>
        </div>
      </div>

    </div>


    {/* =====================================================
        PROJECT ANALYTICS
    ===================================================== */}
    <PremiumEvaluationAnalytics
      title="Project Performance Analytics"
      subtitle="Module-wise project performance based on student submissions and evaluations"
      rows={evaluationRows}
      type="Project"
    />


    {/* =====================================================
        PROJECT STATUS SUMMARY
    ===================================================== */}
    <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">

      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-purple-50 border-b border-slate-100">

        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600">
          Evaluation Overview
        </p>

        <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
          Project Evaluation Status
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Current status of configured project assessments.
        </p>

      </div>


      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-600">
            Not Submitted
          </p>

          <p className="text-3xl font-black text-slate-900 mt-2">
            {Math.max(
              projectRows.length -
              submittedProjectRows.length,
              0
            )}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Awaiting student submission
          </p>
        </div>


        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
          <p className="text-sm font-bold text-amber-700">
            Evaluation Awaited
          </p>

          <p className="text-3xl font-black text-amber-800 mt-2">
            {awaitingProjectRows.length}
          </p>

          <p className="text-xs text-amber-700 mt-1">
            Submitted but not yet evaluated
          </p>
        </div>


        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
          <p className="text-sm font-bold text-emerald-700">
            Evaluated
          </p>

          <p className="text-3xl font-black text-emerald-800 mt-2">
            {evaluatedProjectRows.length}
          </p>

          <p className="text-xs text-emerald-700 mt-1">
            Evaluation completed
          </p>
        </div>

      </div>
    </div>


    {/* =====================================================
        MODULE-WISE PROJECT RESULTS
    ===================================================== */}
    <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">

      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-purple-50 border-b border-slate-100">

        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600">
          Module Assessment
        </p>

        <h3 className="text-xl font-black text-slate-900 mt-1">
          Module-wise Project Evaluation
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Project assessment status across your course modules.
        </p>

      </div>


      <div className="overflow-x-auto">

        <table className="w-full min-w-[900px]">

          <thead className="bg-slate-900 text-white">

            <tr>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                #
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Module
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Project
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Due Date
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Submission Date
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Evaluation Date
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Marks
              </th>

              <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                Status
              </th>

            </tr>

          </thead>


          <tbody>

            {projectRows.length === 0 ? (

              <tr>

                <td
                  colSpan="8"
                  className="px-6 py-14 text-center"
                >

                  <div className="text-4xl mb-3">
                    📁
                  </div>

                  <p className="text-lg font-bold text-slate-800">
                    No projects configured yet
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Project evaluation will appear here once a project is created for a module.
                  </p>

                </td>

              </tr>

            ) : (

              projectRows.map((item, index) => (

                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-purple-50/40 transition"
                >

                  <td className="px-5 py-5 text-slate-500 font-semibold">
                    {index + 1}
                  </td>


                  <td className="px-5 py-5">

                    <div className="font-bold text-slate-900">
                      {item.module}
                    </div>

                  </td>


                  <td className="px-5 py-5">

                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 text-sm font-bold">
                      Project
                    </span>

                  </td>


                  <td className="px-5 py-5 text-slate-600">
                    {item.projectDueDate || "—"}
                  </td>

                  <td className="px-5 py-5 text-slate-600">
                    {item.projectUploadDate
                      ? formatAssessmentDate(
                          item.projectUploadDate
                        )
                      : "—"}
                  </td>

                  <td className="px-5 py-5 text-slate-600">
                    {item.projectEvaluationDate || "—"}
                  </td>

                  <td className="px-5 py-5">

                    <span className="font-black text-blue-700">

                      {item.projectScore || "—"}

                    </span>

                  </td>


                  <td className="px-5 py-5">

                    {item.projectStatus === "Complete" ? (

                      <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ Evaluated
                      </span>

                    ) : item.projectStatus ===
                      "Evaluation Awaited" ? (

                      <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        ⏳ Evaluation Awaited
                      </span>

                    ) : (

                      <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Not Submitted
                      </span>

                    )}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>


      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">

          <span>
            <strong className="text-slate-700">
              Evaluated:
            </strong>{" "}
            Project submitted and evaluated.
          </span>

          <span>
            <strong className="text-slate-700">
              Evaluation Awaited:
            </strong>{" "}
            Project submitted but evaluation is pending.
          </span>

          <span>
            <strong className="text-slate-700">
              Not Submitted:
            </strong>{" "}
            Project exists but no submission has been recorded.
          </span>

        </div>

      </div>

    </div>

  </div>
)}

              {currentView === "mcq-evaluation" && (
  <ViewMcqResults student={studentData} />
)}

              {currentView === "capstone-evaluation" && (
  <div className="space-y-6">

    <div>
      <h2 className="text-2xl font-bold text-gray-800">
        Capstone Evaluation
      </h2>

      <p className="text-gray-500 mt-1">
        Review your course-level capstone projects.
      </p>
    </div>

    <CapstoneKpiCards
      rows={assessmentTableData}
    />

    <CapstoneAnalytics
      rows={assessmentTableData}
    />

    <CapstoneHistoryTable
      data={assessmentTableData}
    />

  </div>
)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
