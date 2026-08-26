import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { normalizeEmail } from "../utils/attendanceUtils";

export default function ManageLiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");

  const [now, setNow] = useState(new Date());

  /*
   * ---------------------------------------------------------
   * LIVE CLOCK
   * ---------------------------------------------------------
   *
   * Used only for UI refresh/countdowns.
   * It does NOT automatically change Firestore status.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        sessionsSnapshot,
        batchesSnapshot,
        modulesSnapshot,
      ] = await Promise.all([
        getDocs(
          query(
            collection(db, "liveSessions"),
            orderBy("createdAt", "desc")
          )
        ),

        getDocs(
          collection(db, "batches")
        ),

        getDocs(
          collection(db, "modules")
        ),
      ]);

      const sessionData = sessionsSnapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      const batchData = batchesSnapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      const moduleData = modulesSnapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      setSessions(sessionData);
      setBatches(batchData);
      setModules(moduleData);

    } catch (error) {
      console.error(
        "Error loading live session management data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOOKUPS
   * ---------------------------------------------------------
   */

  const getBatchName = (batchId) => {
    const batch = batches.find(
      (item) => item.id === batchId
    );

    return (
      batch?.batchName ||
      batchId ||
      "Batch not assigned"
    );
  };

  const getModuleName = (moduleId) => {
    const module = modules.find(
      (item) => item.id === moduleId
    );

    return (
      module?.moduleName ||
      module?.name ||
      moduleId ||
      "Module not assigned"
    );
  };

  /*
   * ---------------------------------------------------------
   * DATE HELPERS
   * ---------------------------------------------------------
   */

  const toDate = (value) => {
    if (!value) return null;

    if (typeof value.toDate === "function") {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  };

  const getScheduledStart = (session) => {
    if (session.scheduledStartAt) {
      return toDate(session.scheduledStartAt);
    }

    if (session.startAt) {
      return toDate(session.startAt);
    }

    if (session.date && session.time) {
      const parsed = new Date(
        `${session.date}T${session.time}`
      );

      return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
    }

    return null;
  };

  const getActualStart = (session) => {
    return toDate(session.actualStartAt);
  };

  const getActualEnd = (session) => {
    return toDate(session.actualEndAt);
  };

  /*
   * ---------------------------------------------------------
   * STATUS
   * ---------------------------------------------------------
   *
   * Firestore status is the source of truth.
   *
   * We do NOT automatically turn scheduled into live.
   * We do NOT automatically turn live into ended.
   */
  const getDisplayStatus = (session) => {
  if (session.status === "live") {
    return "live";
  }

  if (session.status === "ended") {
    return "ended";
  }

  const scheduledStart = getScheduledStart(session);

  if (
    session.status === "scheduled" &&
    scheduledStart &&
    scheduledStart.getTime() <= now.getTime()
  ) {
    return "ready";
  }

  return "scheduled";
};

  /*
   * ---------------------------------------------------------
   * COUNTDOWN
   * ---------------------------------------------------------
   */

  const formatCountdown = (milliseconds) => {
    if (milliseconds <= 0) {
      return "00:00:00";
    }

    const totalSeconds = Math.floor(
      milliseconds / 1000
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  };

  const getCountdown = (session) => {
  const start = getScheduledStart(session);

  if (!start) return null;

  const status = getDisplayStatus(session);

  if (status !== "scheduled") {
    return null;
  }

  return formatCountdown(
    start.getTime() - now.getTime()
  );
};

  /*
   * ---------------------------------------------------------
   * FORMAT DATE / TIME
   * ---------------------------------------------------------
   */

  const formatDate = (value) => {
    const date = toDate(value);

    if (!date) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    const date = toDate(value);

    if (!date) return "—";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ---------------------------------------------------------
   * START SESSION
   * ---------------------------------------------------------
   *
   * This is the actual transition:
   *
   * scheduled → live
   *
   * The actual start time is recorded by Firestore.
   */
  const startSession = async (session) => {
    try {
      const confirmed = window.confirm(
        `Start "${session.title}" now?`
      );

      if (!confirmed) return;

      setActionLoading(`start-${session.id}`);

      const sessionRef = doc(
        db,
        "liveSessions",
        session.id
      );

      await updateDoc(sessionRef, {
        status: "live",
        actualStartAt: serverTimestamp(),
        active: true,
      });

      /*
       * Update local state immediately.
       */
      setSessions((previous) =>
        previous.map((item) =>
          item.id === session.id
            ? {
                ...item,
                status: "live",
                active: true,
                actualStartAt: new Date(),
              }
            : item
        )
      );

    } catch (error) {
      console.error(
        "Error starting live session:",
        error
      );

      alert(
        "The live session could not be started."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * ---------------------------------------------------------
   * END SESSION
   * ---------------------------------------------------------
   *
   * This is the actual transition:
   *
   * live → ended
   *
   * There is NO duration-based automatic ending.
   */
  const endSession = async (session) => {
    try {
      const confirmed = window.confirm(
        `End "${session.title}" now?\n\nThis will mark the live session as ended and finalize attendance for all students in this batch.`
      );

      if (!confirmed) return;

      setActionLoading(`end-${session.id}`);

      /*
       * ---------------------------------------------------------
       * 1. END THE LIVE SESSION
       * ---------------------------------------------------------
       */
      const sessionRef = doc(
        db,
        "liveSessions",
        session.id
      );

      await updateDoc(sessionRef, {
        status: "ended",
        actualEndAt: serverTimestamp(),
        active: false,
      });

      /*
       * ---------------------------------------------------------
       * 2. LOAD THE BATCH POPULATION
       * ---------------------------------------------------------
       */
      const studentsSnapshot = await getDocs(
        query(
          collection(db, "students"),
          where("batchId", "==", session.batchId)
        )
      );

      const students = studentsSnapshot.docs
        .map((studentDoc) => ({
          id: studentDoc.id,
          ...studentDoc.data(),
        }))
        .filter((student) => student.email);

      /*
       * ---------------------------------------------------------
       * 3. LOAD ALL EXISTING RECORDS FOR THIS SESSION ONCE
       * ---------------------------------------------------------
       *
       * We intentionally do NOT query Firestore separately for
       * every student. The old implementation did that and then
       * selected docs[0], which could be the wrong legacy/duplicate
       * record.
       */
      const existingAttendanceSnapshot = await getDocs(
        query(
          collection(db, "attendance"),
          where("sessionId", "==", session.id)
        )
      );

      const existingByEmail = new Map();

      existingAttendanceSnapshot.docs.forEach((attendanceDoc) => {
        const record = {
          id: attendanceDoc.id,
          ...attendanceDoc.data(),
        };

        const email = normalizeEmail(record.studentEmail);
        if (!email) return;

        if (!existingByEmail.has(email)) {
          existingByEmail.set(email, []);
        }

        existingByEmail.get(email).push(record);
      });

      /*
       * ---------------------------------------------------------
       * 4. FINALIZE ONLY MISSING ATTENDANCE
       * ---------------------------------------------------------
       *
       * Rules:
       *   manual override -> never touch
       *   present record  -> never touch
       *   existing absent -> never touch
       *   no record       -> create absent
       *
       * Therefore this function cannot destroy a genuine present
       * record and cannot overwrite manual attendance.
       */
      const missingStudents = students.filter((student) => {
        const records =
          existingByEmail.get(
            normalizeEmail(student.email)
          ) || [];

        if (records.length === 0) return true;

        const hasManualOverride = records.some(
          (record) => record.manualOverride === true
        );

        if (hasManualOverride) return false;

        const hasPresent = records.some(
          (record) =>
            String(record.status || "")
              .trim()
              .toLowerCase() === "present"
        );

        if (hasPresent) return false;

        // An existing absent record is already finalized.
        return false;
      });

      const CHUNK_SIZE = 400;

      for (
        let start = 0;
        start < missingStudents.length;
        start += CHUNK_SIZE
      ) {
        const chunk = missingStudents.slice(
          start,
          start + CHUNK_SIZE
        );

        const batch = writeBatch(db);

        for (const student of chunk) {
          const safeEmail = String(student.email)
            .replace(/[.#$[\]/]/g, "_");

          const attendanceId =
            `${session.batchId}_${session.id}_${safeEmail}`;

          const attendanceRef = doc(
            db,
            "attendance",
            attendanceId
          );

          batch.set(
            attendanceRef,
            {
              studentEmail: student.email,
              batchId: session.batchId,
              sessionId: session.id,
              sessionTitle: session.title || "",
              moduleId: session.moduleId || null,
              sessionDate: session.date || "",
              sessionTime: session.time || "",
              status: "absent",
              source: "session_end",
              updatedAt: serverTimestamp(),
              attendanceFinalizedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        if (chunk.length > 0) {
          await batch.commit();
        }
      }

      console.log(
        "Attendance finalized:",
        {
          sessionId: session.id,
          batchId: session.batchId,
          studentsInBatch: students.length,
          existingAttendanceRecords:
            existingAttendanceSnapshot.size,
          missingRecordsCreated: missingStudents.length,
        }
      );

      /*
       * ---------------------------------------------------------
       * 5. UPDATE LOCAL ADMIN UI
       * ---------------------------------------------------------
       */
      setSessions((previous) =>
        previous.map((item) =>
          item.id === session.id
            ? {
                ...item,
                status: "ended",
                active: false,
                actualEndAt: new Date(),
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Error ending live session:",
        error
      );

      alert(
        "The live session could not be ended. Check the console for details."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * ---------------------------------------------------------
   * FILTERING
   * ---------------------------------------------------------
   */

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const batchMatch =
        selectedBatch === "all" ||
        session.batchId === selectedBatch;

      const moduleMatch =
        selectedModule === "all" ||
        session.moduleId === selectedModule;

      return batchMatch && moduleMatch;
    });
  }, [
    sessions,
    selectedBatch,
    selectedModule,
  ]);

  /*
   * ---------------------------------------------------------
   * GROUPS
   * ---------------------------------------------------------
   */

  const upcomingSessions = filteredSessions.filter(
  (session) =>
    getDisplayStatus(session) === "scheduled"
);

const readySessions = filteredSessions.filter(
  (session) =>
    getDisplayStatus(session) === "ready"
);

const liveSessions = filteredSessions.filter(
  (session) =>
    getDisplayStatus(session) === "live"
);

const completedSessions = filteredSessions.filter(
  (session) =>
    getDisplayStatus(session) === "ended"
);

  /*
   * ---------------------------------------------------------
   * SESSION CARD
   * ---------------------------------------------------------
   */

  const SessionCard = ({
    session,
    type,
  }) => {
    const countdown = getCountdown(session);

    const isStarting =
      actionLoading ===
      `start-${session.id}`;

    const isEnding =
      actionLoading ===
      `end-${session.id}`;

    const scheduledStart =
      getScheduledStart(session);

    const actualStart =
      getActualStart(session);

    const actualEnd =
      getActualEnd(session);

    return (
      <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(15,23,42,0.10)]">

        {/* TOP ACCENT */}

        <div
          className={`h-1.5 ${
  type === "live"
    ? "bg-gradient-to-r from-emerald-400 to-green-600"
    : type === "ready"
    ? "bg-gradient-to-r from-amber-400 to-orange-500"
    : type === "ended"
    ? "bg-slate-300"
    : "bg-gradient-to-r from-blue-500 to-indigo-600"
}`}
        />

        <div className="p-6">

          {/* HEADER */}

          <div className="flex items-start justify-between gap-4">

            <div className="flex gap-4">

              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${
  type === "live"
    ? "bg-emerald-50"
    : type === "ready"
    ? "bg-amber-50"
    : type === "ended"
    ? "bg-slate-100"
    : "bg-blue-50"
}`}
              >
                {type === "live"
  ? "🔴"
  : type === "ready"
  ? "⏰"
  : type === "ended"
  ? "✓"
  : "🎥"}
              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {getModuleName(
                    session.moduleId
                  )}
                </p>

                <h3 className="mt-1 text-lg font-bold leading-6 text-slate-900">
                  {session.title}
                </h3>

                {session.sessionNumber && (
                  <p className="mt-1 text-sm text-slate-500">
                    Session{" "}
                    {session.sessionNumber}
                  </p>
                )}

              </div>

            </div>

            {/* STATUS */}

            {type === "live" && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                LIVE NOW
              </span>
            )}

            {type === "scheduled" && (
              <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                UPCOMING
              </span>
            )}
            {type === "ready" && (
  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
    READY TO START
  </span>
)}

            {type === "ended" && (
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                ENDED
              </span>
            )}

          </div>

          {/* DETAILS */}

          <div className="mt-6 grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-slate-50 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Batch
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {getBatchName(
                  session.batchId
                )}
              </p>

            </div>

            <div className="rounded-xl bg-slate-50 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Scheduled
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  scheduledStart
                )}
              </p>

              <p className="text-xs text-slate-500">
                {formatTime(
                  scheduledStart
                )}
              </p>

            </div>

          </div>

          {/* LIVE INFORMATION */}

          {type === "live" && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Started
                  </p>

                  <p className="mt-1 font-bold text-emerald-900">
                    {formatTime(
                      actualStart
                    )}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Expected Duration
                  </p>

                  <p className="mt-1 font-bold text-emerald-900">
                    {session.expectedDurationMinutes ||
                      session.durationMinutes ||
                      "—"}{" "}
                    mins
                  </p>

                </div>

              </div>

              <p className="mt-3 text-xs leading-5 text-emerald-700">
                The session will remain live until
                the faculty or administrator ends
                it. Expected duration does not
                automatically stop the session.
              </p>

            </div>
          )}

          {/* UPCOMING COUNTDOWN */}

          {type === "scheduled" && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Starts In
              </p>

              <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-blue-900">
                {countdown ||
                  "Schedule unavailable"}
              </p>

            </div>
          )}
          {type === "ready" && (
  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">

    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Session Ready
    </p>

    <p className="mt-1 text-sm font-bold text-amber-900">
      The scheduled start time has passed.
    </p>

    <p className="mt-1 text-xs leading-5 text-amber-700">
      Start the session when the faculty is ready.
    </p>

  </div>
)}

          {/* COMPLETED INFORMATION */}

          {type === "ended" && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Started
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatTime(
                      actualStart
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Ended
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatTime(
                      actualEnd
                    )}
                  </p>

                </div>

              </div>

              <div className="mt-4 border-t border-slate-200 pt-3">

                <p className="text-xs text-slate-500">
                  Recording
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">

                  {session.recordingId
                    ? "Recording linked"
                    : "Recording not published"}

                </p>

              </div>

            </div>
          )}

          {/* ACTIONS */}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">

            {(type === "scheduled" || type === "ready") && (
  <button
                type="button"
                onClick={() =>
                  startSession(session)
                }
                disabled={isStarting}
                className={`flex-1 rounded-xl px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
  type === "ready"
    ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-100 hover:from-amber-600 hover:to-orange-600"
    : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-100 hover:from-blue-700 hover:to-indigo-700"
}`}
              >
                {isStarting
  ? "Starting..."
  : type === "ready"
  ? "▶ Start Session Now"
  : "▶ Start Session"}
              </button>
            )}

            {type === "live" && (
              <>
                {(session.meetingUrl || session.meetLink) && (
  <button
    type="button"
    onClick={() => {
      const meetingUrl =
        session.meetingUrl || session.meetLink;

      console.log("ADMIN MEETING URL:", meetingUrl);

      if (!meetingUrl) {
        alert("Meeting URL is not available.");
        return;
      }

      window.open(
        meetingUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }}
    className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-100"
  >
    🎥 Open Meeting
  </button>
)}

                <button
                  type="button"
                  onClick={() =>
                    endSession(session)
                  }
                  disabled={isEnding}
                  className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-100 transition hover:-translate-y-0.5 hover:from-rose-700 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEnding
                    ? "Ending..."
                    : "■ End Session"}
                </button>
              </>
            )}

            {type === "ended" && (
              <button
                type="button"
                disabled
                className="w-full rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-400"
              >
                Session Completed
              </button>
            )}

          </div>

        </div>
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="font-semibold text-slate-700">
            Loading live sessions...
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Preparing your classroom control centre
          </p>

        </div>

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-800 text-white">

        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />

        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-blue-400/10" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">

          <div className="mb-5 flex items-center gap-2 text-sm text-blue-200">

            <span>Synaptech LMS</span>

            <span className="opacity-50">
              /
            </span>

            <span>Admin</span>

            <span className="opacity-50">
              /
            </span>

            <span className="font-semibold text-white">
              Live Classroom
            </span>

          </div>

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">

                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                Live Classroom Control

              </div>

              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Manage Live Sessions
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
                Start, monitor and end your live
                classrooms while keeping every
                session connected to its batch,
                module, attendance and future
                recording.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center backdrop-blur">

                <p className="text-2xl font-bold">
                  {upcomingSessions.length}
                </p>

                <p className="mt-1 text-xs text-blue-200">
                  Upcoming
                </p>

              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-5 py-4 text-center backdrop-blur">

  <p className="text-2xl font-bold text-amber-300">
    {readySessions.length}
  </p>

  <p className="mt-1 text-xs text-amber-200">
    Ready
  </p>

</div>

              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-5 py-4 text-center backdrop-blur">

                <p className="text-2xl font-bold text-emerald-300">
                  {liveSessions.length}
                </p>

                <p className="mt-1 text-xs text-emerald-200">
                  Live
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center backdrop-blur">

                <p className="text-2xl font-bold">
                  {completedSessions.length}
                </p>

                <p className="mt-1 text-xs text-blue-200">
                  Completed
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {/* FILTERS */}

        <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Session Directory
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Filter Live Classrooms
              </h2>

            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[520px]">

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Batch
                </label>

                <select
                  value={selectedBatch}
                  onChange={(e) =>
                    setSelectedBatch(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >

                  <option value="all">
                    All Batches
                  </option>

                  {batches.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batch.batchName}
                    </option>
                  ))}

                </select>

              </div>


              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Module
                </label>

                <select
                  value={selectedModule}
                  onChange={(e) =>
                    setSelectedModule(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >

                  <option value="all">
                    All Modules
                  </option>

                  {modules.map((module) => (
                    <option
                      key={module.id}
                      value={module.id}
                    >
                      {module.moduleName ||
                        module.name ||
                        module.id}
                    </option>
                  ))}

                </select>

              </div>

            </div>

          </div>

        </div>


        {/* ===================================================
            LIVE NOW
        ==================================================== */}

        <section className="mb-12">

          <div className="mb-6 flex items-end justify-between">

            <div>

              <div className="flex items-center gap-3">

                <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />

                <h2 className="text-2xl font-bold text-slate-900">
                  Live Now
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Sessions currently being conducted.
              </p>

            </div>

            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
              {liveSessions.length}
            </span>

          </div>


          {liveSessions.length === 0 ? (

            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="mb-3 text-4xl">
                🎥
              </div>

              <h3 className="font-bold text-slate-800">
                No live sessions right now
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Start a scheduled session when
                the faculty is ready.
              </p>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {liveSessions.map(
                (session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    type="live"
                  />
                )
              )}

            </div>

          )}

        </section>

{/* ===================================================
    READY TO START
==================================================== */}

<section className="mb-12">

  <div className="mb-6 flex items-end justify-between">

    <div>

      <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
        Action Required
      </p>

      <h2 className="mt-1 text-2xl font-bold text-slate-900">
        Ready to Start
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Scheduled start time has passed and the session
        has not yet been started.
      </p>

    </div>

    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700">
      {readySessions.length}
    </span>

  </div>

  {readySessions.length === 0 ? (

    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

      <div className="mb-3 text-4xl">
        ⏰
      </div>

      <h3 className="font-bold text-slate-800">
        No sessions waiting to start
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Sessions whose scheduled time has passed
        will appear here.
      </p>

    </div>

  ) : (

    <div className="grid gap-6 lg:grid-cols-2">

      {readySessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          type="ready"
        />
      ))}

    </div>

  )}

</section>
        {/* ===================================================
            UPCOMING
        ==================================================== */}

        <section className="mb-12">

          <div className="mb-6 flex items-end justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Scheduled
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Upcoming Sessions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Classes waiting to be started by
                faculty or administration.
              </p>

            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-bold text-blue-700">
              {upcomingSessions.length}
            </span>

          </div>


          {upcomingSessions.length === 0 ? (

            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="mb-3 text-4xl">
                📅
              </div>

              <h3 className="font-bold text-slate-800">
                No upcoming sessions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                New scheduled live classes will
                appear here.
              </p>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {upcomingSessions.map(
                (session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    type="scheduled"
                  />
                )
              )}

            </div>

          )}

        </section>


        {/* ===================================================
            COMPLETED
        ==================================================== */}

        <section>

          <div className="mb-6 flex items-end justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                History
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Completed Sessions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sessions that have been explicitly
                ended by faculty or administration.
              </p>

            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
              {completedSessions.length}
            </span>

          </div>


          {completedSessions.length === 0 ? (

            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="mb-3 text-4xl">
                ✓
              </div>

              <h3 className="font-bold text-slate-800">
                No completed sessions yet
              </h3>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {completedSessions.map(
                (session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    type="ended"
                  />
                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}