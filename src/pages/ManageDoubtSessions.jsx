import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  deleteDoubtSession,
  endDoubtSession,
  getDoubtSessionStatus,
  getDoubtSessionStart,
  startDoubtSession,
  subscribeToDoubtSessions,
  updateDoubtSession,
} from "../services/doubtSessionService";

const formatDate = (value) => {
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

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

const formatElapsed = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  return formatCountdown(milliseconds);
};


export default function ManageDoubtSessions() {
  const [sessions, setSessions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    const loadReferenceData = async () => {
      try {
        const [batchSnapshot, moduleSnapshot] =
          await Promise.all([
            getDocs(collection(db, "batches")),
            getDocs(
              query(
                collection(db, "modules"),
                orderBy("moduleOrder", "asc")
              )
            ),
          ]);

        if (cancelled) return;

        setBatches(
          batchSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        setModules(
          moduleSnapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter(
              (item) =>
                String(item.moduleName || "")
                  .trim()
                  .toLowerCase() !==
                "interview questions & answers"
            )
        );
      } catch (referenceError) {
        console.error(
          "Error loading doubt-session filters:",
          referenceError
        );
      }
    };

    loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToDoubtSessions(
      (data) => {
        setSessions(data);
        setLoading(false);
      },
      { activeOnly: false }
    );

    return () => unsubscribe();
  }, []);

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (
        selectedBatch !== "all" &&
        session.batchId !== selectedBatch
      ) {
        return false;
      }

      if (
        selectedModule !== "all" &&
        session.moduleId !== selectedModule
      ) {
        return false;
      }

      if (
        selectedType !== "all" &&
        session.sessionType !== selectedType
      ) {
        return false;
      }

      if (!term) return true;

      return [
        session.title,
        session.description,
        session.batchName,
        session.moduleName,
        session.facultyName,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [
    sessions,
    selectedBatch,
    selectedModule,
    selectedType,
    search,
  ]);

  const counts = useMemo(() => {
    return {
      total: sessions.length,
      live: sessions.filter(
        (item) => item.sessionType === "live"
      ).length,
      recorded: sessions.filter(
        (item) => item.sessionType === "recorded"
      ).length,
      active: sessions.filter(
        (item) => item.active !== false
      ).length,
    };
  }, [sessions]);

  const handleStart = async (session) => {
    const confirmed = window.confirm(
      `Start "${session.title}" now?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(`start-${session.id}`);
      await startDoubtSession(session.id);
    } catch (actionError) {
      console.error("Error starting doubt session:", actionError);
      setError(
        actionError?.message ||
          "The doubt session could not be started."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleEnd = async (session) => {
    const confirmed = window.confirm(
      `End "${session.title}" now?\n\nThe live doubt room will close for students. The scheduled duration will NOT force the session to end.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(`end-${session.id}`);
      await endDoubtSession(session.id);
    } catch (actionError) {
      console.error("Error ending doubt session:", actionError);
      setError(
        actionError?.message ||
          "The doubt session could not be ended."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleToggleActive = async (session) => {
    try {
      setActionLoading(`toggle-${session.id}`);

      await updateDoubtSession(session.id, {
        active: session.active === false,
      });
    } catch (actionError) {
      console.error(
        "Error updating doubt session:",
        actionError
      );
      setError(
        "The session status could not be updated."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (session) => {
    const confirmed = window.confirm(
      `Delete "${session.title}"?\n\nThis removes only the doubt-session record. Existing live-class, attendance and assessment data are not affected.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(`delete-${session.id}`);
      await deleteDoubtSession(session.id);
    } catch (deleteError) {
      console.error(
        "Error deleting doubt session:",
        deleteError
      );
      setError(
        "The doubt session could not be deleted."
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">
            Academic Experience Control
          </p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Doubt Sessions
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Manage live and recorded doubt experiences
                without touching the existing assessment or
                attendance architecture.
              </p>
            </div>

            <a
              href="/admin/create-doubt-session"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-0.5"
            >
              + Create Doubt Session
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total", counts.total, "All doubt experiences"],
              ["Live", counts.live, "Live session records"],
              ["Recorded", counts.recorded, "Recorded resources"],
              ["Active", counts.active, "Visible to students"],
            ].map(([label, value, subtitle]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </div>
                <div className="mt-1 text-2xl font-black">
                  {value}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {subtitle}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search title, faculty, batch..."
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 md:col-span-2"
            />

            <select
              value={selectedBatch}
              onChange={(event) =>
                setSelectedBatch(event.target.value)
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500"
            >
              <option value="all">All batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchName ||
                    batch.name ||
                    batch.id}
                </option>
              ))}
            </select>

            <select
              value={selectedModule}
              onChange={(event) =>
                setSelectedModule(event.target.value)
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500"
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.moduleName || module.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["all", "All formats"],
              ["live", "Live"],
              ["recorded", "Recorded"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  selectedType === value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6">
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-[2rem] bg-white shadow-sm"
                />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
              <div className="text-5xl">?</div>
              <h2 className="mt-5 text-2xl font-black text-slate-900">
                No doubt sessions found
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Create your first doubt experience or change
                the filters above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredSessions.map((session) => {
                const status =
                  getDoubtSessionStatus(session);
                const start =
                  getDoubtSessionStart(session);

                return (
                  <article
                    key={session.id}
                    className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.10)]"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                              {session.sessionType}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                                session.active === false
                                  ? "bg-slate-100 text-slate-500"
                                  : status === "live"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-cyan-50 text-cyan-700"
                              }`}
                            >
                              {session.active === false
                                ? "Hidden"
                                : status}
                            </span>
                          </div>

                          <h2 className="mt-4 text-xl font-black text-slate-950">
                            {session.title}
                          </h2>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {session.description ||
                              "Faculty-led academic doubt support."}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                          {session.facultyPhotoURL ? (
                            <img
                              src={session.facultyPhotoURL}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-black">
                              {(session.facultyName || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Faculty
                          </div>
                          <div className="mt-1 truncate text-sm font-black text-slate-800">
                            {session.facultyName || "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Module
                          </div>
                          <div className="mt-1 truncate text-sm font-black text-slate-800">
                            {session.moduleName ||
                              session.moduleId ||
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Batch
                          </div>
                          <div className="mt-1 truncate text-sm font-black text-slate-800">
                            {session.batchName ||
                              session.batchId ||
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Schedule
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-800">
                            {start
                              ? `${formatDate(start)} • ${formatTime(start)}`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {session.sessionType === "live" && (
                        <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-violet-500">
                                Session control
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                {status === "scheduled"
                                  ? "Waiting for faculty to start"
                                  : status === "live"
                                  ? "Faculty-controlled live session"
                                  : "Ended manually by faculty"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black tabular-nums text-slate-950">
                                {status === "scheduled" && start
                                  ? formatCountdown(start.getTime() - now.getTime())
                                  : status === "live" && session.actualStartAt
                                  ? formatElapsed(now.getTime() - new Date(session.actualStartAt?.toDate ? session.actualStartAt.toDate() : session.actualStartAt).getTime())
                                  : "—"}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {status === "scheduled" ? "Countdown" : status === "live" ? "Live duration" : "Completed"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap justify-end gap-2">
                        {session.sessionType === "live" &&
                          status === "scheduled" && (
                            <button
                              type="button"
                              disabled={
                                actionLoading ===
                                `start-${session.id}`
                              }
                              onClick={() => handleStart(session)}
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                            >
                              {actionLoading === `start-${session.id}`
                                ? "Starting..."
                                : "▶ Start Doubt Session"}
                            </button>
                          )}

                        {session.sessionType === "live" &&
                          status === "live" && (
                            <>
                              {session.meetingUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      session.meetingUrl,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-700 hover:bg-cyan-100"
                                >
                                  🎥 Open Meeting
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `end-${session.id}`
                                }
                                onClick={() => handleEnd(session)}
                                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-red-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                              >
                                {actionLoading === `end-${session.id}`
                                  ? "Ending..."
                                  : "■ End Doubt Session"}
                              </button>
                            </>
                          )}

                        {session.sessionType === "live" &&
                          status === "ended" && (
                            <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-500">
                              Session Ended • Recording {
                                session.recordingStatus === "pending"
                                  ? "Processing"
                                  : "Available"
                              }
                            </div>
                          )}

                        {session.sessionType === "recorded" && (
                          <button
                            type="button"
                            disabled={
                              actionLoading ===
                              `toggle-${session.id}`
                            }
                            onClick={() =>
                              handleToggleActive(session)
                            }
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {session.active === false
                              ? "Publish to students"
                              : "Unpublish from students"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            `delete-${session.id}`
                          }
                          onClick={() => handleDelete(session)}
                          className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading === `delete-${session.id}`
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
