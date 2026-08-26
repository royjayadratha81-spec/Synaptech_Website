import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  getResolvedAttendanceRecord,
  getStudentAttendanceStats,
  getStudentModuleAttendance as getStudentModuleAttendanceStats,
  getBatchModuleAttendance,
  normalizeEmail,
} from "../utils/attendanceUtils";

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [manualSessionId, setManualSessionId] = useState("");
  const [manualStudentEmail, setManualStudentEmail] = useState("");
  const [manualStatus, setManualStatus] = useState("present");
  const [manualReason, setManualReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingManual, setSavingManual] = useState(false);
  // Offline Class Attendance
const [offlineModuleId, setOfflineModuleId] = useState("");
const [offlineTitle, setOfflineTitle] = useState("");
const [offlineDate, setOfflineDate] = useState("");
const [offlineTime, setOfflineTime] = useState("");
const [offlineReason, setOfflineReason] = useState("");
const [offlineAttendance, setOfflineAttendance] = useState({});
const [savingOffline, setSavingOffline] = useState(false);
const [offlineSessionCreated, setOfflineSessionCreated] = useState(false);
const [offlineSessionId, setOfflineSessionId] = useState("");

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      const [
        studentsSnapshot,
        batchesSnapshot,
        modulesSnapshot,
        sessionsSnapshot,
        attendanceSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "batches")),
        getDocs(collection(db, "modules")),
        getDocs(collection(db, "liveSessions")),
        getDocs(collection(db, "attendance")),
      ]);

      const studentList = studentsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const batchList = batchesSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const moduleList = modulesSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort(
          (a, b) =>
            (a.moduleOrder || 0) - (b.moduleOrder || 0)
        );

      const sessionList = sessionsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const attendanceList = attendanceSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      /*
 * Attendance population is based on students assigned
 * to a batch, not on admission approval status.
 *
 * ManageLiveSessions finalizes attendance for every
 * student belonging to the session batch.
 *
 * Therefore Attendance.jsx must use the same population.
 */
const batchAssignedStudents = studentList.filter(
  (student) => student.batchId
);

