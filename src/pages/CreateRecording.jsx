import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function CreateRecording() {

  const [title, setTitle] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [duration, setDuration] = useState("");
  const [platform, setPlatform] = useState("");
  const [batchId, setBatchId] = useState("");
const [moduleId, setModuleId] = useState("");

const [batches, setBatches] = useState([]);
const [modules, setModules] = useState([]);
useEffect(() => {

  fetchBatches();
  fetchModules();

}, []);

const fetchBatches = async () => {

  const snapshot = await getDocs(
    collection(db, "batches")
  );

  const batchList = [];

  snapshot.forEach((docItem) => {

    batchList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  setBatches(batchList);

};

const fetchModules = async () => {

  const snapshot = await getDocs(
    collection(db, "modules")
  );

  const moduleList = [];

  snapshot.forEach((docItem) => {

    moduleList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  moduleList.sort(
    (a, b) => a.moduleOrder - b.moduleOrder
  );

  setModules(moduleList);

};

  const handleSubmit = async () => {

    try {

      await addDoc(
  collection(db, "recordedSessions"),
  {
    title,
    batchId,
    moduleId,
    videoLink,
    duration,
    platform,
    active: true,
  }
);

      alert("Recording Added Successfully");

      setTitle("");
setBatchId("");
setModuleId("");
setVideoLink("");
setDuration("");
setPlatform("");

    } catch (error) {

      console.error(error);
      alert("Error Adding Recording");

    }

  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -left-24 bottom-[-150px] h-80 w-80 rounded-full bg-cyan-400/10" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="mb-5 flex items-center gap-2 text-sm text-blue-200">
            <span>Synaptech LMS</span>
            <span className="opacity-50">/</span>
            <span>Admin</span>
            <span className="opacity-50">/</span>
            <span className="font-semibold text-white">Recorded Sessions</span>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Learning Content Management
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Create Recording
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
                Publish recorded classroom sessions for the right batch and module,
                with a clean student-ready playback experience.
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                Publishing Flow
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-1.5">Details</span>
                <span className="text-blue-300">→</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">Audience</span>
                <span className="text-blue-300">→</span>
                <span className="rounded-full bg-cyan-400/20 px-3 py-1.5 text-cyan-200">Publish</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 px-7 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">▶️</div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Recording Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Add the playback link and map the recording to its academic context.</p>
                </div>
              </div>
            </div>

            <div className="space-y-8 p-7">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">1</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Basic Information</h3>
                    <p className="text-xs text-slate-500">Identify the recorded classroom session.</p>
                  </div>
                </div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Recording Title</label>
                <input
                  type="text"
                  placeholder="e.g. Python — Functions & Modules"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-black text-blue-700">2</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Academic Mapping</h3>
                    <p className="text-xs text-slate-500">Choose who should see this recording.</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Batch</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Select Batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>{batch.batchName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Module</label>
                    <select
                      value={moduleId}
                      onChange={(e) => setModuleId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Select Module</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>{module.moduleName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-sm font-black text-cyan-700">3</div>
                  <div>
                    <h3 className="font-bold text-slate-900">Playback Information</h3>
                    <p className="text-xs text-slate-500">Provide the existing recording location and metadata.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Recording Link</label>
                    <input
                      type="text"
                      placeholder="Google Meet / Zoom / Webex / Drive link"
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Duration</label>
                      <input
                        type="text"
                        placeholder="Example: 1h 30m"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Platform</label>
                      <input
                        type="text"
                        placeholder="Google Meet / Zoom / Webex"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs leading-5 text-slate-500">
                  Publishing keeps the existing <span className="font-bold text-slate-700">recordedSessions</span> data flow intact.
                </div>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span>▶</span>
                  Upload Recording
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">🎬</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Publishing Preview</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Student-ready recording</h3>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Title</p>
                <p className="mt-1 font-bold text-slate-900">{title || "Your recording title"}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Batch</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-700">{batches.find((b) => b.id === batchId)?.batchName || "Not selected"}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Module</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-700">{modules.find((m) => m.id === moduleId)?.moduleName || "Not selected"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Quick Check</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Title</span><span className={title ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>{title ? "Ready" : "Missing"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Batch</span><span className={batchId ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>{batchId ? "Selected" : "Missing"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Module</span><span className={moduleId ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>{moduleId ? "Selected" : "Missing"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Playback link</span><span className={videoLink ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>{videoLink ? "Added" : "Missing"}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );

}
