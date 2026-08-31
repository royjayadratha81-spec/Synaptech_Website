import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  createDoubtSession,
} from "../services/doubtSessionService";

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

const modulesFallback = [
  "PYTHON",
  "NUMPY",
  "PANDAS",
  "DATA_VISUALIZATION",
  "STATISTICS",
  "SQL",
  "POWER_BI",
  "TABLEAU",
  "MACHINE_LEARNING",
  "DEEP_LEARNING",
  "NLP",
  "COMPUTER_VISION",
  "GENAI",
  "AGENTIC_AI",
  "MLOPS",
  "CAPSTONE_PROJECT",
];

const formatModuleName = (module) =>
  module?.moduleName ||
  module?.name ||
  String(module?.id || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CreateDoubtSession() {
  const [sessionType, setSessionType] = useState("live");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [faculties, setFaculties] = useState([]);

  const [batchId, setBatchId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [facultyId, setFacultyId] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [meetingProvider, setMeetingProvider] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");

  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingPlatform, setRecordingPlatform] =
    useState("external");

  const [saving, setSaving] = useState(false);
  const [loadingReferenceData, setLoadingReferenceData] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadReferenceData = async () => {
      try {
        setLoadingReferenceData(true);
        setError("");

        const [batchSnapshot, moduleSnapshot, facultySnapshot] =
          await Promise.all([
            getDocs(collection(db, "batches")),
            getDocs(
              query(
                collection(db, "modules"),
                orderBy("moduleOrder", "asc")
              )
            ),
            getDocs(collection(db, "faculties")),
          ]);

        if (cancelled) return;

        const batchList = batchSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) =>
            String(a.batchName || a.name || a.id).localeCompare(
              String(b.batchName || b.name || b.id),
              undefined,
              { numeric: true, sensitivity: "base" }
            )
          );

        const moduleList = moduleSnapshot.docs
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
          );

        const facultyList = facultySnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => item.active !== false)
          .sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || ""),
              undefined,
              { sensitivity: "base" }
            )
          );

        setBatches(batchList);
        setModules(
          moduleList.length > 0
            ? moduleList
            : modulesFallback.map((id, index) => ({
                id,
                moduleName: formatModuleName({ id }),
                moduleOrder: index + 1,
              }))
        );
        setFaculties(facultyList);
      } catch (loadError) {
        console.error(
          "Error loading doubt-session reference data:",
          loadError
        );
        setError(
          "Some reference data could not be loaded. Please refresh and try again."
        );
      } finally {
        if (!cancelled) {
          setLoadingReferenceData(false);
        }
      }
    };

    loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBatch = useMemo(
    () =>
      batches.find(
        (item) => String(item.id) === String(batchId)
      ) || null,
    [batches, batchId]
  );

  const selectedModule = useMemo(
    () =>
      modules.find(
        (item) => String(item.id) === String(moduleId)
      ) || null,
    [modules, moduleId]
  );

  const selectedFaculty = useMemo(
    () =>
      faculties.find(
        (item) => String(item.id) === String(facultyId)
      ) || null,
    [faculties, facultyId]
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBatchId("");
    setModuleId("");
    setFacultyId("");
    setDate("");
    setTime("");
    setMeetingProvider("");
    setMeetingUrl("");
    setMeetingId("");
    setRecordingUrl("");
    setRecordingPlatform("external");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createDoubtSession({
        title,
        description,
        sessionType,

        batchId,
        batchName:
          selectedBatch?.batchName ||
          selectedBatch?.name ||
          batchId,

        moduleId,
        moduleName:
          selectedModule?.moduleName ||
          selectedModule?.name ||
          moduleId,

        facultyId,
        facultyName: selectedFaculty?.name || "",
        facultyEmail: selectedFaculty?.email || "",
        facultyPhotoURL:
          selectedFaculty?.photoURL || "",

        date,
        time,

        meetingProvider,
        meetingUrl,
        meetingId,

        recordingUrl,
        recordingPlatform,
      });

      window.alert(
        "Doubt session created successfully."
      );
      resetForm();
    } catch (saveError) {
      console.error(
        "Error creating doubt session:",
        saveError
      );
      setError(
        saveError?.message ||
          "The doubt session could not be created."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-violet-300">
              Synaptech Academic Network
            </p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Create a Doubt Session
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Create a premium faculty-led doubt experience and
              target it precisely to a batch and one of the
              academic modules.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Targeted", "Batch + module specific"],
              ["02", "Faculty-led", "Assign an active faculty"],
              ["03", "Independent", "No assessment or attendance impact"],
            ].map(([number, titleText, body]) => (
              <div
                key={number}
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl"
              >
                <div className="text-xs font-bold text-violet-300">
                  {number}
                </div>
                <div className="mt-2 font-bold">{titleText}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                  Session identity
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  What should students see?
                </h2>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Session title
                  </label>
                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    className={fieldClass}
                    placeholder="e.g. Pandas Doubt Clinic — Data Cleaning"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    className={`${fieldClass} min-h-32 resize-y`}
                    placeholder="Briefly explain what students can bring to this doubt session."
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold text-slate-700">
                    Session format
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        value: "live",
                        title: "Live Doubt Session",
                        description:
                          "Faculty-led live interaction with a meeting link.",
                      },
                      {
                        value: "recorded",
                        title: "Recorded Doubt Session",
                        description:
                          "A recorded explanation students can watch later.",
                      },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() =>
                          setSessionType(option.value)
                        }
                        className={`rounded-2xl border p-5 text-left transition ${
                          sessionType === option.value
                            ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-black text-slate-900">
                              {option.title}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {option.description}
                            </div>
                          </div>
                          <span className="text-xl">
                            {option.value === "live"
                              ? "◉"
                              : "▶"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                Publishing preview
              </p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl">
                    ?
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black">
                      {title || "Doubt Session"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {selectedModule?.moduleName ||
                        "Select module"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <div className="text-[10px] uppercase text-slate-500">
                      Batch
                    </div>
                    <div className="mt-1 truncate text-xs font-bold">
                      {selectedBatch?.batchName ||
                        "Not selected"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <div className="text-[10px] uppercase text-slate-500">
                      Faculty
                    </div>
                    <div className="mt-1 truncate text-xs font-bold">
                      {selectedFaculty?.name ||
                        "Not selected"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-xs leading-6 text-slate-400">
                This new subsystem writes only to the
                <span className="font-bold text-slate-200">
                  {" "}doubtSessions
                </span>
                {" "}collection. Existing live-class,
                attendance and assessment records are not modified.
              </div>
            </aside>
          </div>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
                Academic targeting
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Batch, module & faculty
              </h2>
            </div>

            {loadingReferenceData ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Student batch
                  </label>
                  <select
                    value={batchId}
                    onChange={(event) =>
                      setBatchId(event.target.value)
                    }
                    className={fieldClass}
                    required
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchName ||
                          batch.name ||
                          batch.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Academic module
                  </label>
                  <select
                    value={moduleId}
                    onChange={(event) =>
                      setModuleId(event.target.value)
                    }
                    className={fieldClass}
                    required
                  >
                    <option value="">Select module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {formatModuleName(module)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Assigned faculty
                  </label>
                  <select
                    value={facultyId}
                    onChange={(event) =>
                      setFacultyId(event.target.value)
                    }
                    className={fieldClass}
                    required
                  >
                    <option value="">Select faculty</option>
                    {faculties.map((faculty) => (
                      <option
                        key={faculty.id}
                        value={faculty.id}
                      >
                        {faculty.name}
                      </option>
                    ))}
                  </select>

                  {faculties.length === 0 && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      No active faculty profiles are available.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                Delivery
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Schedule the experience
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className={fieldClass}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(event) =>
                    setTime(event.target.value)
                  }
                  className={fieldClass}
                  required
                />
              </div>
            </div>

            {sessionType === "live" ? (
              <div className="mt-6 rounded-3xl border border-violet-100 bg-violet-50/60 p-5">
                <div className="mb-5">
                  <div className="font-black text-slate-900">
                    Live classroom connection
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    The LMS stores the meeting reference; it does
                    not become dependent on a particular provider.
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Provider
                    </label>
                    <select
                      value={meetingProvider}
                      onChange={(event) =>
                        setMeetingProvider(event.target.value)
                      }
                      className={fieldClass}
                    >
                      <option value="">
                        Provider not selected
                      </option>
                      <option value="google_meet">
                        Google Meet
                      </option>
                      <option value="microsoft_teams">
                        Microsoft Teams
                      </option>
                      <option value="webex">
                        Cisco Webex
                      </option>
                      <option value="zoom">
                        Zoom
                      </option>
                      <option value="other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Meeting URL
                    </label>
                    <input
                      value={meetingUrl}
                      onChange={(event) =>
                        setMeetingUrl(event.target.value)
                      }
                      className={fieldClass}
                      placeholder="https://..."
                      type="url"
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Meeting ID (optional)
                    </label>
                    <input
                      value={meetingId}
                      onChange={(event) =>
                        setMeetingId(event.target.value)
                      }
                      className={fieldClass}
                      placeholder="Optional provider meeting ID"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-cyan-100 bg-cyan-50/60 p-5">
                <div className="mb-5">
                  <div className="font-black text-slate-900">
                    Recorded session
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Use the existing recording destination for now.
                    File/video storage can be connected separately
                    without touching this new data model.
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Platform
                    </label>
                    <select
                      value={recordingPlatform}
                      onChange={(event) =>
                        setRecordingPlatform(
                          event.target.value
                        )
                      }
                      className={fieldClass}
                    >
                      <option value="external">
                        External link
                      </option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Recording URL
                    </label>
                    <input
                      value={recordingUrl}
                      onChange={(event) =>
                        setRecordingUrl(event.target.value)
                      }
                      className={fieldClass}
                      placeholder="https://..."
                      type="url"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={saving || loadingReferenceData}
                className="rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Publishing session..."
                  : "Create Doubt Session"}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
