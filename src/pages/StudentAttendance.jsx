import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { db, auth } from "../firebase/firebaseConfig";
import {
  getResolvedAttendanceRecord,
  getStudentAttendanceStats,
  getStudentModuleAttendance,
} from "../utils/attendanceUtils";

const MODULES = [
  "PYTHON",
  "NUMPY",
  "PANDAS",
  "DATA_VISUALIZATION",
  "EDA",
  "TABLEAU",
  "POWER_BI",
  "SQL",
  "EXCEL",
  "R",
  "STATISTICS_MATHEMATICS",
  "MACHINE_LEARNING",
  "DEEP_LEARNING",
  "GENERATIVE_AI",
  "AGENTIC_AI",
  "MLOPS",
];

const MODULE_LABELS = {
  PYTHON: "Python",
  NUMPY: "NumPy",
  PANDAS: "Pandas",
  DATA_VISUALIZATION: "Data Visualization",
  EDA: "EDA",
  TABLEAU: "Tableau",
  POWER_BI: "Power BI",
  SQL: "SQL",
  EXCEL: "Excel",
  R: "R",
  STATISTICS_MATHEMATICS: "Statistics & Mathematics",
  MACHINE_LEARNING: "Machine Learning",
  DEEP_LEARNING: "Deep Learning",
  GENERATIVE_AI: "Generative AI",
  AGENTIC_AI: "Agentic AI",
  MLOPS: "MLOps",
};

export default function StudentAttendance() {
  const [student, setStudent] = useState(null);
const [attendance, setAttendance] = useState([]);
const [liveSessions, setLiveSessions] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        /*
         * Resolve the student from the existing students collection.
         * UID is preferred because Firebase Authentication is the
         * primary identity. Email is used as a fallback.
         */

        let studentData = null;

        const studentByUid = await getDocs(
          query(collection(db, "students"), where("uid", "==", user.uid))
        );

        if (!studentByUid.empty) {
          studentData = {
            id: studentByUid.docs[0].id,
            ...studentByUid.docs[0].data(),
          };
        }

        if (!studentData && user.email) {
          const studentByEmail = await getDocs(
            query(
              collection(db, "students"),
              where("email", "==", user.email)
            )
          );

          if (!studentByEmail.empty) {
            studentData = {
              id: studentByEmail.docs[0].id,
              ...studentByEmail.docs[0].data(),
            };
          }
        }

        if (!studentData) {
          setError("Your student profile could not be found.");
          setLoading(false);
          return;
        }

        setStudent(studentData);
        const liveSessionsSnapshot = await getDocs(
  query(
    collection(db, "liveSessions"),
    where("batchId", "==", studentData.batchId)
  )
);
console.log("=== ATTENDANCE DEBUG ===");
console.log("Student:", studentData.name);
console.log("Student Email:", studentData.email);
console.log("Student Batch ID:", studentData.batchId);
console.log(
  "Matched liveSessions:",
  liveSessionsSnapshot.docs.map((doc) => ({
    id: doc.id,
    batchId: doc.data().batchId,
    status: doc.data().status,
    active: doc.data().active,
    moduleId: doc.data().moduleId,
    sessionTitle: doc.data().sessionTitle,
  }))
);
console.log("Matched session count:", liveSessionsSnapshot.size);
console.log(
  "COMPLETED SESSION IDS:",
  liveSessionsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      status: doc.data().status,
      title: doc.data().title || doc.data().sessionTitle,
      moduleId: doc.data().moduleId,
    }))
);

const sessionRecords = liveSessionsSnapshot.docs
  .map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
  .filter(
    (session) =>
      session.status === "ended" ||
      session.active === false
  );

setLiveSessions(sessionRecords);

        /*
         * IMPORTANT:
         * We use the existing attendance collection.
         * No new attendance collection is being created.
         */
        console.log(">>> ABOUT TO QUERY ATTENDANCE <<<");
