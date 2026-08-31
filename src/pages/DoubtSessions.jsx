import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";
import {
  getDoubtSessionStart,
  subscribeToDoubtSessions,
} from "../services/doubtSessionService";

const formatDate = (date) => {
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const formatTime = (date) => {
  if (!date) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};


export default function DoubtSessions({ initialTab = "live" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [studentBatch, setStudentBatch] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStudentBatch = async () => {
      try {
        const user = auth.currentUser;

        if (!user?.email) {
          if (!cancelled) setLoading(false);
          return;
        }

        const snapshot = await getDocs(
          query(
            collection(db, "students"),
            where("email", "==", user.email)
          )
        );

        if (!snapshot.empty && !cancelled) {
          setStudentBatch(
            snapshot.docs[0].data()?.batchId || ""
          );
        }
      } catch (error) {
        console.error(
          "Error loading student batch for doubt sessions:",
          error
        );
      }
    };

    loadStudentBatch();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentBatch) {
      setSessions([]);
      return undefined;
    }

    setLoading(true);

    const unsubscribe = subscribeToDoubtSessions(
      (data) => {
        setSessions(data);
        setLoading(false);
      },
      {
        batchId: studentBatch,
        activeOnly: true,
      }
    );

    return () => unsubscribe();
  }, [studentBatch]);

  const visibleSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (activeTab === "live") {
          return (
            session.sessionType === "live" &&
            session.status !== "ended"
          );
        }

        return (
          session.sessionType === "recorded" ||
          (session.sessionType === "live" &&
            session.status === "ended" &&
            Boolean(session.recordingId))
        );
      }),
    [sessions, activeTab]
  );

  const upcomingLive = useMemo(
    () =>
      visibleSessions
        .filter((session) => {
          const start = getDoubtSessionStart(session);
          return (
            session.sessionType === "live" &&
            session.status === "scheduled" &&
            start &&
            start.getTime() >= now.getTime()
          );
        })
        .sort(
          (a, b) =>
            getDoubtSessionStart(a).getTime() -
            getDoubtSessionStart(b).getTime()
        ),
    [visibleSessions, now]
  );

  const renderCard = (session) => {
    const start = getDoubtSessionStart(session);
    const isRecordedView =
      activeTab === "recorded";
    const isLive =
      !isRecordedView &&
      session.sessionType === "live" &&
      session.status === "live";
    const isScheduled =
      !isRecordedView &&
      session.sessionType === "live" &&
      session.status === "scheduled";
    const isEnded =
      session.sessionType === "live" &&
      session.status === "ended";

    const elapsedMilliseconds =
      isLive && session.actualStartAt
        ? now.getTime() -
          new Date(
            session.actualStartAt?.toDate
              ? session.actualStartAt.toDate()
              : session.actualStartAt
          ).getTime()
        : 0;

    const countdownMilliseconds = start
      ? start.getTime() - now.getTime()
      : 0;

    const actionUrl =
      isRecordedView
        ? session.recordingUrl
        : session.meetingUrl;

    return (
      <article
        key={session.id}
        className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.11)]"
      >
        <div className="relative h-32 overflow-hidden bg-slate-950">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-violet-600/30 blur-2xl" />
          <div className="absolute -bottom-16 left-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" />

          <div className="relative flex h-full items-end justify-between p-5 text-white">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                {isRecordedView
                  ? "Recorded doubt library"
                  : "Live doubt room"}
              </div>
              <div className="mt-2 text-lg font-black">
                {session.moduleName ||
                  session.moduleId ||
                  "Academic support"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black backdrop-blur">
              {isRecordedView
                ? session.recordingStatus === "pending"
                  ? "PROCESSING"
                  : "WATCH"
                : isLive
                ? "LIVE NOW"
                : "UPCOMING"}
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-black text-slate-950">
            {session.title}
          </h2>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {session.description ||
              "Bring your questions and get focused academic support from your faculty."}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
              {session.facultyPhotoURL ? (
                <img
                  src={session.facultyPhotoURL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-black">
                  {(session.facultyName || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                Faculty
              </div>
              <div className="truncate text-sm font-black text-slate-800">
                {session.facultyName || "Faculty"}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Date
              </div>
              <div className="mt-1 text-xs font-black text-slate-800">
                {formatDate(start)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Time
              </div>
              <div className="mt-1 text-xs font-black text-slate-800">
                {formatTime(start)}
              </div>
            </div>
          </div>

          {!isRecordedView && session.sessionType === "live" && (
            <div className={`mt-4 rounded-2xl border p-4 ${
              isLive
                ? "border-emerald-100 bg-emerald-50"
                : isEnded
                ? "border-slate-200 bg-slate-50"
                : "border-violet-100 bg-violet-50"
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {isLive ? "Live now" : isEnded ? "Session ended" : "Starts in"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-600">
                    {isLive
                      ? "Faculty is controlling the live room"
                      : isEnded
                      ? session.recordingStatus === "pending"
                        ? "Recording is being prepared"
                        : "Session completed"
                      : formatDate(start)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black tabular-nums ${
                    isLive ? "text-emerald-700" : "text-slate-950"
                  }`}>
                    {isLive
                      ? formatCountdown(elapsedMilliseconds)
                      : isScheduled
                      ? formatCountdown(Math.max(countdownMilliseconds, 0))
                      : "—"}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isLive ? "Elapsed" : isScheduled ? "Countdown" : "Completed"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!actionUrl || !isLive || isEnded}
            onClick={() => {
              if (!isLive) {
                window.alert(
                  isScheduled
                    ? "The faculty has not started this doubt session yet."
                    : "This doubt session has ended."
                );
                return;
              }

              if (!actionUrl) {
                window.alert(
                  "This session link has not been configured yet."
                );
                return;
              }

              window.open(
                actionUrl,
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className={`mt-6 w-full rounded-2xl px-5 py-3.5 text-sm font-black transition ${
              actionUrl && isLive
                ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:-translate-y-0.5 hover:shadow-xl"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            {isRecordedView
              ? session.recordingStatus === "pending"
                ? "Recording Processing"
                : actionUrl
                ? "Watch Recorded Session"
                : "Recording Link Pending"
              : isLive
              ? "Join Live Doubt Session"
              : "Waiting for Faculty to Start"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -right-32 -top-24 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">
            Student Academic Support
          </p>

          <div className="mt-3 max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Doubt Sessions
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
              Get focused, faculty-led support for the modules
              you are learning — live when you need help, recorded
              when you want to revisit an explanation.
            </p>
          </div>

          <div className="mt-8 inline-flex rounded-2xl border border-white/10 bg-white/[0.07] p-1.5 backdrop-blur-xl">
            {[
              ["live", "Live Sessions"],
              ["recorded", "Recorded Sessions"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-xl px-5 py-3 text-xs font-black transition md:text-sm ${
                  activeTab === value
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {!studentBatch && !loading ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-2xl">
              ?
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Faculty support is being prepared
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Your batch has not been assigned yet. Once your
              batch is available, the relevant doubt sessions will
              appear here.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[440px] animate-pulse rounded-[2rem] bg-white shadow-sm"
              />
            ))}
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="text-5xl">
              {activeTab === "live" ? "◉" : "▶"}
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No {activeTab} doubt sessions yet
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Your faculty support area is ready. New sessions
              assigned to your batch will appear automatically.
            </p>
          </div>
        ) : (
          <>
            {activeTab === "live" &&
              upcomingLive.length > 0 && (
                <section className="mb-10">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                      Next support
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      Your upcoming doubt room
                    </h2>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-6 shadow-[0_20px_60px_rgba(124,58,237,0.08)] md:p-8">
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                      <div>
                        <div className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 shadow-sm">
                          Next session
                        </div>
                        <h3 className="mt-4 text-2xl font-black text-slate-950">
                          {upcomingLive[0].title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {upcomingLive[0].moduleName ||
                            upcomingLive[0].moduleId}{" "}
                          •{" "}
                          {upcomingLive[0].facultyName ||
                            "Faculty"}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Starts
                        </div>
                        <div className="mt-1 text-lg font-black">
                          {formatDate(getDoubtSessionStart(upcomingLive[0]))} • {formatTime(getDoubtSessionStart(upcomingLive[0]))}
                        </div>
                        <div className="mt-2 text-sm font-black text-violet-200 tabular-nums">
                          Starts in {formatCountdown(Math.max(getDoubtSessionStart(upcomingLive[0]).getTime() - now.getTime(), 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

            <section>
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                  {activeTab === "live"
                    ? "Live academic support"
                    : "On-demand academic support"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {activeTab === "live"
                    ? "Live Sessions"
                    : "Recorded Sessions"}
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleSessions.map(renderCard)}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
