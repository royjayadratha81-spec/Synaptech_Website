import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";

export default function Faculty() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const user = auth.currentUser;

        if (!user) {
          if (mounted) {
            setError("Please log in again to view your faculty.");
          }
          return;
        }

        /*
         * Resolve the student's authoritative profile.
         * The existing Learning Hub architecture uses students/{uid}.
         */
        const studentRef = doc(db, "students", user.uid);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
          if (mounted) {
            setFaculties([]);
            setError("Your student profile could not be found.");
          }
          return;
        }

        const studentData = studentSnap.data();
        const studentBatchId = String(studentData.batchId || "").trim();

        /*
         * No batch = no faculty should be displayed.
         */
        if (!studentBatchId) {
          if (mounted) {
            setFaculties([]);
          }
          return;
        }

        /*
         * Faculty assignments are batch-specific.
         * We query only this student's batch.
         *
         * Active status is filtered client-side so this query does not
         * require an additional Firestore composite index.
         */
        const assignmentSnapshot = await getDocs(
          query(
            collection(db, "facultyAssignments"),
            where("batchId", "==", studentBatchId)
          )
        );

        const assignedFacultyIds = [
          ...new Set(
            assignmentSnapshot.docs
              .map((assignmentDoc) => assignmentDoc.data())
              .filter((assignment) => assignment.active !== false)
              .map((assignment) => String(assignment.facultyId || "").trim())
              .filter(Boolean)
          ),
        ];

        /*
         * No faculty assigned to this batch.
         */
        if (assignedFacultyIds.length === 0) {
          if (mounted) {
            setFaculties([]);
          }
          return;
        }

        /*
         * Load active faculty profiles and keep only faculty IDs that
         * have an active assignment for the student's batch.
         */
        const facultySnapshot = await getDocs(
          collection(db, "faculties")
        );

        const assignedFaculty = facultySnapshot.docs
          .map((facultyDoc) => ({
            id: facultyDoc.id,
            ...facultyDoc.data(),
          }))
          .filter(
            (faculty) =>
              faculty.active !== false &&
              assignedFacultyIds.includes(String(faculty.id))
          )
          .sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || ""),
              undefined,
              { sensitivity: "base" }
            )
          );

        if (mounted) {
          setFaculties(assignedFaculty);
        }
      } catch (loadError) {
        console.error(
          "Batch-specific faculty directory loading failed:",
          loadError
        );

        if (mounted) {
          setFaculties([]);
          setError(
            "Faculty information could not be loaded right now."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    /*
     * Auth can already be available when the Faculty page opens,
     * but listening also handles the login state safely.
     */
    const unsubscribe = onAuthStateChanged(auth, () => {
      load();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) return faculties;

    return faculties.filter((faculty) =>
      [
        faculty.name,
        faculty.designation,
        faculty.bio,
        ...(faculty.expertise || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [faculties, search]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 px-6 py-9 text-white shadow-2xl shadow-indigo-950/20 sm:px-10">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
              Your Learning Network
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Meet your faculty
            </h1>
            <p className="mt-4 text-sm leading-7 text-blue-100/80 sm:text-base">
              Learn from the experts guiding your journey across
              technology, data, AI and industry-focused skills.
            </p>
          </div>

          <div className="mt-7 max-w-xl">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, expertise or subject..."
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm text-white outline-none backdrop-blur placeholder:text-blue-100/50 focus:border-white/40 focus:bg-white/15"
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-7 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-5xl">👨‍🏫</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {faculties.length === 0
                ? "Faculty yet to be assigned"
                : "No faculty found"}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {faculties.length === 0
                ? "Faculty has not yet been assigned to your batch. Please check back once your batch faculty allocation has been completed."
                : "No assigned faculty matches your search. Try another name, expertise or subject."}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((faculty) => (
              <button
                key={faculty.id}
                type="button"
                onClick={() => setSelected(faculty)}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-900/10"
              >
                <div className="h-28 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500" />

                <div className="-mt-12 px-5">
                  <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-xl">
                    {faculty.photoURL ? (
                      <img
                        src={faculty.photoURL}
                        alt={faculty.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xl font-black text-white">
                        {faculty.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="pb-6 pt-4">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {faculty.name}
                    </h2>

                    <p className="mt-1 font-semibold text-indigo-600">
                      {faculty.designation || "Faculty"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(faculty.expertise || [])
                        .slice(0, 4)
                        .map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold text-slate-400">
                        {faculty.experienceYears
                          ? `${faculty.experienceYears}+ years experience`
                          : "Faculty profile"}
                      </span>
                      <span className="text-sm font-bold text-indigo-600 transition group-hover:translate-x-1">
                        View profile →
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-32 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800" />

              <div className="-mt-16 px-6 pb-7 sm:px-8">
                <div className="flex items-end justify-between">
                  <div className="h-32 w-32 overflow-hidden rounded-[2rem] border-4 border-white bg-slate-100 shadow-xl">
                    {selected.photoURL ? (
                      <img
                        src={selected.photoURL}
                        alt={selected.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-3xl font-black text-white">
                        {selected.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="mb-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  {selected.name}
                </h2>
                <p className="mt-1 font-semibold text-indigo-600">
                  {selected.designation || "Faculty"}
                </p>

                {selected.expertise?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selected.expertise.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <Info
                    label="Experience"
                    value={
                      selected.experienceYears
                        ? `${selected.experienceYears}+ years`
                        : "Not specified"
                    }
                  />
                  <Info
                    label="Email"
                    value={selected.email || "Not available"}
                  />
                </div>

                {selected.bio && (
                  <div className="mt-7">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
                      About
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {selected.bio}
                    </p>
                  </div>
                )}

                {selected.linkedinUrl && (
                  <a
                    href={selected.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    View professional profile →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
