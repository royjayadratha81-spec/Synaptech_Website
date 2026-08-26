import { useState, useEffect } from "react";

import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export default function CreateLiveSession() {
  const [title, setTitle] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(180);

/*
 * Meeting provider abstraction.
 *
 * We are deliberately not locking Synaptech
 * to Google Meet, Teams, Webex or Zoom.
 */
const [meetingProvider, setMeetingProvider] = useState("");
const [meetingUrl, setMeetingUrl] = useState("");
const [meetingId, setMeetingId] = useState("");

  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState([]);

  const [moduleId, setModuleId] = useState("");
  const [modules, setModules] = useState([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchModules();
  }, []);

  const fetchBatches = async () => {
    try {
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
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchModules = async () => {
    try {
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
        (a, b) =>
          (a.moduleOrder || 0) -
          (b.moduleOrder || 0)
      );

      setModules(moduleList);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (
        !title ||
        !date ||
        !time ||
        !batchId ||
        !moduleId ||
        !durationMinutes
      ) {
        alert("Please fill all session details.");
        return;
      }

      const startDate = new Date(`${date}T${time}`);

      if (Number.isNaN(startDate.getTime())) {
        alert("Invalid date or time.");
        return;
      }

      setSaving(true);

      /*
       * IMPORTANT:
       *
       * expectedEndDate is only an estimated end.
       * It does NOT determine when the session ends.
       *
       * The actual session will remain LIVE until
       * admin/faculty explicitly ends it.
       */

      const expectedEndDate = new Date(
        startDate.getTime() +
          Number(durationMinutes) * 60 * 1000
      );

      const sessionData = {
        title,

        sessionNumber: sessionNumber
          ? Number(sessionNumber)
          : null,

        date,
        time,

        /*
 * Meeting provider abstraction.
 *
 * These fields are intentionally provider-neutral.
 * They can later support Google Meet, Teams,
 * Webex, Zoom or another provider.
 */
meetingProvider: meetingProvider || null,
meetingUrl: meetingUrl || null,
meetingId: meetingId || null,

/*
 * Legacy compatibility:
 * Existing Google Meet records can continue
 * using meetLink until the provider migration
 * is completed.
 */
meetLink: meetingUrl || null,

        batchId,
        moduleId,

        durationMinutes: Number(durationMinutes),

        expectedDurationMinutes:
          Number(durationMinutes),

        scheduledStartAt:
          Timestamp.fromDate(startDate),

        /*
         * Existing compatibility fields
         */
        startAt:
          Timestamp.fromDate(startDate),

        expectedEndAt:
          Timestamp.fromDate(expectedEndDate),

        endAt:
          Timestamp.fromDate(expectedEndDate),

        /*
         * Session lifecycle
         */
        status: "scheduled",

        actualStartAt: null,
        actualEndAt: null,

        /*
         * Recording relationship
         */
        recordingId: null,

        active: true,

createdAt: Timestamp.now(),
updatedAt: Timestamp.now(),
      };

      console.log(
        "Creating live session:",
        sessionData
      );

      await addDoc(
        collection(db, "liveSessions"),
        sessionData
      );

      alert("Live Session Created Successfully");

      setTitle("");
      setSessionNumber("");
      setDate("");
      setTime("");
      setDurationMinutes(180);

setMeetingProvider("");
setMeetingUrl("");
setMeetingId("");

setBatchId("");
setModuleId("");

    } catch (error) {
      console.error(
        "Error creating session:",
        error
      );

      alert(
        "Error creating session. Please check the console."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedBatch = batches.find(
    (batch) => batch.id === batchId
  );

  const selectedModule = modules.find(
    (module) => module.id === moduleId
  );

  const formatDuration = () => {
    const hours = Math.floor(
      Number(durationMinutes) / 60
    );

    const minutes =
      Number(durationMinutes) % 60;

    if (hours && minutes) {
      return `${hours} hr ${minutes} min`;
    }

    if (hours) {
      return `${hours} hour${
        hours > 1 ? "s" : ""
      }`;
    }

    return `${minutes} minutes`;
  };

  const formatPreviewDate = () => {
    if (!date) return "Select a date";

    const d = new Date(`${date}T00:00:00`);

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-800 to-violet-800 text-white">

        {/* Decorative circles */}

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />

        <div className="absolute -left-20 bottom-[-120px] h-72 w-72 rounded-full bg-blue-400/10" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">

          <div className="mb-5 flex items-center gap-2 text-sm text-blue-100">
            <span>Synaptech LMS</span>
            <span className="opacity-60">/</span>
            <span>Admin</span>
            <span className="opacity-60">/</span>
            <span className="font-medium text-white">
              Live Sessions
            </span>
          </div>

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live Classroom Management
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Create Live Session
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
                Schedule a premium live learning experience
                for your students with module-wise and
                batch-wise session management.
              </p>

            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-5 backdrop-blur-md">

              <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Session Lifecycle
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm">

                <span className="rounded-full bg-white/15 px-3 py-1.5">
                  Scheduled
                </span>

                <span className="text-blue-200">
                  →
                </span>

                <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-emerald-200">
                  Live
                </span>

                <span className="text-blue-200">
                  →
                </span>

                <span className="rounded-full bg-white/15 px-3 py-1.5">
                  Ended
                </span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* =================================================
              FORM
          ================================================== */}

          <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">

            {/* Header */}

            <div className="border-b border-slate-100 px-7 py-6">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  🎥
                </div>

                <div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Session Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Configure the classroom before publishing
                    it to the selected batch.
                  </p>

                </div>

              </div>

            </div>


            <div className="space-y-8 p-7">

              {/* -------------------------------------------
                  BASIC INFORMATION
              -------------------------------------------- */}

              <div>

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
                    1
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Basic Information
                    </h3>

                    <p className="text-xs text-slate-500">
                      Identify the live class.
                    </p>
                  </div>

                </div>


                <div className="grid gap-5 md:grid-cols-[1fr_150px]">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Session Title
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Python Fundamentals - Day 4"
                      value={title}
                      onChange={(e) =>
                        setTitle(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Session No.
                    </label>

                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 4"
                      value={sessionNumber}
                      onChange={(e) =>
                        setSessionNumber(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                  </div>

                </div>

              </div>


              {/* -------------------------------------------
                  SCHEDULE
              -------------------------------------------- */}

              <div>

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                    2
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Schedule
                    </h3>

                    <p className="text-xs text-slate-500">
                      Set when the classroom is scheduled
                      to begin.
                    </p>
                  </div>

                </div>


                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Date
                    </label>

                    <div className="relative">

                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                        📅
                      </span>

                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          setDate(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      />

                    </div>

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Start Time
                    </label>

                    <div className="relative">

                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                        🕐
                      </span>

                      <input
                        type="time"
                        value={time}
                        onChange={(e) =>
                          setTime(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      />

                    </div>

                  </div>

                </div>


                <div className="mt-5">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expected Duration
                  </label>

                  <select
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value={60}>
                      1 Hour
                    </option>

                    <option value={90}>
                      1 Hour 30 Minutes
                    </option>

                    <option value={120}>
                      2 Hours
                    </option>

                    <option value={150}>
                      2 Hours 30 Minutes
                    </option>

                    <option value={180}>
                      3 Hours
                    </option>

                    <option value={210}>
                      3 Hours 30 Minutes
                    </option>

                    <option value={240}>
                      4 Hours
                    </option>

                    <option value={270}>
                      4 Hours 30 Minutes
                    </option>

                    <option value={300}>
                      5 Hours
                    </option>

                  </select>

                  <div className="mt-3 flex gap-3 rounded-xl bg-amber-50 p-4">

                    <span className="text-lg">
                      💡
                    </span>

                    <p className="text-xs leading-5 text-amber-800">
                      This is only the expected duration.
                      The live classroom will remain active
                      until the administrator or faculty
                      explicitly ends the session.
                    </p>

                  </div>

                </div>

              </div>


              {/* -------------------------------------------
                  BATCH & MODULE
              -------------------------------------------- */}

              <div>

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700">
                    3
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Learning Assignment
                    </h3>

                    <p className="text-xs text-slate-500">
                      Assign this session to a batch and
                      module.
                    </p>
                  </div>

                </div>


                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Student Batch
                    </label>

                    <select
                      value={batchId}
                      onChange={(e) =>
                        setBatchId(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >

                      <option value="">
                        Select Batch
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

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Academic Module
                    </label>

                    <select
                      value={moduleId}
                      onChange={(e) =>
                        setModuleId(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
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

                </div>

              </div>


              {/* -------------------------------------------
    MEETING PLATFORM
-------------------------------------------- */}

<div>

  <div className="mb-5 flex items-center gap-3">

    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
      4
    </div>

    <div>
      <h3 className="font-bold text-slate-900">
        Virtual Classroom
      </h3>

      <p className="text-xs text-slate-500">
        Configure the meeting platform for this live classroom.
      </p>
    </div>

  </div>

  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">

    {/* Platform Header */}

    <div className="mb-5 flex items-center gap-3">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
        <span className="text-xl">
          🎥
        </span>
      </div>

      <div>

        <p className="font-semibold text-slate-900">
          Meeting Platform
        </p>

        <p className="text-xs text-slate-500">
          Select a provider when available. The LMS remains
          independent of the meeting platform.
        </p>

      </div>

    </div>


    {/* Meeting Provider */}

    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        Meeting Provider
      </label>

      <select
        value={meetingProvider}
        onChange={(e) =>
          setMeetingProvider(e.target.value)
        }
        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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


    {/* Meeting URL */}

    <div className="mt-4">

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        Meeting URL
      </label>

      <input
        type="text"
        placeholder="Meeting URL — optional until provider is configured"
        value={meetingUrl}
        onChange={(e) =>
          setMeetingUrl(e.target.value)
        }
        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />

    </div>


    {/* Meeting ID */}

    <div className="mt-4">

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        Meeting ID
      </label>

      <input
        type="text"
        placeholder="Meeting ID — optional"
        value={meetingId}
        onChange={(e) =>
          setMeetingId(e.target.value)
        }
        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />

    </div>


    {/* Provider Independence Notice */}

    <div className="mt-4 rounded-xl border border-emerald-100 bg-white/70 p-4">

      <div className="flex gap-3">

        <span className="text-lg">
          🔗
        </span>

        <p className="text-xs leading-5 text-slate-600">

          The Synaptech LMS is independent of the meeting
          provider. You can connect Google Meet, Microsoft
          Teams, Webex, Zoom or another supported platform
          later.

        </p>

      </div>

    </div>

  </div>

</div>


              {/* -------------------------------------------
                  CREATE BUTTON
              -------------------------------------------- */}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >

                <span className="relative z-10 flex items-center justify-center gap-3">

                  {saving ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      🚀
                      Create Live Session
                    </>
                  )}

                </span>

              </button>

            </div>

          </section>


          {/* =================================================
              LIVE PREVIEW
          ================================================== */}

          <aside className="space-y-6">

            {/* Preview Card */}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">

              <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white">

                <div className="mb-6 flex items-center justify-between">

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                    Student Preview
                  </span>

                  <span className="flex items-center gap-2 text-xs text-emerald-300">

                    <span className="h-2 w-2 rounded-full bg-emerald-400" />

                    Upcoming

                  </span>

                </div>


                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur">
                  🎓
                </div>


                <h3 className="text-2xl font-bold">
                  {title ||
                    "Your Live Session"}
                </h3>

                <p className="mt-2 text-sm text-blue-200">
                  {selectedModule?.moduleName ||
                    "Select a module"}
                </p>

              </div>


              <div className="space-y-5 p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                    📅
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Scheduled
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatPreviewDate()}
                    </p>
                  </div>

                </div>


                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                    🕐
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Start Time
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {time || "--:--"}
                    </p>
                  </div>

                </div>


                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                    ⏱️
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Expected Duration
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDuration()}
                    </p>
                  </div>

                </div>


                <div className="border-t border-slate-100 pt-5">

                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Batch
                  </p>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                    {selectedBatch?.batchName ||
                      "No batch selected"}
                  </div>

                </div>


                <div>

                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Module
                  </p>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                    {selectedModule?.moduleName ||
                      "No module selected"}
                  </div>

                </div>

              </div>

            </div>


            {/* Lifecycle Information */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                  ℹ️
                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    How it works
                  </h3>

                  <p className="text-xs text-slate-500">
                    Session lifecycle
                  </p>

                </div>

              </div>


              <div className="space-y-4">

                <div className="flex gap-3">

                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-500" />

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Scheduled
                    </p>

                    <p className="text-xs leading-5 text-slate-500">
                      Students see a countdown until
                      the scheduled start time.
                    </p>

                  </div>

                </div>


                <div className="flex gap-3">

                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-500" />

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Live
                    </p>

                    <p className="text-xs leading-5 text-slate-500">
                      Faculty/admin starts the session
                      and students can join.
                    </p>

                  </div>

                </div>


                <div className="flex gap-3">

                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-slate-400" />

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Ended
                    </p>

                    <p className="text-xs leading-5 text-slate-500">
                      Faculty/admin ends the session.
                      Attendance remains linked to the
                      same session.
                    </p>

                  </div>

                </div>


                <div className="flex gap-3">

                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-500" />

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Recording
                    </p>

                    <p className="text-xs leading-5 text-slate-500">
                      The recording can subsequently be
                      linked to this live session.
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* Important Note */}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

              <div className="flex gap-3">

                <span className="text-xl">
                  ⚠️
                </span>

                <div>

                  <h4 className="text-sm font-bold text-amber-900">
                    Important
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    The expected duration does not
                    automatically end the classroom.
                    The actual end time will be recorded
                    when the faculty or administrator
                    explicitly ends the session.

                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
}