console.log("Attendance query email:", studentData.email || user.email);

        const attendanceSnapshot = await getDocs(
          query(
            collection(db, "attendance"),
            where("studentEmail", "==", studentData.email || user.email)
          )
        );
        console.log(">>> ATTENDANCE QUERY COMPLETED <<<");
console.log("Attendance documents found:", attendanceSnapshot.size);

        const records = attendanceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("=== ATTENDANCE RECORDS RETRIEVED ===");
console.table(
  records.map((record) => ({
    id: record.id,
    studentEmail: record.studentEmail,
    batchId: record.batchId,
    sessionId: record.sessionId,
    sessionTitle: record.sessionTitle,
    moduleId: record.moduleId,
    status: record.status,
    source: record.source,
    manualOverride: record.manualOverride,
  }))
);

console.log("AUTH EMAIL:", user.email);
console.log("STUDENT EMAIL:", studentData.email);

        setAttendance(records);
      } catch (err) {
        console.error("Student attendance load error:", err);
        setError("Unable to load your attendance details.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /*
   * ---------------------------------------------------------
   * ATTENDANCE CALCULATION
   * ---------------------------------------------------------
   *
   * The completed live sessions are the denominator.
   * Attendance documents only tell us whether the student was
   * present for each of those sessions. A missing attendance
   * document therefore means ABSENT for reporting purposes.
   *
   * All KPI, module, chart and history calculations use the same
   * attendance resolver from attendanceUtils.js.
   */
  const completedSessions = useMemo(() => {
    return [...liveSessions]
      .filter((session) => session.status === "ended")
      .sort((a, b) => {
        const dateA = `${a.date || ""} ${a.time || ""}`;
        const dateB = `${b.date || ""} ${b.time || ""}`;
        return dateA.localeCompare(dateB);
      });
  }, [liveSessions]);

  const getAttendanceRecordForSession = (sessionId) =>
    getResolvedAttendanceRecord(
      attendance,
      sessionId,
      student?.email
    );

  const attendanceStats = useMemo(
    () =>
      getStudentAttendanceStats({
        sessions: completedSessions,
        attendanceRecords: attendance,
        studentEmail: student?.email,
      }),
    [completedSessions, attendance, student?.email]
  );

  const totalSessions = attendanceStats.total;
  const presentSessions = attendanceStats.present;
  const absentSessions = attendanceStats.absent;
  const attendancePercentage = attendanceStats.percentage;

  const status =
    attendancePercentage >= 70
      ? "Eligible"
      : "Below 70%";

  const moduleData = useMemo(() => {
    return MODULES.map((moduleId) => {
      const stats = getStudentModuleAttendance({
        sessions: completedSessions,
        attendanceRecords: attendance,
        studentEmail: student?.email,
        moduleId,
      });

      return {
        moduleId,
        module: MODULE_LABELS[moduleId] || moduleId,
        sessions: stats.total,
        present: stats.present,
        absent: stats.absent,
        percentage: stats.percentage,
      };
    });
  }, [completedSessions, attendance, student?.email]);

  const pieData = [
    {
      name: "Present",
      value: presentSessions,
    },
    {
      name: "Absent",
      value: absentSessions,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-6 text-center">
          <div className="text-xl font-bold text-blue-700">
            Loading Attendance
          </div>
          <p className="text-slate-500 mt-2">
            Fetching your attendance records...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-600 text-xl font-bold">
            Attendance Unavailable
          </div>

          <p className="text-slate-600 mt-3">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-800 to-indigo-700 text-white p-8 shadow-xl">
          <div className="text-xs tracking-[0.25em] font-bold opacity-80">
            SYNAPTECH LMS
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mt-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">
                My Attendance
              </h1>

              <p className="mt-2 text-blue-100">
                Your live-session attendance and module-wise learning record
              </p>

              {student?.batchId && (
                <div className="mt-4 inline-flex px-4 py-2 rounded-xl bg-white/15">
                  Batch:{" "}
                  <span className="font-bold ml-1">
                    {student.batchId}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white/15 rounded-2xl px-6 py-5 min-w-[190px]">
              <div className="text-sm text-blue-100">
                Certificate Requirement
              </div>

              <div className="text-2xl font-extrabold mt-1">
                70% Attendance
              </div>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-7">

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <div className="text-sm text-slate-500">
              Total Live Sessions
            </div>
            <div className="text-3xl font-extrabold text-blue-700 mt-2">
              {totalSessions}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <div className="text-sm text-slate-500">
              Sessions Attended
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              {presentSessions}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <div className="text-sm text-slate-500">
              Sessions Missed
            </div>
            <div className="text-3xl font-extrabold text-red-500 mt-2">
              {absentSessions}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <div className="text-sm text-slate-500">
              Attendance
            </div>

            <div className="flex items-end justify-between mt-2">
              <div className="text-3xl font-extrabold text-indigo-700">
                {attendancePercentage}%
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  attendancePercentage >= 70
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-7">

          {/* MODULE GRAPH */}
          <div className="bg-white rounded-3xl shadow-md p-6 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Module-wise Attendance
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Your attendance across the 16 academic modules
            </p>

            <div className="h-[380px] mt-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="module"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={90}
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <Tooltip
                    formatter={(value) => [`${value}%`, "Attendance"]}
                  />

                  <Bar
                    dataKey="percentage"
                    fill="#315BEF"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE */}
          <div className="bg-white rounded-3xl shadow-md p-6 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Attendance Distribution
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Present versus absent live-session records
            </p>

            <div className="h-[380px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={125}
                    paddingAngle={2}
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center -mt-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {attendancePercentage}%
              </div>
              <div className="text-sm text-slate-500">
                Overall Attendance
              </div>
            </div>
          </div>
        </div>

        {/* MODULE TABLE */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 mt-7 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Module-wise Attendance Details
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Detailed attendance for your enrolled modules
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left px-6 py-4">Module</th>
                  <th className="text-center px-6 py-4">Sessions</th>
                  <th className="text-center px-6 py-4">Present</th>
                  <th className="text-center px-6 py-4">Absent</th>
                  <th className="text-center px-6 py-4">
                    Attendance
                  </th>
                </tr>
              </thead>

              <tbody>
                {moduleData.map((module) => (
                  <tr
                    key={module.moduleId}
                    className="border-b border-slate-100"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {module.module}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {module.sessions}
                    </td>

                    <td className="px-6 py-4 text-center text-emerald-600 font-semibold">
                      {module.present}
                    </td>

                    <td className="px-6 py-4 text-center text-red-500 font-semibold">
                      {module.absent}
                    </td>

                    <td className="px-6 py-4 text-center font-bold">
                      {module.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SESSION HISTORY */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 mt-7 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-900">
              My Live Session History
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Dates and attendance status of your live sessions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left px-6 py-4">Date</th>
                  <th className="text-left px-6 py-4">Module</th>
                  <th className="text-left px-6 py-4">Session</th>
                  <th className="text-center px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {[...completedSessions]
                  .sort((a, b) => {
                    const dateA = `${a.date || ""} ${a.time || ""}`;
                    const dateB = `${b.date || ""} ${b.time || ""}`;

                    return dateB.localeCompare(dateA);
                  })
                  .map((session) => {
                    const record =
                      getAttendanceRecordForSession(session.id);

                    const isPresent =
                      String(
                        record?.status || ""
                      ).toLowerCase() === "present";

                    return (
                      <tr
                        key={session.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-6 py-4">
                          {session.date ||
                            record?.sessionDate ||
                            "—"}
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {MODULE_LABELS[
                            String(
                              session.moduleId || ""
                            ).toUpperCase()
                          ] ||
                            session.moduleId ||
                            "—"}
                        </td>

                        <td className="px-6 py-4">
                          {session.title ||
                            session.sessionTitle ||
                            record?.sessionTitle ||
                            "Live Session"}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isPresent
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isPresent
                              ? "Present"
                              : "Absent"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}