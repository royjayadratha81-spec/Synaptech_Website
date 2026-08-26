import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";

const MODULES = [
  { id: "PYTHON", name: "Python", icon: "🐍" },
  { id: "NUMPY", name: "NumPy", icon: "🔢" },
  { id: "PANDAS", name: "Pandas", icon: "🐼" },
  { id: "DATA_VISUALIZATION", name: "Data Visualization", icon: "📊" },
  { id: "EDA", name: "EDA", icon: "🔎" },
  { id: "TABLEAU", name: "Tableau", icon: "📈" },
  { id: "POWER_BI", name: "Power BI", icon: "📊" },
  { id: "SQL", name: "SQL", icon: "🗄️" },
  { id: "EXCEL", name: "Excel", icon: "📗" },
  { id: "R", name: "R", icon: "📐" },
  { id: "STATISTICS_MATHEMATICS", name: "Statistics & Mathematics", icon: "🧮" },
  { id: "MACHINE_LEARNING", name: "Machine Learning", icon: "🤖" },
  { id: "DEEP_LEARNING", name: "Deep Learning", icon: "🧠" },
  { id: "GENERATIVE_AI", name: "Generative AI", icon: "✨" },
  { id: "AGENTIC_AI", name: "Agentic AI", icon: "🚀" },
  { id: "MLOPS", name: "MLOps", icon: "⚙️" },
];

const getModuleName = (moduleId) => {
  const module = MODULES.find(
    (item) =>
      String(item.id).toLowerCase() === String(moduleId || "").toLowerCase()
  );

  return module?.name || moduleId || "Other";
};

const getModuleIcon = (moduleId) => {
  const module = MODULES.find(
    (item) =>
      String(item.id).toLowerCase() === String(moduleId || "").toLowerCase()
  );

  return module?.icon || "📚";
};
/*
 * ---------------------------------------------------------
 * MEETING PROVIDER ABSTRACTION
 * ---------------------------------------------------------
 *
 * The LMS must not depend on Google Meet, Teams or Webex.
 *
 * For now:
 * - meetingUrl is the preferred future field
 * - meetLink is retained as a legacy fallback
 *
 * Later we can plug in:
 * Google Meet / Microsoft Teams / Webex / Zoom / etc.
 */

const getMeetingUrl = (session) => {
  if (session?.meetingUrl) {
    return session.meetingUrl;
  }

  // Temporary backward compatibility
  if (session?.meetLink) {
    return session.meetLink;
  }

  return null;
};

const getMeetingProvider = (session) => {
  if (session?.meetingProvider) {
    return session.meetingProvider;
  }

  // Temporary identification of existing records
  if (session?.meetLink) {
    return "google_meet";
  }

  return null;
};

const openMeeting = (session) => {
  const meetingUrl = getMeetingUrl(session);

  if (!meetingUrl) {
    alert(
      "The meeting has not been configured yet. Please contact the faculty or administrator."
    );
    return false;
  }

  window.open(
    meetingUrl,
    "_blank",
    "noopener,noreferrer"
  );

  return true;
};

/*
 * Firestore Timestamp / JS Date / ISO string / date + time
 * are all handled here.
 */
