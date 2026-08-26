import React, { useEffect, useMemo, useState } from "react";
import {
  deleteFaculty,
  listFaculties,
  updateFaculty,
} from "../services/facultyService";
import CreateFaculty from "./CreateFaculty";

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listFaculties({ activeOnly: false });
      setFaculties(data);
    } catch (loadError) {
      console.error("Faculty management loading failed:", loadError);
      setError(
        "Faculty records could not be loaded. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleFaculties = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return faculties.filter((faculty) => {
      if (activeOnly && !faculty.active) return false;
      if (!needle) return true;

      return [
        faculty.name,
        faculty.email,
        faculty.designation,
        faculty.bio,
        ...(faculty.expertise || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [faculties, search, activeOnly]);

  const activeCount = faculties.filter((faculty) => faculty.active).length;
  const expertiseCount = new Set(
    faculties.flatMap((faculty) => faculty.expertise || [])
  ).size;

  const handleCreated = (faculty) => {
    setFaculties((previous) =>
      [...previous, faculty].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setShowCreate(false);
  };

  const toggleActive = async (faculty) => {
    setBusyId(faculty.id);
    setError("");

    try {
      const updated = await updateFaculty(faculty.id, {
        ...faculty,
        active: !faculty.active,
      });

      setFaculties((previous) =>
        previous.map((item) =>
          item.id === faculty.id ? updated : item
        )
      );
    } catch (updateError) {
      console.error("Faculty status update failed:", updateError);
      setError("Faculty status could not be updated.");
    } finally {
      setBusyId("");
    }
  };

  const removeFaculty = async (faculty) => {
    const confirmed = window.confirm(
      `Delete ${faculty.name}'s faculty profile? This will not delete any existing session records.`
    );

    if (!confirmed) return;

    setBusyId(faculty.id);
    setError("");

    try {
      await deleteFaculty(faculty.id);
      setFaculties((previous) =>
        previous.filter((item) => item.id !== faculty.id)
      );
    } catch (deleteError) {
      console.error("Faculty deletion failed:", deleteError);
      setError("Faculty profile could not be deleted.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-2xl shadow-indigo-950/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
                People & Expertise
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Faculty Management
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80 sm:text-base">
                Build the faculty directory that powers your learning
                experience, live classes and future doubt-session
                assignments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-900 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              + Add Faculty
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Kpi label="Total Faculty" value={faculties.length} />
            <Kpi label="Active Faculty" value={activeCount} />
            <Kpi label="Expertise Areas" value={expertiseCount} />
          </div>
        </div>

        {showCreate && (
          <div className="mt-6">
            <CreateFaculty
              onCreated={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Faculty Directory
              </h2>
              <p className="text-sm text-slate-500">
                Manage profiles and availability without touching
                existing live-session records.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search faculty..."
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setActiveOnly((value) => !value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  activeOnly
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {activeOnly ? "Active Only" : "All Faculty"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-3xl bg-slate-100"
                />
              ))}
            </div>
          ) : visibleFaculties.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-5xl">👨‍🏫</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No faculty profiles yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your first faculty profile to start building the
                Synaptech faculty directory.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
              >
                Add First Faculty
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFaculties.map((faculty) => (
                <FacultyCard
                  key={faculty.id}
                  faculty={faculty}
                  busy={busyId === faculty.id}
                  onToggle={() => toggleActive(faculty)}
                  onDelete={() => removeFaculty(faculty)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function FacultyCard({ faculty, busy, onToggle, onDelete }) {
  const initials = faculty.name
    ? faculty.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "F";

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="h-24 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500" />

      <div className="-mt-10 px-5">
        <div className="flex items-end justify-between">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg">
            {faculty.photoURL ? (
              <img
                src={faculty.photoURL}
                alt={faculty.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-lg font-black text-white">
                {initials}
              </div>
            )}
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              faculty.active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {faculty.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="pb-5 pt-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            {faculty.name || "Unnamed Faculty"}
          </h3>
          <p className="mt-1 text-sm font-semibold text-indigo-600">
            {faculty.designation || "Faculty"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {faculty.email}
          </p>

          {faculty.bio && (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
              {faculty.bio}
            </p>
          )}

          {faculty.expertise?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {faculty.expertise.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {faculty.active ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
