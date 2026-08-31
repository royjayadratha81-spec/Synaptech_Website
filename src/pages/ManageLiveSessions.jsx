import { useEffect, useMemo, useRef, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  addDoc,
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

const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const directoryRef = useRef(null);
const liveSectionRef = useRef(null);
const readySectionRef = useRef(null);
const upcomingSectionRef = useRef(null);
const completedSectionRef = useRef(null);

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
       * 5. CREATE RECORDING PROCESSING RECORD
       * ---------------------------------------------------------
       *
       * This mirrors the Doubt Session lifecycle.
       *
       * The actual meeting platform recording will be integrated
       * later. For now the LMS creates a pending recording record
       * immediately when the live class ends.
       */
      const recordingReference = await addDoc(
        collection(db, "recordedSessions"),
        {
          title: session.title || "",
          batchId: session.batchId || "",
          moduleId: session.moduleId || "",

          videoLink: "",
          duration: "",
          platform:
            session.meetingProvider ||
            session.platform ||
            "",

          active: true,

          source: "live_session",
          sessionId: session.id,

          recordingStatus: "pending",
          recordingId: null,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      /*
       * Link the recording back to the live session.
       */
      await updateDoc(sessionRef, {
        recordingId: recordingReference.id,
        recordingStatus: "pending",
        updatedAt: serverTimestamp(),
      });

      console.log(
        "Recording processing record created:",
        recordingReference.id
      );

      /*
       * ---------------------------------------------------------
       * 6. UPDATE LOCAL ADMIN UI
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
const handleStatusFilter = (filter) => {
  setStatusFilter(filter);

  const sectionMap = {
    all: directoryRef,
    live: liveSectionRef,
    ready: readySectionRef,
    scheduled: upcomingSectionRef,
    ended: completedSectionRef,
  };

  const targetRef = sectionMap[filter];

  window.requestAnimationFrame(() => {
    targetRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};
  
  const filteredSessions = useMemo(() => {
  const term = searchQuery.trim().toLowerCase();

  return sessions.filter((session) => {

    const batchMatch =
      selectedBatch === "all" ||
      session.batchId === selectedBatch;

    const moduleMatch =
      selectedModule === "all" ||
      session.moduleId === selectedModule;

    const displayStatus =
      getDisplayStatus(session);

    const statusMatch =
      statusFilter === "all" ||
      displayStatus === statusFilter;

    const searchMatch =
      !term ||
      [
        session.title,
        session.description,
        session.batchName,
        session.moduleName,
        getBatchName(session.batchId),
        getModuleName(session.moduleId),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      );

    return (
      batchMatch &&
      moduleMatch &&
      statusMatch &&
      searchMatch
    );
  });
}, [
  sessions,
  selectedBatch,
  selectedModule,
  searchQuery,
  statusFilter,
  now,
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
      <div className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">

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

        <div className="flex flex-1 flex-col p-6">

          {/* HEADER */}

          <div className="flex items-start justify-between gap-4">

            <div className="flex gap-4">

              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white shadow-sm text-xl ${
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

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                  {getModuleName(
                    session.moduleId
                  )}
                </p>

                <h3 className="mt-1 text-[1.1rem] font-black leading-tight tracking-tight text-slate-900">
                  {session.title}
                </h3>

                {session.sessionNumber && (
                  <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Batch
              </p>

              <p className="mt-1 truncate text-sm font-bold text-slate-800">
                {getBatchName(
                  session.batchId
                )}
              </p>

            </div>

            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Scheduled
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
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
            <div className="mt-4 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                    Started
                  </p>

                  <p className="mt-1 font-bold text-emerald-900">
                    {formatTime(
                      actualStart
                    )}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
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
            <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">

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
  <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">

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
            <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">

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

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">

            {(type === "scheduled" || type === "ready") && (
  <button
                type="button"
                onClick={() =>
                  startSession(session)
                }
                disabled={isStarting}
                className={`flex-1 rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 ${
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
    className="flex-1 rounded-2xl border border-blue-200/80 bg-blue-50 px-5 py-3.5 text-sm font-black text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md"
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
                  className="flex-1 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-100 transition-all duration-200 hover:-translate-y-0.5 hover:from-rose-700 hover:to-red-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-400"
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

      {/* =====================================================
    PREMIUM HERO
====================================================== */}

<section className="relative overflow-hidden bg-[#050816] text-white">

  {/* Ambient background */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-violet-600/20 blur-3xl" />
    <div className="absolute -left-40 bottom-[-260px] h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-3xl" />
    <div className="absolute left-[42%] top-[18%] h-[260px] w-[260px] rounded-full bg-indigo-500/10 blur-3xl" />

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_30%_70%,rgba(6,182,212,0.08),transparent_28%)]" />
  </div>

  {/* Subtle grid texture */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.045]"
    style={{
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
      backgroundSize: "42px 42px",
    }}
  />

  <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">

    {/* Breadcrumb */}
    <div className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
      <span className="text-slate-300">
        Synaptech LMS
      </span>

      <span className="text-slate-600">
        /
      </span>

      <span>
        Admin
      </span>

      <span className="text-slate-600">
        /
      </span>

      <span className="text-slate-200">
        Live Classroom
      </span>
    </div>

    {/* Main hero content */}
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">

      {/* Left */}
      <div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 backdrop-blur-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>

          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
            Academic Experience Control
          </span>
        </div>

        {/* Heading */}
        <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
          Manage Live
          <span className="block bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
            Sessions
          </span>
        </h1>

        {/* Description */}
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base lg:text-lg">
          Control your live academic classrooms from one
          premium command centre — from scheduled classes
          and faculty-led sessions to attendance finalization
          and recording processing.
        </p>

        {/* Live status indicator */}
        <div className="mt-7 flex flex-wrap items-center gap-3">

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            Live classroom control
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-400 backdrop-blur-xl">
            Faculty controlled
            <span className="text-slate-600">•</span>
            Attendance connected
            <span className="text-slate-600">•</span>
            Recording ready
          </div>

        </div>
      </div>

      {/* Right — premium KPI panel */}
      <div className="relative">

        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-violet-600/20 via-indigo-500/10 to-cyan-500/20 blur-xl" />

        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">

          {/* Panel heading */}
          <div className="mb-3 flex items-center justify-between px-2">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Classroom Overview
              </p>

              <p className="mt-1 text-sm font-bold text-slate-200">
                Session command centre
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
              Live
            </div>

          </div>

          <div className="grid grid-cols-2 gap-3">

            {/* Upcoming */}
            <div className="group rounded-2xl border border-blue-400/10 bg-blue-400/[0.055] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-400/[0.09]">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                  Upcoming
                </span>

                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-400/10 text-xs text-blue-300">
                  ↗
                </span>

              </div>

              <div className="mt-3 text-3xl font-black tabular-nums text-white">
                {upcomingSessions.length}
              </div>

              <p className="mt-1 text-[10px] font-medium text-slate-500">
                Scheduled classrooms
              </p>

            </div>

            {/* Ready */}
            <div className="group rounded-2xl border border-amber-400/10 bg-amber-400/[0.055] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-400/[0.09]">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Ready
                </span>

                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/10 text-xs text-amber-300">
                  !
                </span>

              </div>

              <div className="mt-3 text-3xl font-black tabular-nums text-white">
                {readySessions.length}
              </div>

              <p className="mt-1 text-[10px] font-medium text-slate-500">
                Waiting to start
              </p>

            </div>

            {/* Live */}
            <div className="group rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.065] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400/[0.10]">

              <div className="flex items-center justify-between">

                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-300">

                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>

                  Live Now

                </span>

                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400/10 text-xs text-emerald-300">
                  ●
                </span>

              </div>

              <div className="mt-3 text-3xl font-black tabular-nums text-white">
                {liveSessions.length}
              </div>

              <p className="mt-1 text-[10px] font-medium text-slate-500">
                Currently conducting
              </p>

            </div>

            {/* Completed */}
            <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.065]">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Completed
                </span>

                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.06] text-xs text-slate-400">
                  ✓
                </span>

              </div>

              <div className="mt-3 text-3xl font-black tabular-nums text-white">
                {completedSessions.length}
              </div>

              <p className="mt-1 text-[10px] font-medium text-slate-500">
                Classroom history
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-6 lg:px-10">

        {/* =====================================================
    PREMIUM SESSION DIRECTORY
====================================================== */}

<section
  ref={directoryRef}
  className="mb-6 scroll-mt-6"
>

  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.06)]">

    {/* Top accent */}
    <div className="h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />

    <div className="p-6 lg:p-7">

      {/* Header */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

        <div>

          <div className="flex items-center gap-2">

            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-sm text-violet-600">
              ◈
            </span>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
                Session Directory
              </p>

              <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-900">
                Find Live Classrooms
              </h2>
            </div>

          </div>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Search and filter classrooms by title, batch,
            module or session status.
          </p>

        </div>

        {/* Result count */}
        <div className="flex items-center gap-2 self-start rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 lg:self-auto">

          <span className="h-2 w-2 rounded-full bg-violet-500" />

          <span className="text-xs font-bold text-slate-600">
            {filteredSessions.length}
          </span>

          <span className="text-xs text-slate-400">
            matching sessions
          </span>

        </div>

      </div>

      {/* Controls */}
      <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-2 lg:grid-cols-[1.6fr_1fr_1fr]">

        {/* Search */}
        <div className="relative">

          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search title, batch or module..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              ×
            </button>
          )}

        </div>

        {/* Batch */}
        <div className="relative">

          <select
            value={selectedBatch}
            onChange={(event) =>
              setSelectedBatch(event.target.value)
            }
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          >

            <option value="all">
              All Batches
            </option>

            {batches.map((batch) => (
              <option
                key={batch.id}
                value={batch.id}
              >
                {batch.batchName ||
                  batch.name ||
                  batch.id}
              </option>
            ))}

          </select>

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            ▾
          </span>

        </div>

        {/* Module */}
        <div className="relative">

          <select
            value={selectedModule}
            onChange={(event) =>
              setSelectedModule(event.target.value)
            }
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
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

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            ▾
          </span>

        </div>

      </div>

      {/* Status filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">

        <span className="mr-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
  Quick Filter
</span>

        <button
          type="button"
          onClick={() => handleStatusFilter("all")}
          className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
            statusFilter === "all"
              ? "bg-slate-950 text-white shadow-md"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilter("live")}
          className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
            statusFilter === "live"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          ● Live
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilter("ready")}
          className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
            statusFilter === "ready"
              ? "bg-amber-500 text-white shadow-md shadow-amber-100"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          Ready
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilter("scheduled")}
          className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
            statusFilter === "scheduled"
              ? "bg-blue-600 text-white shadow-md shadow-blue-100"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          Upcoming
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilter("ended")}
          className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
            statusFilter === "ended"
              ? "bg-slate-700 text-white shadow-md"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Completed
        </button>

        {/* Reset */}
        {(searchQuery ||
          selectedBatch !== "all" ||
          selectedModule !== "all" ||
          statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedBatch("all");
              setSelectedModule("all");
              setStatusFilter("all");
            }}
            className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Reset Filters
          </button>
        )}

      </div>

    </div>

  </div>

</section>


        {/* ===================================================
            LIVE NOW
        ==================================================== */}

        <section
  ref={liveSectionRef}
  className="mb-6 scroll-mt-6 overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
>
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />

          <div className="p-6">

  <div className="mb-5 flex items-start justify-between gap-4">

    <div>

      <div className="flex items-center gap-3">

        <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />

        <h2 className="text-2xl font-bold text-slate-900">
          Live Now
        </h2>

      </div>

      <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

              <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

        </div>

        </section>

{/* ===================================================
    READY TO START
==================================================== */}

<section
  ref={readySectionRef}
  className="mb-6 scroll-mt-6 overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
>
  <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />

  <div className="p-6 lg:p-7">
  <div className="mb-5 flex items-start justify-between gap-4">

    <div>

      <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
        Action Required
      </p>

      <h2 className="mt-1 text-2xl font-bold text-slate-900">
        Ready to Start
      </h2>

      <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

      <p className="mt-1.5 text-xs font-semibold text-slate-500">
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
  </div>

</section>
        {/* ===================================================
            UPCOMING
        ==================================================== */}

        <section
  ref={upcomingSectionRef}
  className="mb-6 scroll-mt-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
>
  <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

  <div className="p-6 lg:p-7">

    <div className="mb-6 flex items-end justify-between">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                Scheduled
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Upcoming Sessions
              </h2>

              <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

              <p className="mt-1.5 text-xs font-semibold text-slate-500">
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

</div>
        </section>


        {/* ===================================================
            COMPLETED
        ==================================================== */}

        <section
  ref={completedSectionRef}
  className="mb-6 scroll-mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
>
  <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-600" />

  <div className="p-5 lg:p-6">

    <div className="mb-6 flex items-end justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                History
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Completed Sessions
              </h2>

              <p className="mt-1.5 text-xs font-semibold text-slate-500">
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
</div>
        </section>

      </main>

    </div>
  );
}