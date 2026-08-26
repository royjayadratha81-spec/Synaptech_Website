import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const facultyName = (faculty) =>
  faculty?.name || faculty?.email || faculty?.id || "Unnamed Faculty";

const batchName = (batch) =>
  batch?.batchName || batch?.id || "Unnamed Batch";

const moduleName = (module) =>
  module?.moduleName || module?.name || module?.id || "Unnamed Module";

export default function FacultyAssignments() {
  const [faculties, setFaculties] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);

  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedFaculty = useMemo(
    () => faculties.find((item) => item.id === selectedFacultyId) || null,
    [faculties, selectedFacultyId]
  );

  const selectedBatch = useMemo(
    () => batches.find((item) => item.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        facultiesSnapshot,
        batchesSnapshot,
        modulesSnapshot,
        assignmentsSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "faculties")),
        getDocs(collection(db, "batches")),
        getDocs(collection(db, "modules")),
        getDocs(collection(db, "facultyAssignments")),
      ]);

      const facultyList = facultiesSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((item) => item.active !== false)
        .sort((a, b) =>
          facultyName(a).localeCompare(facultyName(b), undefined, {
            sensitivity: "base",
          })
        );

      const batchList = batchesSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((item) => item.active !== false)
        .sort((a, b) =>
          batchName(a).localeCompare(batchName(b), undefined, {
            sensitivity: "base",
          })
        );

      const moduleList = modulesSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort(
          (a, b) =>
            Number(a.moduleOrder ?? 9999) -
            Number(b.moduleOrder ?? 9999)
        );

      const assignmentList = assignmentsSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
          const aKey = `${a.facultyName || ""} ${a.batchName || ""}`;
          const bKey = `${b.facultyName || ""} ${b.batchName || ""}`;
          return aKey.localeCompare(bKey, undefined, {
            sensitivity: "base",
          });
        });

      setFaculties(facultyList);
      setBatches(batchList);
      setModules(moduleList);
      setAssignments(assignmentList);
    } catch (error) {
      console.error("FACULTY ASSIGNMENT LOAD ERROR:", error);
      alert(error?.message || "Unable to load faculty assignment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleModule = (moduleId) => {
    setSelectedModuleIds((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId]
    );
  };

  const resetForm = () => {
    setSelectedFacultyId("");
    setSelectedBatchId("");
    setSelectedModuleIds([]);
    setEditingAssignmentId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFacultyId) {
      alert("Please select a faculty member.");
      return;
    }

    if (!selectedBatchId) {
      alert("Please select a batch.");
      return;
    }

    if (selectedModuleIds.length === 0) {
      alert("Please select at least one module.");
      return;
    }

    if (!selectedFaculty || !selectedBatch) {
      alert("The selected faculty or batch could not be found.");
      return;
    }

    const duplicate = assignments.find(
      (item) =>
        item.id !== editingAssignmentId &&
        item.active !== false &&
        String(item.facultyId) === String(selectedFacultyId) &&
        String(item.batchId) === String(selectedBatchId)
    );

    if (duplicate) {
      alert(
        "This faculty is already assigned to this batch. Please edit the existing assignment."
      );
      return;
    }

    const selectedModules = modules.filter((module) =>
      selectedModuleIds.includes(module.id)
    );

    const payload = {
      facultyId: selectedFaculty.id,
      facultyName: facultyName(selectedFaculty),
      facultyEmail: selectedFaculty.email || "",
      batchId: selectedBatch.id,
      batchName: batchName(selectedBatch),
      moduleIds: selectedModuleIds,
      moduleNames: selectedModules.map(moduleName),
      active: true,
      updatedAt: serverTimestamp(),
    };

    try {
      setSaving(true);

      if (editingAssignmentId) {
        await updateDoc(
          doc(db, "facultyAssignments", editingAssignmentId),
          payload
        );
        alert("Faculty assignment updated successfully.");
      } else {
        await addDoc(collection(db, "facultyAssignments"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        alert("Faculty assignment saved successfully.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error("FACULTY ASSIGNMENT SAVE ERROR:", error);
      alert(error?.message || "Unable to save faculty assignment.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setSelectedFacultyId(assignment.facultyId || "");
    setSelectedBatchId(assignment.batchId || "");
    setSelectedModuleIds(
      Array.isArray(assignment.moduleIds)
        ? assignment.moduleIds
        : []
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleToggleActive = async (assignment) => {
    try {
      await updateDoc(
        doc(db, "facultyAssignments", assignment.id),
        {
          active: assignment.active === false,
          updatedAt: serverTimestamp(),
        }
      );

      await loadData();
    } catch (error) {
      console.error("FACULTY ASSIGNMENT STATUS ERROR:", error);
      alert(error?.message || "Unable to update assignment status.");
    }
  };

  const getAssignmentModuleNames = (assignment) => {
    if (
      Array.isArray(assignment.moduleNames) &&
      assignment.moduleNames.length > 0
    ) {
      return assignment.moduleNames;
    }

    if (Array.isArray(assignment.moduleIds)) {
      return assignment.moduleIds.map((id) => {
        const module = modules.find((item) => item.id === id);
        return module ? moduleName(module) : id;
      });
    }

    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 p-7 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Academic Administration
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            Faculty Assignments
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Assign a faculty member to a specific batch and select the
            modules that faculty member teaches in that batch.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-8"
        >
          <div className="mb-7">
            <h2 className="text-xl font-black text-slate-900">
              {editingAssignmentId
                ? "Edit Faculty Assignment"
                : "Create Faculty Assignment"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Faculty assignment is batch-specific. Existing faculty
              profiles and their module settings are not overwritten.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Faculty
              </label>

              <select
                value={selectedFacultyId}
                onChange={(event) =>
                  setSelectedFacultyId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select Faculty</option>

                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {facultyName(faculty)}
                    {faculty.designation
                      ? ` — ${faculty.designation}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Batch
              </label>

              <select
                value={selectedBatchId}
                onChange={(event) =>
                  setSelectedBatchId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select Batch</option>

                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batchName(batch)}
                    {batch.course
                      ? ` — ${batch.course}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Modules taught by this faculty in this batch
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  Select one or more modules.
                </p>
              </div>

              <span className="text-xs font-bold text-indigo-600">
                {selectedModuleIds.length} selected
              </span>
            </div>

            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No modules are available.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module, index) => {
                  const selected = selectedModuleIds.includes(
                    module.id
                  );

                  return (
                    <button
                      type="button"
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </div>

                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {module.moduleOrder != null
                              ? `${module.moduleOrder}. `
                              : `${index + 1}. `}
                            {moduleName(module)}
                          </p>

                          {module.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {module.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editingAssignmentId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-7 py-3 font-black text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingAssignmentId
                ? "Update Assignment"
                : "Save Faculty Assignment"}
            </button>
          </div>
        </form>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Current Faculty Assignments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Batch-specific teaching allocations.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
              {assignments.length} total records
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              Loading faculty assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-bold text-slate-700">
                No faculty assignments created yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create the first assignment above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Faculty</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Assigned Modules</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {assignments.map((assignment) => {
                    const active = assignment.active !== false;
                    const moduleNames =
                      getAssignmentModuleNames(assignment);

                    return (
                      <tr
                        key={assignment.id}
                        className="bg-slate-50 align-top text-sm"
                      >
                        <td className="rounded-l-2xl px-4 py-4">
                          <p className="font-black text-slate-800">
                            {assignment.facultyName ||
                              assignment.facultyId}
                          </p>

                          {assignment.facultyEmail && (
                            <p className="mt-1 text-xs text-slate-500">
                              {assignment.facultyEmail}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-800">
                            {assignment.batchName ||
                              assignment.batchId}
                          </p>
                        </td>

                        <td className="max-w-md px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {moduleNames.length ? (
                              moduleNames.map((name) => (
                                <span
                                  key={name}
                                  className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700"
                                >
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">
                                No modules assigned
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="rounded-r-2xl px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(assignment)
                              }
                              className="rounded-lg bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleActive(assignment)
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-black shadow-sm ${
                                active
                                  ? "bg-white text-red-600 ring-1 ring-slate-200 hover:bg-red-50"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                            >
                              {active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