setStudents(batchAssignedStudents);
setBatches(batchList);
setModules(moduleList);
setSessions(sessionList);
setAttendanceRecords(attendanceList);

      if (!selectedBatch && batchList.length > 0) {
        setSelectedBatch(batchList[0].id);
      }
    } catch (error) {
      console.error("Attendance load error:", error);
      alert("Unable to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  const batchStudents = useMemo(() => {
    if (!selectedBatch) return [];

    return students.filter(
      (student) => student.batchId === selectedBatch
    );
  }, [students, selectedBatch]);

  const batchSessions = useMemo(() => {
  if (!selectedBatch) return [];

  /*
   * ONLY COMPLETED SESSIONS COUNT TOWARDS ATTENDANCE.
   *
   * ManageLiveSessions changes:
   *
   * live → ended
   *
   * and:
   *
   * active → false
   *
   * when a session is explicitly ended.
   *
   * Therefore `status === "ended"` is the source
   * of truth for attendance.
   *
   * Scheduled and live sessions must NOT yet
   * increase the attendance denominator.
   */

  return sessions
    .filter(
      (session) =>
        session.batchId === selectedBatch &&
        session.status === "ended"
    )
    .sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;

      return dateA.localeCompare(dateB);
    });
}, [sessions, selectedBatch]);

  const batchAttendance = useMemo(() => {
    if (!selectedBatch) return [];

    return attendanceRecords.filter(
      (record) => record.batchId === selectedBatch
    );
  }, [attendanceRecords, selectedBatch]);

  const getStudentAttendance = (studentEmail) =>
    getStudentAttendanceStats({
      sessions: batchSessions,
      attendanceRecords: batchAttendance,
      studentEmail,
    });

  const totalSessions = batchSessions.length;

  const totalPossibleAttendance =
    batchStudents.length * totalSessions;

  const totalPresent = batchStudents.reduce(
    (total, student) =>
      total +
      getStudentAttendance(student.email).present,
    0
  );

  const overallAttendance =
    totalPossibleAttendance > 0
      ? Math.round(
          (totalPresent / totalPossibleAttendance) * 100
        )
      : 0;

  const studentsBelow70 = batchStudents.filter(
    (student) =>
      getStudentAttendance(student.email).percentage < 70
  ).length;

  const studentsEligible = batchStudents.filter(
    (student) =>
      getStudentAttendance(student.email).percentage >= 70
  ).length;

  const getModuleName = (moduleId) => {
    const module = modules.find(
      (item) => item.id === moduleId
    );

    return (
      module?.moduleName ||
      moduleId ||
      "Unknown Module"
    );
  };

  const moduleAttendance = modules
    .map((module) => {
      const stats = getBatchModuleAttendance({
        sessions: batchSessions,
        students: batchStudents,
        attendanceRecords: batchAttendance,
        moduleId: module.id,
      });

      if (stats.sessions === 0) return null;

      return {
        id: module.id,
        name: module.moduleName,
        sessions: stats.sessions,
        present: stats.present,
        percentage: stats.percentage,
      };
    })
    .filter(Boolean);

  const reconcileMissingAttendance = async () => {
    if (!selectedBatch) {
      alert("Please select a batch first.");
      return;
    }

    const confirmed = window.confirm(
      "Reconcile attendance for all completed sessions in this batch?\n\nThis will ONLY CREATE missing ABSENT records. Existing Present, Absent and Manual Override records will NOT be changed or deleted."
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const completedBatchSessions = batchSessions;
      const studentsInBatch = batchStudents.filter(
        (student) => student.email
      );

      if (completedBatchSessions.length === 0) {
        alert("There are no completed sessions to reconcile.");
        return;
      }

      // Read all attendance once. We never overwrite existing records.
      const attendanceSnapshot = await getDocs(
        query(
          collection(db, "attendance"),
          where("batchId", "==", selectedBatch)
        )
      );

      const existingByKey = new Map();

      attendanceSnapshot.docs.forEach((attendanceDoc) => {
        const record = {
          id: attendanceDoc.id,
          ...attendanceDoc.data(),
        };

        if (!record.sessionId || !record.studentEmail) return;

        const key = `${record.sessionId}__${normalizeEmail(
          record.studentEmail
        )}`;

        if (!existingByKey.has(key)) {
          existingByKey.set(key, []);
        }

        existingByKey.get(key).push(record);
      });

      const missing = [];

      for (const session of completedBatchSessions) {
        for (const student of studentsInBatch) {
          const key = `${session.id}__${normalizeEmail(
            student.email
          )}`;

          const existing = existingByKey.get(key) || [];

          // Any existing record means we leave the stored data alone.
          // The student page will resolve Present/Manual correctly and
          // infer Absent when a completed session has no Present record.
          if (existing.length > 0) continue;

          missing.push({ session, student });
        }
      }

      const CHUNK_SIZE = 400;

      for (
        let start = 0;
        start < missing.length;
        start += CHUNK_SIZE
      ) {
        const chunk = missing.slice(start, start + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const { session, student } of chunk) {
          const safeEmail = String(student.email).replace(
            /[.#$[\]/]/g,
            "_"
          );

          const attendanceId =
            `${selectedBatch}_${session.id}_${safeEmail}`;

          const attendanceRef = doc(
            db,
            "attendance",
            attendanceId
          );

          batch.set(
            attendanceRef,
            {
              studentEmail: student.email,
              batchId: selectedBatch,
              sessionId: session.id,
              sessionTitle: session.title || "",
              moduleId: session.moduleId || null,
              sessionDate: session.date || "",
              sessionTime: session.time || "",
              status: "absent",
              source: "attendance_reconciliation",
              updatedAt: serverTimestamp(),
              attendanceFinalizedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
      }

      await loadAttendanceData();

      alert(
        missing.length > 0
          ? `Attendance reconciliation completed. ${missing.length} missing ABSENT record(s) were created.`
          : "Attendance reconciliation completed. No missing records were found."
      );
    } catch (error) {
      console.error("Attendance reconciliation error:", error);
      alert(
        "Attendance reconciliation failed. Existing attendance records were not intentionally modified."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendance = async () => {
    if (
      !manualSessionId ||
      !manualStudentEmail ||
      !selectedBatch
    ) {
      alert(
        "Please select batch, session and student."
      );
      return;
    }

    try {
      setSavingManual(true);

      const session = batchSessions.find(
        (item) => item.id === manualSessionId
      );

      if (!session) {
        alert("Selected session could not be found.");
        return;
      }

      const attendanceId =
        `${selectedBatch}_${manualSessionId}_${manualStudentEmail}`
          .replace(/[.#$[\]/]/g, "_");

      const attendanceRef = doc(
        db,
        "attendance",
        attendanceId
      );

      await setDoc(
        attendanceRef,
        {
          studentEmail: manualStudentEmail,
          batchId: selectedBatch,

          sessionId: manualSessionId,
          sessionTitle: session.title || "",
          moduleId: session.moduleId || null,

          sessionDate: session.date || "",
          sessionTime: session.time || "",

          status: manualStatus,

          source: "manual",
          manualOverride: true,
          manualReason: manualReason.trim(),

          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      alert("Attendance updated successfully.");

      setManualSessionId("");
      setManualStudentEmail("");
      setManualStatus("present");
      setManualReason("");

      await loadAttendanceData();
    } catch (error) {
      console.error(
        "Manual attendance error:",
        error
      );

      alert(
        "Unable to update attendance."
      );
    } finally {
      setSavingManual(false);
    }
  };
  const createOfflineSession = async () => {
  try {
    if (!selectedBatch) {
      alert("Please select a batch.");
      return;
    }

    if (!offlineModuleId) {
      alert("Please select a module.");
      return;
    }

    if (!offlineTitle.trim()) {
      alert("Please enter the offline class title.");
      return;
    }

    if (!offlineDate) {
      alert("Please select the class date.");
      return;
    }

    setSavingOffline(true);

    const offlineSessionRef = doc(collection(db, "liveSessions"));

    await setDoc(offlineSessionRef, {
      batchId: selectedBatch,
      moduleId: offlineModuleId,

      title: offlineTitle.trim(),

      date: offlineDate,
      time: offlineTime || "",

      status: "ended",
      active: false,

      sessionType: "offline",
      attendanceMode: "offline",

      createdAt: serverTimestamp(),
      endedAt: serverTimestamp(),

      offlineReason: offlineReason.trim(),
    });

    /*
     * Initialise every student in the selected batch
     * as ABSENT.
     *
     * Admin will change the required students to PRESENT
     * before saving.
     */
    const initialAttendance = {};

    batchStudents.forEach((student) => {
      if (student.email) {
        initialAttendance[student.email] = "absent";
      }
    });

    setOfflineAttendance(initialAttendance);

setOfflineSessionId(offlineSessionRef.id);

await loadAttendanceData();

setOfflineSessionCreated(true);

alert(
  "Offline class created. Please record student attendance."
);
  } catch (error) {
    console.error(
      "Error creating offline session:",
      error
    );

    alert(
      "Could not create the offline class."
    );
  } finally {
    setSavingOffline(false);
  }
};
const saveOfflineAttendance = async () => {
  try {
    if (!selectedBatch) {
      alert("Batch is missing.");
      return;
    }

    if (!offlineModuleId) {
      alert("Module is missing.");
      return;
    }

    if (!offlineSessionCreated) {
      alert("Please create the offline class first.");
      return;
    }

    if (!offlineSessionId) {
  alert(
    "Offline session ID is missing. Please create the offline class again."
  );
  return;
}

    setSavingOffline(true);

    const writePromises = batchStudents
      .filter((student) => student.email)
      .map(async (student) => {
        const attendanceId =
          `${selectedBatch}_${offlineSessionId}_${student.email}`
            .replace(/[.#$[\]/]/g, "_");

        const attendanceRef = doc(
          db,
          "attendance",
          attendanceId
        );

        await setDoc(
          attendanceRef,
          {
            studentEmail: student.email,
            batchId: selectedBatch,

            sessionId: offlineSessionId,
            sessionTitle: offlineTitle.trim(),

            moduleId: offlineModuleId,

            sessionDate: offlineDate,
            sessionTime: offlineTime || "" || "",

            status:
              offlineAttendance[student.email] || "absent",

            source: "offline",

            manualOverride: true,

            manualReason:
              offlineReason.trim() ||
              "Offline class attendance",

            updatedAt: serverTimestamp(),
            attendanceFinalizedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      });

    await Promise.all(writePromises);

    alert(
      "Offline attendance saved successfully."
    );

    /*
     * Reset the offline form.
     */
    setOfflineModuleId("");
    setOfflineTitle("");
    setOfflineDate("");
    setOfflineTime("");
    setOfflineReason("");
    setOfflineAttendance({});
    setOfflineSessionCreated(false);
    setOfflineSessionId("");

  } catch (error) {
    console.error(
      "Error saving offline attendance:",
      error
    );

    alert(
      "Could not save offline attendance."
    );
  } finally {
    setSavingOffline(false);
  }
};

  const getStudentModuleAttendance = (studentEmail) => {
    return moduleAttendance.map((module) => {
      const stats = getStudentModuleAttendanceStats({
        sessions: batchSessions,
        attendanceRecords: batchAttendance,
        studentEmail,
        moduleId: module.id,
      });

      return {
        ...module,
        present: stats.present,
        percentage: stats.percentage,
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl px-8 py-6">
          <p className="text-slate-600 font-medium">
            Loading attendance analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 md:p-10">

      {/* HEADER */}

      <div className="max-w-7xl mx-auto">

        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 rounded-3xl p-8 text-white shadow-xl mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>
              <p className="text-blue-200 uppercase tracking-[0.25em] text-xs font-bold">
                Synaptech LMS
              </p>

              <h1 className="text-3xl md:text-4xl font-bold mt-2">
                Attendance Analytics
              </h1>

              <p className="text-blue-100 mt-2">
                Batch-wise live session attendance
                management and reporting
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-4">
              <p className="text-xs text-blue-100 uppercase tracking-wider">
                Certificate Requirement
              </p>

              <p className="text-2xl font-bold mt-1">
                70% Attendance
              </p>
            </div>

          </div>

        </div>

        {/* BATCH SELECTOR */}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 mb-8">

          <label className="block text-sm font-semibold text-slate-600 mb-2">
            Select Batch
          </label>

          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setSelectedStudent(null);
            }}
            className="w-full md:w-96 border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              Select Batch
            </option>

            {batches.map((batch) => (
              <option
                key={batch.id}
                value={batch.id}
              >
                {batch.batchName || batch.id}
              </option>
            ))}
          </select>

          {selectedBatch && (
            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-500">
                Reconciliation only creates missing ABSENT records for completed sessions. Existing attendance is never deleted or overwritten.
              </p>

              <button
                type="button"
                onClick={reconcileMissingAttendance}
                disabled={loading}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reconcile Missing Attendance
              </button>
            </div>
          )}

        </div>

        {/* KPI CARDS */}

        {selectedBatch && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <p className="text-sm text-slate-500">
                  Total Students
                </p>

                <p className="text-3xl font-bold text-blue-700 mt-2">
                  {batchStudents.length}
                </p>

                <p className="text-xs text-slate-400 mt-2">
  Students assigned to this batch
</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <p className="text-sm text-slate-500">
                  Live Sessions
                </p>

                <p className="text-3xl font-bold text-indigo-700 mt-2">
                  {totalSessions}
                </p>

                <p className="text-xs text-slate-400 mt-2">
  Completed sessions counted for attendance
</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <p className="text-sm text-slate-500">
                  Average Attendance
                </p>

                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {overallAttendance}%
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  Across all batch sessions
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <p className="text-sm text-slate-500">
                  Below 70%
                </p>

                <p className="text-3xl font-bold text-red-600 mt-2">
                  {studentsBelow70}
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  {studentsEligible} students currently eligible
                </p>
              </div>

            </div>

            {/* STUDENT ATTENDANCE TABLE */}

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-8">

              <div className="p-6 border-b border-slate-200">

                <h2 className="text-xl font-bold text-slate-800">
                  Batch Student Attendance
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Click a student to view detailed module-wise attendance.
                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-900 text-white">

                    <tr>
                      <th className="text-left px-5 py-4 text-sm">
                        Student
                      </th>

                      <th className="text-center px-5 py-4 text-sm">
                        Sessions
                      </th>

                      <th className="text-center px-5 py-4 text-sm">
                        Present
                      </th>

                      <th className="text-center px-5 py-4 text-sm">
                        Absent
                      </th>

                      <th className="text-center px-5 py-4 text-sm">
                        Attendance
                      </th>

                      <th className="text-center px-5 py-4 text-sm">
                        Status
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {batchStudents.map((student) => {

                      const stats =
                        getStudentAttendance(
                          student.email
                        );

                      return (
                        <tr
                          key={student.id}
                          onClick={() =>
                            setSelectedStudent(student)
                          }
                          className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition"
                        >

                          <td className="px-5 py-4">

                            <div className="font-semibold text-slate-800">
                              {student.name}
                            </div>

                            <div className="text-xs text-slate-500">
                              {student.email}
                            </div>

                          </td>

                          <td className="text-center px-5 py-4">
                            {stats.total}
                          </td>

                          <td className="text-center px-5 py-4 text-emerald-600 font-semibold">
                            {stats.present}
                          </td>

                          <td className="text-center px-5 py-4 text-red-500 font-semibold">
                            {stats.absent}
                          </td>

                          <td className="text-center px-5 py-4">

                            <span className="font-bold">
                              {stats.percentage}%
                            </span>

                          </td>

                          <td className="text-center px-5 py-4">

                            {stats.percentage >= 70 ? (
                              <span className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                Eligible
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                Below 70%
                              </span>
                            )}

                          </td>

                        </tr>
                      );

                    })}

                  </tbody>

                </table>

              </div>

            </div>

            {/* MODULE-WISE ANALYTICS */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">

                <h2 className="text-xl font-bold text-slate-800">
                  Module-wise Attendance
                </h2>

                <p className="text-sm text-slate-500 mb-6">
                  Attendance performance across the 16 academic modules.
                </p>

                <div className="space-y-5">

                  {moduleAttendance.map((module) => (

                    <div key={module.id}>

                      <div className="flex justify-between text-sm mb-2">

                        <span className="font-semibold text-slate-700">
                          {module.name}
                        </span>

                        <span className="font-bold text-blue-700">
                          {module.percentage}%
                        </span>

                      </div>

                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">

                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              module.percentage,
                              100
                            )}%`,
                          }}
                        />

                      </div>

                      <p className="text-xs text-slate-400 mt-1">
  {module.present} present records /{" "}
  {batchStudents.length * module.sessions} possible
</p>

                    </div>

                  ))}

                </div>

              </div>

              {/* PIE CHART */}

              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">

                <h2 className="text-xl font-bold text-slate-800">
                  Batch Attendance Distribution
                </h2>

                <p className="text-sm text-slate-500 mb-6">
                  Present versus absent attendance records.
                </p>

                <div className="flex flex-col items-center">

                  <div
                    className="w-52 h-52 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(
                        #10b981 0% ${overallAttendance}%,
                        #ef4444 ${overallAttendance}% 100%
                      )`,
                    }}
                  >

                    <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center">

                      <div className="text-center">

                        <p className="text-3xl font-bold text-slate-800">
                          {overallAttendance}%
                        </p>

                        <p className="text-xs text-slate-500">
                          Attendance
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="flex gap-8 mt-6">

                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-600">
                        Present
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm text-slate-600">
                        Absent
                      </span>
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* MANUAL ATTENDANCE */}

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 mb-8">

              <div className="mb-6">

                <h2 className="text-xl font-bold text-slate-800">
                  Manual Attendance Adjustment
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Use this only for approved special circumstances,
                  such as illness or other exceptional cases.
                </p>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>

                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Student
                  </label>

                  <select
                    value={manualStudentEmail}
                    onChange={(e) =>
                      setManualStudentEmail(
                        e.target.value
                      )
                    }
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  >

                    <option value="">
                      Select Student
                    </option>

                    {batchStudents.map((student) => (
                      <option
                        key={student.id}
                        value={student.email}
                      >
                        {student.name} — {student.email}
                      </option>
                    ))}

                  </select>

                </div>

                <div>

                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Live Session
                  </label>

                  <select
                    value={manualSessionId}
                    onChange={(e) =>
                      setManualSessionId(
                        e.target.value
                      )
                    }
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  >

                    <option value="">
                      Select Session
                    </option>

                    {batchSessions.map((session) => (
                      <option
                        key={session.id}
                        value={session.id}
                      >
                        {session.title} —{" "}
                        {session.date}
                      </option>
                    ))}

                  </select>

                </div>

                <div>

                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Attendance Status
                  </label>

                  <select
                    value={manualStatus}
                    onChange={(e) =>
                      setManualStatus(
                        e.target.value
                      )
                    }
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  >

                    <option value="present">
                      Present
                    </option>

                    <option value="absent">
                      Absent
                    </option>

                  </select>

                </div>

                <div>

                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Reason / Remarks
                  </label>

                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) =>
                      setManualReason(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Medical emergency"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  />

                </div>

              </div>

              <button
                type="button"
                onClick={handleManualAttendance}
                disabled={savingManual}
                className="mt-5 bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {savingManual
                  ? "Saving..."
                  : "Save Attendance Adjustment"}
              </button>

            </div>
                        {/* OFFLINE CLASS ATTENDANCE */}

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 mb-8">

              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  Offline Class Attendance
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Create an offline classroom session and record attendance
                  for students assigned to the selected batch.
                </p>
              </div>

              {!offlineSessionCreated ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* MODULE */}

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Module
                      </label>

                      <select
                        value={offlineModuleId}
                        onChange={(e) =>
                          setOfflineModuleId(e.target.value)
                        }
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                      >
                        <option value="">
                          Select Module
                        </option>

                        {modules.map((module) => (
                          <option
                            key={module.id}
                            value={module.id}
                          >
                            {module.moduleName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CLASS TITLE */}

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Offline Class Title
                      </label>

                      <input
                        type="text"
                        value={offlineTitle}
                        onChange={(e) =>
                          setOfflineTitle(e.target.value)
                        }
                        placeholder="e.g. Python - Offline Class"
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      />
                    </div>

                    {/* DATE */}

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Class Date
                      </label>

                      <input
                        type="date"
                        value={offlineDate}
                        onChange={(e) =>
                          setOfflineDate(e.target.value)
                        }
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      />
                    </div>

                    {/* TIME */}

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Class Time
                      </label>

                      <input
                        type="time"
                        value={offlineTime}
                        onChange={(e) =>
                          setOfflineTime(e.target.value)
                        }
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      />
                    </div>

                    {/* REMARKS */}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Remarks
                      </label>

                      <input
                        type="text"
                        value={offlineReason}
                        onChange={(e) =>
                          setOfflineReason(e.target.value)
                        }
                        placeholder="e.g. Offline classroom session"
                        className="w-full border border-slate-300 rounded-xl px-4 py-3"
                      />
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={createOfflineSession}
                    disabled={savingOffline}
                    className="mt-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {savingOffline
                      ? "Creating..."
                      : "Create Offline Class"}
                  </button>
                </>
              ) : (
                <>
                  {/* OFFLINE SESSION CREATED */}

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                      <div>
                        <p className="text-sm font-semibold text-emerald-700">
                          Offline class created
                        </p>

                        <p className="text-sm text-slate-600 mt-1">
                          {offlineTitle}
                          {offlineDate
                            ? ` — ${offlineDate}`
                            : ""}
                        </p>
                      </div>

                      <span className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        Attendance Pending
                      </span>

                    </div>

                  </div>

                  {/* STUDENT ATTENDANCE */}

                  <div className="overflow-x-auto">

                    <table className="w-full">

                      <thead className="bg-slate-900 text-white">

                        <tr>

                          <th className="text-left px-5 py-4 text-sm">
                            Student
                          </th>

                          <th className="text-left px-5 py-4 text-sm">
                            Email
                          </th>

                          <th className="text-center px-5 py-4 text-sm">
                            Attendance
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {batchStudents.map((student) => (

                          <tr
                            key={student.id}
                            className="border-b border-slate-100"
                          >

                            <td className="px-5 py-4 font-semibold text-slate-800">
                              {student.name}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-500">
                              {student.email}
                            </td>

                            <td className="text-center px-5 py-4">

                              <select
                                value={
                                  offlineAttendance[
                                    student.email
                                  ] || "absent"
                                }
                                onChange={(e) =>
                                  setOfflineAttendance(
                                    (previous) => ({
                                      ...previous,
                                      [student.email]:
                                        e.target.value,
                                    })
                                  )
                                }
                                className="border border-slate-300 rounded-lg px-4 py-2 bg-white"
                              >

                                <option value="present">
                                  Present
                                </option>

                                <option value="absent">
                                  Absent
                                </option>

                              </select>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">

                    <button
                      type="button"
                      onClick={saveOfflineAttendance}
                      disabled={savingOffline}
                      className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {savingOffline
                        ? "Saving..."
                        : "Save Offline Attendance"}
                    </button>

                  </div>

                </>
              )}

            </div>

            {/* STUDENT DETAIL */}

            {selectedStudent && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-8">

                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">

                  <div>

                    <h2 className="text-xl font-bold">
                      {selectedStudent.name}
                    </h2>

                    <p className="text-slate-300 text-sm">
                      {selectedStudent.email}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudent(null)
                    }
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
                  >
                    Close
                  </button>

                </div>

                <div className="p-6">

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">

                    {(() => {

                      const stats =
                        getStudentAttendance(
                          selectedStudent.email
                        );

                      return (
                        <>
                          <div className="bg-blue-50 rounded-2xl p-5">
                            <p className="text-sm text-slate-500">
                              Sessions
                            </p>
                            <p className="text-3xl font-bold text-blue-700">
                              {stats.total}
                            </p>
                          </div>

                          <div className="bg-emerald-50 rounded-2xl p-5">
                            <p className="text-sm text-slate-500">
                              Attended
                            </p>
                            <p className="text-3xl font-bold text-emerald-600">
                              {stats.present}
                            </p>
                          </div>

                          <div className="bg-indigo-50 rounded-2xl p-5">
                            <p className="text-sm text-slate-500">
                              Attendance
                            </p>
                            <p className="text-3xl font-bold text-indigo-700">
                              {stats.percentage}%
                            </p>
                          </div>
                        </>
                      );

                    })()}

                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    Module-wise Student Attendance
                  </h3>

                  <div className="overflow-x-auto">

                    <table className="w-full">

                      <thead className="bg-slate-100">

                        <tr>
                          <th className="text-left px-4 py-3">
                            Module
                          </th>

                          <th className="text-center px-4 py-3">
                            Sessions
                          </th>

                          <th className="text-center px-4 py-3">
                            Attended
                          </th>

                          <th className="text-center px-4 py-3">
                            %
                          </th>
                        </tr>

                      </thead>

                      <tbody>

                        {getStudentModuleAttendance(
                          selectedStudent.email
                        ).map((module) => (

                          <tr
                            key={module.id}
                            className="border-b border-slate-100"
                          >

                            <td className="px-4 py-3 font-semibold">
                              {module.name}
                            </td>

                            <td className="text-center px-4 py-3">
                              {module.sessions}
                            </td>

                            <td className="text-center px-4 py-3">
                              {module.present}
                            </td>

                            <td className="text-center px-4 py-3 font-bold">
                              {module.percentage}%
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4">
                    Session Attendance History
                  </h3>

                  <div className="overflow-x-auto">

                    <table className="w-full">

                      <thead className="bg-slate-100">

                        <tr>
                          <th className="text-left px-4 py-3">
                            Date
                          </th>

                          <th className="text-left px-4 py-3">
                            Module
                          </th>

                          <th className="text-left px-4 py-3">
                            Session
                          </th>

                          <th className="text-center px-4 py-3">
                            Status
                          </th>

                          <th className="text-center px-4 py-3">
                            Source
                          </th>
                        </tr>

                      </thead>

                      <tbody>

                        {batchSessions.map(
                          (session) => {

                            const record =
                              getResolvedAttendanceRecord(
                                batchAttendance,
                                session.id,
                                selectedStudent.email
                              );

                            const present =
                              String(record?.status || "")
                                .trim()
                                .toLowerCase() === "present";

                            return (
                              <tr
                                key={session.id}
                                className="border-b border-slate-100"
                              >

                                <td className="px-4 py-3">
                                  {session.date || "—"}
                                </td>

                                <td className="px-4 py-3">
                                  {getModuleName(
                                    session.moduleId
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {session.title}
                                </td>

                                <td className="text-center px-4 py-3">

                                  {present ? (
                                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                      Present
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                      Absent
                                    </span>
                                  )}

                                </td>

                                <td className="text-center px-4 py-3">

  {record?.source === "offline" ||
  session.sessionType === "offline" ||
  session.attendanceMode === "offline" ? (
    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
      Offline
    </span>
  ) : record?.source === "manual" ? (
    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
      Manual
    </span>
  ) : present ? (
    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
      Live
    </span>
  ) : (
    "—"
  )}

</td>

                              </tr>
                            );

                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              </div>
            )}

          </>
        )}

      </div>

    </div>
  );
}