const getDateValue = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getSessionStart = (session) => {
  if (session?.startAt) {
    const parsed = getDateValue(session.startAt);
    if (parsed) return parsed;
  }

  if (session?.date && session?.time) {
    const parsed = new Date(`${session.date}T${session.time}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};


const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getSessionState = (session, now) => {
  const start = getSessionStart(session);

  if (!start) {
    return {
      status: "unknown",
      countdown: null,
      start: null,
    };
  }

  /*
   * Firestore status is the source of truth.
   *
   * scheduled -> UPCOMING
   * live      -> LIVE NOW
   * ended     -> ENDED
   *
   * The clock is used ONLY for the countdown.
   * It does NOT automatically start or end a session.
   */

  if (session.status === "live") {
    return {
      status: "live",
      countdown: null,
      start,
    };
  }

  if (session.status === "ended") {
    return {
      status: "ended",
      countdown: null,
      start,
    };
  }

  /*
   * Default state is scheduled.
   *
   * Even if the scheduled time has passed, the student
   * must wait until Admin/Faculty explicitly starts
   * the session.
   */
  return {
    status: "upcoming",
    countdown:
      now < start
        ? formatCountdown(start.getTime() - now.getTime())
        : "00:00:00",
    start,
  };
};

export default function LiveSessions() {
  const [recordings, setRecordings] = useState([]);
const [sessions, setSessions] = useState([]);
const [studentBatch, setStudentBatch] = useState("");
const [meetingInProgress, setMeetingInProgress] = useState({});
const [hasJoinedSession, setHasJoinedSession] = useState({});
const [loading, setLoading] = useState(true);
const [now, setNow] = useState(new Date());

  /*
 * ---------------------------------------------------------
 * LIVE CLOCK
 * ---------------------------------------------------------
 *
 * This updates the countdown every second.
 *
 * IMPORTANT:
 * The clock does NOT start or end a session.
 *
 * Firestore status remains the source of truth:
 *
 * scheduled -> UPCOMING
 * live      -> LIVE NOW
 * ended     -> ENDED
 *
 * The student page receives status changes
 * automatically through onSnapshot().
 */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /*
   * ---------------------------------------------------------
   * FETCH STUDENT BATCH
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const fetchStudentBatch = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "students"),
          where("email", "==", user.email)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const studentData = snapshot.docs[0].data();

          setStudentBatch(studentData.batchId || "");
        }
      } catch (error) {
        console.error("Error fetching student batch:", error);
      }
    };

    fetchStudentBatch();
  }, []);

  /*
   * ---------------------------------------------------------
   * FETCH LIVE SESSIONS
   * ---------------------------------------------------------
   *
   * We deliberately query by batch at Firestore level.
   * This prevents another batch's sessions from entering
   * the student page.
   */
  useEffect(() => {
  if (!studentBatch) {
    setSessions([]);
    return;
  }

  const q = query(
    collection(db, "liveSessions"),
    where("batchId", "==", studentBatch)
  );

  /*
   * REAL-TIME SESSION LISTENER
   *
   * When Admin/Faculty:
   *
   * scheduled -> live
   * live      -> ended
   *
   * the student's page updates automatically.
   */
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const sessionList = snapshot.docs.map((sessionDoc) => ({
        id: sessionDoc.id,
        ...sessionDoc.data(),
      }));

      sessionList.sort((a, b) => {
        const aStart = getSessionStart(a)?.getTime() || 0;
        const bStart = getSessionStart(b)?.getTime() || 0;

        return aStart - bStart;
      });

      setSessions(sessionList);
    },
    (error) => {
      console.error(
        "Error listening to live sessions:",
        error
      );
    }
  );

  return () => unsubscribe();
}, [studentBatch]);

  /*
   * ---------------------------------------------------------
   * FETCH RECORDINGS
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * Recordings are also restricted to the student's batch.
   *
   * This is intentionally strict for a SaaS LMS.
   */
  useEffect(() => {
    const fetchRecordings = async () => {
      if (!studentBatch) {
        setRecordings([]);
        return;
      }

      try {
        const q = query(
          collection(db, "recordedSessions"),
          where("batchId", "==", studentBatch)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((recordingDoc) => ({
          id: recordingDoc.id,
          ...recordingDoc.data(),
        }));

        setRecordings(data);
      } catch (error) {
        console.error("Error fetching recordings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [studentBatch]);

  /*
   * ---------------------------------------------------------
   * RECORD LIVE ATTENDANCE
   * ---------------------------------------------------------
   *
   * Existing attendance architecture is preserved.
   *
   * One student + one session = one attendance record.
   */
  const recordLiveAttendance = async (session) => {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login again.");
      return;
    }

    if (!session?.id) {
      console.error("Attendance failed: session ID missing");
      return;
    }

    if (!studentBatch) {
      console.error("Attendance failed: student batch missing");
      return;
    }

    const sessionState = getSessionState(session, new Date());

    /*
     * Attendance can only be recorded while
     * the Firestore session is LIVE.
     */
    if (sessionState.status !== "live") {
      alert("This live session is not currently active.");
      return;
    }

    const meetingUrl = getMeetingUrl(session);

    if (!meetingUrl) {
      alert(
        "The meeting has not been configured yet. Please contact the faculty or administrator."
      );
      return;
    }

    /*
     * ONE STUDENT + ONE SESSION = ONE ATTENDANCE DOCUMENT
     */
    const attendanceId = `${studentBatch}_${session.id}_${user.email}`
      .replace(/[.#$[\]/]/g, "_");

    const attendanceRef = doc(
      db,
      "attendance",
      attendanceId
    );

    /*
     * Check whether this student's attendance
     * for this session already exists.
     */
    const existingAttendance = await getDoc(attendanceRef);

    /*
     * MANUAL ATTENDANCE OVERRIDE
     *
     * Never overwrite a manual record.
     * The student can still reopen the meeting.
     */
    if (
      existingAttendance.exists() &&
      existingAttendance.data()?.manualOverride === true
    ) {
      console.log(
        "Manual attendance override exists. Live attendance will not overwrite it."
      );

      const meetingOpened = openMeeting(session);

      if (meetingOpened) {
        setHasJoinedSession((previous) => ({
          ...previous,
          [session.id]: true,
        }));
      }

      return;
    }

    /*
     * ATTENDANCE ALREADY EXISTS
     *
     * This means the first Join has already been counted.
     *
     * DO NOT:
     * - create another document
     * - update attendedAt
     * - change the status
     *
     * Simply reopen the meeting.
     */
    if (existingAttendance.exists()) {
      console.log(
        "Attendance already recorded for this session. Reopening meeting without changing attendance."
      );

      const meetingOpened = openMeeting(session);

      if (meetingOpened) {
        setHasJoinedSession((previous) => ({
          ...previous,
          [session.id]: true,
        }));
      }

      return;
    }

    /*
     * FIRST JOIN ONLY
     *
     * No attendance document exists yet.
     * This is the ONLY point where live attendance
     * is created.
     */
    await setDoc(
      attendanceRef,
      {
        studentEmail: user.email,
        batchId: studentBatch,

        sessionId: session.id,
        sessionTitle: session.title || "",

        moduleId: session.moduleId || null,

        sessionDate: session.date || "",
        sessionTime: session.time || "",

        status: "present",
        source: "live",

        attendedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    console.log(
      "FIRST JOIN: attendance recorded for session:",
      session.id
    );

    /*
     * Open the meeting only after attendance
     * has successfully been recorded.
     */
    const meetingOpened = openMeeting(session);

    if (meetingOpened) {
      setHasJoinedSession((previous) => ({
        ...previous,
        [session.id]: true,
      }));
    }

  } catch (error) {
    console.error("Error recording live attendance:", error);

    alert(
      "Attendance could not be recorded. Please try again."
    );
  }
};

  /*
   * ---------------------------------------------------------
   * MODULE-WISE LIVE SESSION GROUPING
   * ---------------------------------------------------------
   */
  const groupedLiveSessions = useMemo(() => {
    const groups = {};

    sessions.forEach((session) => {
      const moduleId = session.moduleId || "OTHER";

      if (!groups[moduleId]) {
        groups[moduleId] = [];
      }

      groups[moduleId].push(session);
    });

    return groups;
  }, [sessions]);

  /*
   * ---------------------------------------------------------
   * MODULE-WISE RECORDING GROUPING
   * ---------------------------------------------------------
   */
  const groupedRecordings = useMemo(() => {
    const groups = {};

    recordings.forEach((recording) => {
      const moduleId = recording.moduleId || "OTHER";

      if (!groups[moduleId]) {
        groups[moduleId] = [];
      }

      groups[moduleId].push(recording);
    });

    return groups;
  }, [recordings]);

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            Loading your learning sessions...
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

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700 text-white">

        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-white" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">

            <div>
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-[0.25em] mb-3">
                Synaptech LMS
              </p>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Live Learning Hub
              </h1>

              <p className="mt-4 text-blue-100 max-w-2xl text-lg">
                Join your scheduled live classes, follow your module-wise
                learning journey and access session recordings.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-5 min-w-[230px]">
              <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
                Your Batch
              </p>

              <p className="text-xl font-bold mt-1">
                {studentBatch || "Not Assigned"}
              </p>
            </div>

          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* LIVE SESSIONS */}
        <section>

          <div className="flex items-end justify-between mb-8">

            <div>
              <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">
                Classroom
              </p>

              <h2 className="text-3xl font-bold text-slate-900 mt-1">
                Live Sessions
              </h2>

              <p className="text-slate-500 mt-2">
                Your scheduled sessions, organised module-wise.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              Live sessions update automatically
            </div>

          </div>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="text-5xl mb-4">📅</div>

              <h3 className="text-xl font-bold text-slate-800">
                No live sessions scheduled
              </h3>

              <p className="text-slate-500 mt-2">
                Your upcoming live classes will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">

              {Object.entries(groupedLiveSessions).map(
                ([moduleId, moduleSessions]) => {

                  const module = MODULES.find(
                    (item) =>
                      item.id.toLowerCase() ===
                      String(moduleId).toLowerCase()
                  );

                  return (
                    <div
                      key={moduleId}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                    >

                      {/* MODULE HEADER */}
                      <div className="px-7 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">

                        <div className="flex items-center gap-4">

                          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
                            {module?.icon || getModuleIcon(moduleId)}
                          </div>

                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {module?.name || getModuleName(moduleId)}
                            </h3>

                            <p className="text-sm text-slate-500 mt-1">
                              {moduleSessions.length} live{" "}
                              {moduleSessions.length === 1
                                ? "session"
                                : "sessions"}
                            </p>
                          </div>

                        </div>
                      </div>

                      {/* SESSION LIST */}
                      <div className="divide-y divide-slate-100">

                        {moduleSessions.map((session) => {

                          const state = getSessionState(session, now);

                          return (
                            <div
                              key={session.id}
                              className="p-7 hover:bg-slate-50/70 transition"
                            >

                              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

                                <div className="flex gap-5">

                                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                    {module?.icon || "📚"}
                                  </div>

                                  <div>

                                    <div className="flex flex-wrap items-center gap-3">

                                      <h4 className="text-lg font-bold text-slate-900">
                                        {session.title}
                                      </h4>

                                      {state.status === "live" && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                          LIVE NOW
                                        </span>
                                      )}

                                      {state.status === "upcoming" && (
                                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                          UPCOMING
                                        </span>
                                      )}

                                      {state.status === "ended" && (
                                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                                          ENDED
                                        </span>
                                      )}

                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500">

                                      <span>
                                        📅 {session.date || "Date unavailable"}
                                      </span>

                                      <span>
                                        🕐 {session.time || "Time unavailable"}
                                      </span>

                                      {session.durationMinutes && (
                                        <span>
                                          ⏱ {session.durationMinutes} mins
                                        </span>
                                      )}

                                    </div>

                                  </div>
                                </div>

                                {/* RIGHT SIDE */}
                                <div className="xl:min-w-[280px]">

                                  {state.status === "upcoming" && (
                                    <div className="flex flex-col xl:items-end gap-3">

                                      <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold xl:text-right">
                                          Starts in
                                        </p>

                                        <p className="text-2xl font-bold text-blue-700 font-mono xl:text-right">
                                          {state.countdown}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        disabled
                                        className="w-full xl:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                                      >
                                        Join Live Session
                                      </button>

                                    </div>
                                  )}

                                  {state.status === "live" && (
                                    <div className="flex flex-col xl:items-end gap-3">

                                      <div className="text-right">
                                        <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">
                                          Session is live
                                        </p>

                                        <p className="text-sm text-slate-500 mt-1">
  Faculty is currently conducting this class.
</p>
                                      </div>

                                      <button
  type="button"
  onClick={() => recordLiveAttendance(session)}
  className="w-full xl:w-auto px-7 py-3 rounded-xl font-bold shadow-lg transition-all bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-green-200 hover:-translate-y-0.5"
>
  {hasJoinedSession[session.id]
    ? "↗ Rejoin Live Session"
    : "Join Live Session →"}
</button>

                                    </div>
                                  )}

                                  {state.status === "ended" && (
                                    <div className="flex flex-col xl:items-end gap-3">

                                      <p className="text-sm text-slate-400">
                                        This live session has ended.
                                      </p>

                                      <button
                                        type="button"
                                        disabled
                                        className="w-full xl:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                                      >
                                        Live Session Ended
                                      </button>

                                    </div>
                                  )}

                                  {state.status === "unknown" && (
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full xl:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                                    >
                                      Schedule Unavailable
                                    </button>
                                  )}

                                </div>

                              </div>
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}
        </section>

        {/* RECORDED SESSIONS */}
        <section className="mt-16">

          <div className="mb-8">

            <p className="text-purple-600 text-sm font-semibold uppercase tracking-wider">
              On-Demand Learning
            </p>

            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Recorded Sessions
            </h2>

            <p className="text-slate-500 mt-2">
              Revisit completed classes module by module.
            </p>

          </div>

          {recordings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">

              <div className="text-5xl mb-4">🎥</div>

              <h3 className="text-xl font-bold text-slate-800">
                No recordings available
              </h3>

              <p className="text-slate-500 mt-2">
                Recordings will appear here once they are published for your batch.
              </p>

            </div>
          ) : (
            <div className="space-y-8">

              {Object.entries(groupedRecordings).map(
                ([moduleId, moduleRecordings]) => {

                  const module = MODULES.find(
                    (item) =>
                      item.id.toLowerCase() ===
                      String(moduleId).toLowerCase()
                  );

                  return (
                    <div
                      key={moduleId}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                    >

                      {/* MODULE HEADER */}
                      <div className="px-7 py-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">

                        <div className="flex items-center gap-4">

                          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl">
                            {module?.icon || getModuleIcon(moduleId)}
                          </div>

                          <div>

                            <h3 className="text-xl font-bold text-slate-900">
                              {module?.name || getModuleName(moduleId)}
                            </h3>

                            <p className="text-sm text-slate-500 mt-1">
                              {moduleRecordings.length}{" "}
                              {moduleRecordings.length === 1
                                ? "recording"
                                : "recordings"}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* RECORDINGS */}
                      <div className="grid md:grid-cols-2 gap-5 p-7">

                        {moduleRecordings.map((video) => (

                          <div
                            key={video.id}
                            className="group border border-slate-200 rounded-2xl p-6 hover:border-purple-300 hover:shadow-lg transition-all"
                          >

                            <div className="flex items-start justify-between gap-4">

                              <div>

                                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                                  Recorded Class
                                </p>

                                <h4 className="text-lg font-bold text-slate-900 mt-2">
                                  {video.title}
                                </h4>

                              </div>

                              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl shrink-0">
                                🎥
                              </div>

                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-500">

                              {video.platform && (
                                <p>
                                  <span className="font-medium text-slate-700">
                                    Platform:
                                  </span>{" "}
                                  {video.platform}
                                </p>
                              )}

                              {video.duration && (
                                <p>
                                  <span className="font-medium text-slate-700">
                                    Duration:
                                  </span>{" "}
                                  {video.duration}
                                </p>
                              )}

                            </div>

                            {video.videoLink ? (
                              <a
                                href={video.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center mt-5 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold transition-all"
                              >
                                Watch Recording →
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="mt-5 w-full px-5 py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold"
                              >
                                Recording Unavailable
                              </button>
                            )}

                          </div>

                        ))}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}