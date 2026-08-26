import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { createFaculty } from "../services/facultyService";

const initialForm = {
  name: "",
  email: "",
  designation: "",
  bio: "",
  experienceYears: "",
  expertise: "",
  moduleIds: [],
  linkedinUrl: "",
  active: true,
};

export default function CreateFaculty({ onCreated, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [modules, setModules] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadModules = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "modules"),
            orderBy("moduleOrder", "asc")
          )
        );

        if (!active) return;

        setModules(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      } catch (loadError) {
        console.error("Faculty module loading failed:", loadError);
        if (active) {
          setError(
            "Modules could not be loaded. You can still save the profile without module assignments."
          );
        }
      }
    };

    loadModules();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const selectedModuleNames = useMemo(
    () =>
      form.moduleIds
        .map(
          (id) =>
            modules.find((module) => module.id === id)?.moduleName ||
            modules.find((module) => module.id === id)?.name ||
            id
        )
        .filter(Boolean),
    [form.moduleIds, modules]
  );

  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleModule = (moduleId) => {
    setForm((previous) => ({
      ...previous,
      moduleIds: previous.moduleIds.includes(moduleId)
        ? previous.moduleIds.filter((id) => id !== moduleId)
        : [...previous.moduleIds, moduleId],
    }));
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");
    setPhotoFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Faculty name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Faculty email is required.");
      return;
    }

    setSaving(true);

    try {
      const expertise = form.expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const faculty = await createFaculty({
        ...form,
        expertise,
        photoFile,
      });

      setForm(initialForm);
      setPhotoFile(null);
      setPhotoPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onCreated?.(faculty);
    } catch (saveError) {
      console.error("Faculty creation failed:", saveError);
      setError(
        saveError?.message ||
          "Faculty could not be created. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 px-6 py-7 text-white">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              Faculty Management
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Add a faculty profile
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
              Create a polished faculty identity that can later be
              assigned to live classes and doubt sessions.
            </p>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="p-6 space-y-7">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Profile identity
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              This information will be visible to students.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex h-44 w-44 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-indigo-400 hover:bg-indigo-50"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Faculty preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <div className="text-4xl">👨‍🏫</div>
                    <div className="mt-2 text-xs font-semibold text-slate-600">
                      Add profile photo
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Max 5 MB
                    </div>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full name *"
                value={form.name}
                onChange={(value) => update("name", value)}
                placeholder="e.g. Dr. Ananya Sharma"
              />

              <Field
                label="Email *"
                type="email"
                value={form.email}
                onChange={(value) => update("email", value)}
                placeholder="faculty@synaptech.com"
              />

              <Field
                label="Designation"
                value={form.designation}
                onChange={(value) => update("designation", value)}
                placeholder="Senior Data Science Faculty"
              />

              <Field
                label="Experience (years)"
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={(value) => update("experienceYears", value)}
                placeholder="10"
              />

              <div className="md:col-span-2">
                <Field
                  label="LinkedIn / professional profile"
                  value={form.linkedinUrl}
                  onChange={(value) => update("linkedinUrl", value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Teaching profile
            </h3>
          </div>

          <div className="space-y-4">
            <Field
              label="Expertise"
              value={form.expertise}
              onChange={(value) => update("expertise", value)}
              placeholder="Python, Machine Learning, GenAI"
              helper="Separate multiple expertise areas with commas."
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Modules taught
              </label>

              {modules.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No modules are currently available.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {modules.map((module) => {
                    const selected = form.moduleIds.includes(module.id);
                    const label =
                      module.moduleName ||
                      module.name ||
                      module.id;

                    return (
                      <label
                        key={module.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                          selected
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleModule(module.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium">{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedModuleNames.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {selectedModuleNames.length} module
                  {selectedModuleNames.length === 1 ? "" : "s"} selected.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Faculty bio
              </label>
              <textarea
                value={form.bio}
                onChange={(event) =>
                  update("bio", event.target.value)
                }
                rows={5}
                placeholder="Briefly describe the faculty member's background, teaching approach and industry experience."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                update("active", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Faculty is active
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Active faculty can be shown in the student directory
                and selected for future session assignments.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating faculty..." : "Create Faculty Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  helper,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />
      {helper && (
        <p className="mt-1 text-xs text-slate-400">{helper}</p>
      )}
    </div>
  );
}
