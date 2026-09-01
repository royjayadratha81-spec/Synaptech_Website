import AssessmentSummaryCards from "../components/assessment/AssessmentSummaryCards";
import AssessmentHistoryTable from "../components/assessment/AssessmentHistoryTable";
import AssessmentAnalytics from "../components/assessment/AssessmentAnalytics";
import CapstoneHistoryTable from "../components/assessment/CapstoneHistoryTable";
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
  loadAssignmentAnalytics,
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
  const relevantRows = getEvaluationRows(rows, type);

  const scoreKey =
    type === "Assignment"
      ? "assignmentScore"
      : "projectScore";

  const statusKey =
    type === "Assignment"
      ? "assignmentStatus"
      : "projectStatus";

  const barData = relevantRows.map((row) => ({
    module: row.module,
    score: scoreToPercentage(row[scoreKey]),
  }));

  const complete = relevantRows.filter(
    (row) => row[statusKey] === "Complete"
  ).length;

  const awaited = relevantRows.filter(
    (row) => row[statusKey] === "Submitted — Evaluation Awaited"
  ).length;

  const notStarted = relevantRows.filter(
    (row) => row[statusKey] === "Not Started"
  ).length;

  const statusData = [
    { name: "Complete", value: complete },
    { name: "Evaluation Awaited", value: awaited },
    { name: "Not Started", value: notStarted },
  ].filter((item) => item.value > 0);

  const COLORS = ["#2563eb", "#f59e0b", "#cbd5e1"];

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
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

      {relevantRows.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="font-bold text-slate-800">
            No {type.toLowerCase()} submissions yet.
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Analytics will appear automatically after a student submits the {type.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Average Evaluated Score
            </div>

            <ResponsiveContainer width="100%" height={300}>
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

                <Legend />

                <Bar
                  dataKey="score"
                  name="Average Score"
                  fill="#2563eb"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Evaluation Status
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
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
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`status-${index}`}
                        fill={COLORS[index % COLORS.length]}
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

            <div className="grid grid-cols-2 gap-3 mt-2">
              {statusData.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-xl bg-white border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS[index % COLORS.length],
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
              ))}
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
    score: Math.round(
      (Number(item.mcq || 0) / 10) * 100
    ),
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

