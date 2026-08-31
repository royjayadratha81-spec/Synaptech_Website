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
const [activeTab, setActiveTab] = useState("live");


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
   * REAL-TIME RECORDINGS
   * ---------------------------------------------------------
   *
   * Recording records are restricted to the student's batch.
   *
   * When a faculty member ends a live class:
   *
   * recordedSessions document is created
   * recordingStatus = "pending"
   *
   * The student's Recorded Sessions tab therefore updates
   * automatically without refreshing the page.
   */
  useEffect(() => {
    if (!studentBatch) {
      setRecordings([]);
      return undefined;
    }

    const q = query(
      collection(db, "recordedSessions"),
      where("batchId", "==", studentBatch)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recordingList = snapshot.docs.map(
          (recordingDoc) => ({
            id: recordingDoc.id,
            ...recordingDoc.data(),
          })
        );

        recordingList.sort((a, b) => {
          const aDate =
            getDateValue(a.createdAt)?.getTime() || 0;

          const bDate =
            getDateValue(b.createdAt)?.getTime() || 0;

          return bDate - aDate;
        });

        setRecordings(recordingList);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error listening to recordings:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
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
   * TAB FILTERING
   * ---------------------------------------------------------
   */

  const visibleLiveSessions = useMemo(() => {
    /*
     * Ended sessions are historical classroom records.
     * They must remain visible even when active:false after ending.
     */
    return sessions.filter((session) => {
      return (
        session.status === "ended" ||
        session.active !== false
      );
    });
  }, [sessions]);

  const visibleRecordings = useMemo(() => {
    return recordings;
  }, [recordings]);

  const upcomingLiveSessions = useMemo(() => {
    return visibleLiveSessions
      .filter((session) => {
        const start = getSessionStart(session);

        return (
          session.status === "scheduled" &&
          start &&
          start.getTime() >= now.getTime()
        );
      })
      .sort((a, b) => {
        const aStart =
          getSessionStart(a)?.getTime() || 0;

        const bStart =
          getSessionStart(b)?.getTime() || 0;

        return aStart - bStart;
      });
  }, [visibleLiveSessions, now]);

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

      {/* =====================================================
          PREMIUM HERO
      ====================================================== */}

      <header className="relative overflow-hidden bg-slate-950 text-white">

        <div className="absolute -right-32 -top-24 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">

          <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">
            Synaptech LMS
          </p>

          <div className="mt-3 max-w-3xl">

            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Live Learning Hub
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
              Join your scheduled live classes and revisit
              completed classrooms through their recordings.
            </p>

          </div>

          {/* =================================================
              TABS
          ================================================== */}

          <div className="mt-8 inline-flex rounded-2xl border border-white/10 bg-white/[0.07] p-1.5 backdrop-blur-xl">

            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`rounded-xl px-5 py-3 text-xs font-black transition md:text-sm ${
                activeTab === "live"
                  ? "bg-white text-slate-950 shadow-lg"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Live Sessions
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("recorded")}
              className={`rounded-xl px-5 py-3 text-xs font-black transition md:text-sm ${
                activeTab === "recorded"
                  ? "bg-white text-slate-950 shadow-lg"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Recorded Sessions
            </button>

          </div>

        </div>
      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {loading ? (

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[440px] animate-pulse rounded-[2rem] bg-white shadow-sm"
              />
            ))}

          </div>

        ) : activeTab === "live" ? (

          <>

            {/* =================================================
                NEXT LIVE SESSION
            ================================================== */}

            {upcomingLiveSessions.length > 0 && (

              <section className="mb-10">

                <div className="mb-5">

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                    Next classroom
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Your upcoming live class
                  </h2>

                </div>


                <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-6 shadow-[0_20px_60px_rgba(124,58,237,0.08)] md:p-8">

                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

                    <div>

                      <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 shadow-sm">
                        Next session
                      </div>

                      <h3 className="mt-4 text-2xl font-black text-slate-950">
                        {upcomingLiveSessions[0].title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {getModuleName(
                          upcomingLiveSessions[0].moduleId
                        )}{" "}
                        •{" "}
                        {upcomingLiveSessions[0].facultyName ||
                          "Faculty"}
                      </p>

                    </div>


                    <div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">

                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Starts
                      </div>

                      <div className="mt-1 text-lg font-black">
                        {upcomingLiveSessions[0].date ||
                          "—"}{" "}
                        •{" "}
                        {upcomingLiveSessions[0].time ||
                          "—"}
                      </div>

                      <div className="mt-2 text-sm font-black text-violet-200 tabular-nums">

                        Starts in{" "}

                        {formatCountdown(
                          Math.max(
                            getSessionStart(
                              upcomingLiveSessions[0]
                            ).getTime() -
                              now.getTime(),
                            0
                          )
                        )}

                      </div>

                    </div>

                  </div>

                </div>

              </section>

            )}


            {/* =================================================
                LIVE SESSION SECTION
            ================================================== */}

            <section>

              <div className="mb-5">

                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                  Live academic classroom
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Live Sessions
                </h2>

              </div>


              {visibleLiveSessions.length === 0 ? (

                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">

                  <div className="text-5xl">
                    ◉
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-slate-950">
                    No live sessions yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Your scheduled live classes will appear here
                    automatically when they are assigned to your batch.
                  </p>

                </div>

              ) : (

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                  {visibleLiveSessions.map((session) => {

                    const start =
                      getSessionStart(session);

                    const isLive =
                      session.status === "live";

                    const isScheduled =
                      session.status === "scheduled";

                    const isEnded =
                      session.status === "ended";

                    const elapsed =
                      isLive &&
                      session.actualStartAt
                        ? now.getTime() -
                          getDateValue(
                            session.actualStartAt
                          ).getTime()
                        : 0;

                    const countdown =
                      start
                        ? Math.max(
                            start.getTime() -
                              now.getTime(),
                            0
                          )
                        : 0;

                    return (

                      <article
                        key={session.id}
                        className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.11)]"
                      >

                        {/* CARD HERO */}

                        <div className="relative h-32 overflow-hidden bg-slate-950">

                          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-violet-600/30 blur-2xl" />

                          <div className="absolute -bottom-16 left-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" />

                          <div className="relative flex h-full items-end justify-between p-5 text-white">

                            <div>

                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                                Live classroom
                              </div>

                              <div className="mt-2 text-lg font-black">
                                {getModuleName(
                                  session.moduleId
                                )}
                              </div>

                            </div>


                            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black backdrop-blur">

                              {isLive
                                ? "LIVE NOW"
                                : isEnded
                                ? "ENDED"
                                : "UPCOMING"}

                            </div>

                          </div>

                        </div>


                        {/* CARD BODY */}

                        <div className="p-6">

                          <h2 className="text-xl font-black text-slate-950">
                            {session.title}
                          </h2>

                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                            {session.description ||
                              "Join your faculty for a focused live classroom session."}
                          </p>


                          {/* FACULTY */}

                          <div className="mt-5 flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">

                              {(
                                session.facultyName ||
                                "F"
                              )
                                .charAt(0)
                                .toUpperCase()}

                            </div>

                            <div>

                              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Faculty
                              </div>

                              <div className="text-sm font-black text-slate-800">
                                {session.facultyName ||
                                  "Faculty"}
                              </div>

                            </div>

                          </div>


                          {/* DATE/TIME */}

                          <div className="mt-5 grid grid-cols-2 gap-3">

                            <div className="rounded-2xl bg-slate-50 p-3">

                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Date
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-800">
                                {session.date ||
                                  "—"}
                              </div>

                            </div>


                            <div className="rounded-2xl bg-slate-50 p-3">

                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Time
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-800">
                                {session.time ||
                                  "—"}
                              </div>

                            </div>

                          </div>


                          {/* LIVE / UPCOMING PANEL */}

                          <div
                            className={`mt-4 rounded-2xl border p-4 ${
                              isLive
                                ? "border-emerald-100 bg-emerald-50"
                                : "border-violet-100 bg-violet-50"
                            }`}
                          >

                            <div className="flex items-center justify-between gap-4">

                              <div>

                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">

                                  {isLive
                                    ? "Live now"
                                    : isEnded
                                    ? "Session ended"
                                    : "Starts in"}

                                </div>

                                <div className="mt-1 text-xs font-semibold text-slate-600">

                                  {isLive
                                    ? "Faculty is conducting the live class"
                                    : isEnded
                                    ? "This classroom session has ended"
                                    : "Waiting for faculty to start"}

                                </div>

                              </div>


                              <div className="text-right">

                                <div
                                  className={`text-2xl font-black tabular-nums ${
                                    isLive
                                      ? "text-emerald-700"
                                      : "text-slate-950"
                                  }`}
                                >

                                  {isLive
                                    ? formatCountdown(
                                        elapsed
                                      )
                                    : isScheduled
                                    ? formatCountdown(
                                        countdown
                                      )
                                    : "—"}

                                </div>

                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">

                                  {isLive
                                    ? "Elapsed"
                                    : isEnded
                                    ? "Completed"
                                    : "Countdown"}

                                </div>

                              </div>

                            </div>

                          </div>


                          {/* JOIN */}

                          <button
                            type="button"
                            disabled={!isLive}
                            onClick={() =>
                              recordLiveAttendance(
                                session
                              )
                            }
                            className={`mt-6 w-full rounded-2xl px-5 py-3.5 text-sm font-black transition ${
                              isLive
                                ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:-translate-y-0.5 hover:shadow-xl"
                                : "cursor-not-allowed bg-slate-100 text-slate-400"
                            }`}
                          >

                            {isLive
                              ? hasJoinedSession[
                                  session.id
                                ]
                                ? "↗ Rejoin Live Session"
                                : "Join Live Session"
                              : isEnded
                              ? "Live Session Ended"
                              : "Waiting for Faculty to Start"}

                          </button>

                        </div>

                      </article>

                    );

                  })}

                </div>

              )}

            </section>

          </>

        ) : (

          /* ===================================================
             RECORDED SESSIONS
          ==================================================== */

          <section>

            <div className="mb-5">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                On-demand learning
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Recorded Sessions
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Revisit completed live classrooms whenever you need.
              </p>

            </div>


            {visibleRecordings.length === 0 ? (

              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">

                <div className="text-5xl">
                  ▶
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                  No recordings available yet
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Recordings will appear here automatically after
                  your live classes are completed.
                </p>

              </div>

            ) : (

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {visibleRecordings.map((recording) => {

                  const isProcessing =
                    recording.recordingStatus ===
                    "pending";

                  const recordingReady =
                    Boolean(
                      recording.videoLink
                    ) &&
                    recording.recordingStatus !==
                      "pending";

                  return (

                    <article
                      key={recording.id}
                      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.11)]"
                    >

                      {/* RECORDING HERO */}

                      <div className="relative h-32 overflow-hidden bg-slate-950">

                        <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-violet-600/30 blur-2xl" />

                        <div className="absolute -bottom-16 left-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" />

                        <div className="relative flex h-full items-end justify-between p-5 text-white">

                          <div>

                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                              Recorded classroom
                            </div>

                            <div className="mt-2 text-lg font-black">
                              {getModuleName(
                                recording.moduleId
                              )}
                            </div>

                          </div>


                          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black backdrop-blur">

                            {isProcessing
                              ? "PROCESSING"
                              : recordingReady
                              ? "WATCH"
                              : "PENDING"}

                          </div>

                        </div>

                      </div>


                      {/* BODY */}

                      <div className="p-6">

                        <h2 className="text-xl font-black text-slate-950">
                          {recording.title}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Revisit this completed live classroom
                          whenever you need a refresher.
                        </p>


                        <div className="mt-5 grid grid-cols-2 gap-3">

                          <div className="rounded-2xl bg-slate-50 p-3">

                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Platform
                            </div>

                            <div className="mt-1 truncate text-xs font-black text-slate-800">
                              {recording.platform ||
                                "Meeting platform"}
                            </div>

                          </div>


                          <div className="rounded-2xl bg-slate-50 p-3">

                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Duration
                            </div>

                            <div className="mt-1 text-xs font-black text-slate-800">
                              {recording.duration ||
                                "—"}
                            </div>

                          </div>

                        </div>


                        {/* PROCESSING PANEL */}

                        {isProcessing && (

                          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">

                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />

                              </div>

                              <div>

                                <div className="text-xs font-black uppercase tracking-wider text-violet-600">
                                  Recording Processing
                                </div>

                                <div className="mt-1 text-xs leading-5 text-slate-600">
                                  Your live class has ended.
                                  The recording will become
                                  available once the meeting
                                  platform finishes processing it.
                                </div>

                              </div>

                            </div>

                          </div>

                        )}


                        {/* WATCH */}

                        {recordingReady ? (

                          <a
                            href={recording.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                          >
                            Watch Recorded Session →
                          </a>

                        ) : (

                          <button
                            type="button"
                            disabled
                            className="mt-6 w-full cursor-not-allowed rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-400"
                          >
                            {isProcessing
                              ? "Recording Processing"
                              : "Recording Link Pending"}
                          </button>

                        )}

                      </div>

                    </article>

                  );

                })}

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  );
}