const CapstoneAnalytics = ({ rows }) => {
  const capstones = (rows || []).filter(
    (row) => row.isCapstone
  );

  const barData = capstones.map((row) => ({
    title: row.title,
    score: row.percentage || 0,
    status: row.status || "Not Started",
  }));

  const complete = capstones.filter(
    (row) => row.status === "Complete"
  ).length;

  const awaited = capstones.filter(
    (row) => row.status === "Evaluation Awaited"
  ).length;

  const notStarted = capstones.filter(
    (row) => row.status === "Not Started"
  ).length;

  const statusData = [
    { name: "Complete", value: complete },
    { name: "Evaluation Awaited", value: awaited },
    { name: "Not Started", value: notStarted },
  ].filter((item) => item.value > 0);

  const COLORS = ["#f97316", "#f59e0b", "#cbd5e1"];

  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-orange-50 via-white to-red-50 border-b border-orange-100">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
          Course-Level Analytics
        </p>

        <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
          Capstone Analytics
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Performance across the three course-level capstone projects
        </p>
      </div>

      {capstones.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          No capstone projects have been configured yet.
        </div>
      ) : (
        <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Capstone Score
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                margin={{ top: 10, right: 12, left: 0, bottom: 65 }}
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
                  name="Capstone Score"
                  fill="#f97316"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Capstone Status
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
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
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`capstone-status-${index}`}
                        fill={COLORS[index % COLORS.length]}
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

            <div className="grid grid-cols-2 gap-3 mt-2">
              {statusData.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-xl bg-white border border-orange-100 p-3"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        COLORS[index % COLORS.length],
                    }}
                  />

                  <span className="text-xs text-slate-500">
                    {item.name}
                  </span>

                  <div className="text-xl font-black text-slate-900 mt-1">
                    {item.value}
                  </div>
                </div>
              ))}
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
        const analytics =
          await loadAssignmentAnalytics(
            studentData.email,
            studentData.batchId
          );

        setChartData(analytics || []);

        const tableData =
          await loadAssessmentTable(
            studentData.email,
            studentData.batchId
          );

        setAssessmentTableData(
          (tableData || []).filter(
            (row) => !isInterviewRow(row)
          )
        );

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

            <div className="p-10">
              {currentView === "overview" && (
                <>
                  <AssessmentSummaryCards />

                  <AssessmentAnalytics
                    data={chartData}
                  />

                  <AssessmentHistoryTable
                    data={assessmentTableData}
                  />
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Assignment Evaluation Results
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Review your assignment marks and evaluation status.
                    </p>
                  </div>

                  <PremiumEvaluationAnalytics
                    title="Assignment Analytics"
                    subtitle="Module-wise assignment performance"
                    rows={evaluationRows}
                    type="Assignment"
                  />

                  <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100">
                      <h3 className="text-xl font-black text-slate-900">
                        Assignment Evaluation Results
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-blue-800 text-white">
                          <tr>
                            <th className="px-6 py-4 text-left">
                              Module
                            </th>
                            <th className="px-6 py-4 text-left">
                              Assignment
                            </th>
                            <th className="px-6 py-4 text-left">
                              Submission Date
                            </th>
                            <th className="px-6 py-4 text-left">
                              Marks
                            </th>
                            <th className="px-6 py-4 text-left">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {getEvaluationRows(
                            evaluationRows,
                            "Assignment"
                          ).length === 0 ? (
                            <tr>
                              <td
                                colSpan="5"
                                className="px-6 py-12 text-center text-slate-500"
                              >
                                No assignment has been submitted yet.
                              </td>
                            </tr>
                          ) : (
                            getEvaluationRows(
                              evaluationRows,
                              "Assignment"
                            ).map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-slate-100 hover:bg-blue-50/40"
                              >
                                <td className="px-6 py-4 font-semibold">
                                  {item.module}
                                </td>

                                <td className="px-6 py-4 font-semibold">
                                  Assignment
                                </td>

                                <td className="px-6 py-4 text-slate-600">
                                  {formatAssessmentDate(
                                    item.assignmentUploadDate
                                  )}
                                </td>

                                <td className="px-6 py-4 font-black text-blue-700">
                                  {item.assignmentScore || "—"}
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${
                                      item.assignmentStatus === "Complete"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                    }`}
                                  >
                                    {item.assignmentStatus ===
                                    "Complete"
                                      ? "Complete"
                                      : "Evaluation Awaited"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentView === "project-evaluation" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Project Evaluation Results
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Review your project marks and evaluation status.
                    </p>
                  </div>

                  <PremiumEvaluationAnalytics
                    title="Project Analytics"
                    subtitle="Module-wise project performance"
                    rows={evaluationRows}
                    type="Project"
                  />

                  <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-purple-50 border-b border-slate-100">
                      <h3 className="text-xl font-black text-slate-900">
                        Project Evaluation Results
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-blue-800 text-white">
                          <tr>
                            <th className="px-6 py-4 text-left">
                              Module
                            </th>
                            <th className="px-6 py-4 text-left">
                              Project
                            </th>
                            <th className="px-6 py-4 text-left">
                              Submission Date
                            </th>
                            <th className="px-6 py-4 text-left">
                              Marks
                            </th>
                            <th className="px-6 py-4 text-left">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {getEvaluationRows(
                            evaluationRows,
                            "Project"
                          ).length === 0 ? (
                            <tr>
                              <td
                                colSpan="5"
                                className="px-6 py-12 text-center text-slate-500"
                              >
                                No project has been submitted yet.
                              </td>
                            </tr>
                          ) : (
                            getEvaluationRows(
                              evaluationRows,
                              "Project"
                            ).map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-slate-100 hover:bg-blue-50/40"
                              >
                                <td className="px-6 py-4 font-semibold">
                                  {item.module}
                                </td>

                                <td className="px-6 py-4 font-semibold">
                                  Project
                                </td>

                                <td className="px-6 py-4 text-slate-600">
                                  {formatAssessmentDate(
                                    item.projectUploadDate
                                  )}
                                </td>

                                <td className="px-6 py-4 font-black text-blue-700">
                                  {item.projectScore || "—"}
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${
                                      item.projectStatus === "Complete"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                    }`}
                                  >
                                    {item.projectStatus ===
                                    "Complete"
                                      ? "Complete"
                                      : "Evaluation Awaited"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentView === "mcq-evaluation" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Mini-Test Evaluation
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Review your module-wise mini-test and MCQ performance.
                    </p>
                  </div>

                  <MiniTestAnalytics data={chartData} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(chartData || [])
                      .filter(
                        (item) =>
                          !isInterviewRow(item) &&
                          Number(item.mcq || 0) > 0
                      )
                      .map((item, index) => (
                        <div
                          key={index}
                          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-slate-500">
                                Module
                              </p>

                              <h3 className="text-xl font-bold text-slate-800 mt-1">
                                {item.module}
                              </h3>
                            </div>

                            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold">
                              {item.mcq}/10
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {currentView === "capstone-evaluation" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Capstone Evaluation
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Review your three course-level capstone projects.
                    </p>
                  </div>

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
