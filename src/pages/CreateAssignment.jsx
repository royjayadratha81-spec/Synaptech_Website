import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const normalise = (value) =>
  String(value || "").trim().toLowerCase();

export default function CreateAssignment() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentFile, setAssignmentFile] =
    useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [batchId, setBatchId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [assessmentType, setAssessmentType] =
    useState("Assignment");

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

    setBatches(
      snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }))
    );
  };

  const fetchModules = async () => {
    const snapshot = await getDocs(
      collection(db, "modules")
    );

    const moduleList = snapshot.docs.map(
      (docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })
    );

    moduleList.sort(
      (a, b) =>
        Number(a.moduleOrder || 999) -
        Number(b.moduleOrder || 999)
    );

    setModules(moduleList);
  };

  const isCapstone =
    normalise(assessmentType) ===
    "capstoneproject";

  const handleSubmit = async () => {
    try {
      if (!title.trim()) {
        alert("Please enter an assessment title.");
        return;
      }

      if (!batchId) {
        alert("Please select a batch.");
        return;
      }

      if (!isCapstone && !moduleId) {
        alert("Please select a module.");
        return;
      }

      if (isCapstone && !assignmentFile) {
        alert(
          "Please upload the Capstone Project ZIP file."
        );
        return;
      }

      if (
        isCapstone &&
        !assignmentFile.name
          .toLowerCase()
          .endsWith(".zip")
      ) {
        alert(
          "Capstone Project files must be uploaded as .zip."
        );
        return;
      }

      if (
        !isCapstone &&
        assignmentFile &&
        assignmentFile.name
          .toLowerCase()
          .endsWith(".zip")
      ) {
        alert(
          "ZIP files are reserved for Capstone Projects."
        );
        return;
      }

      const today = new Date();
      let calculatedDueDate = dueDate;

      if (!calculatedDueDate) {
        const due = new Date(today);

        if (assessmentType === "Assignment") {
          due.setDate(
            today.getDate() + 14
          );
        } else if (
          assessmentType === "Project"
        ) {
          due.setDate(
            today.getDate() + 21
          );
        } else {
          due.setDate(
            today.getDate() + 30
          );
        }

        calculatedDueDate =
          due.toISOString().split("T")[0];
      }

      let assignmentFileUrl = "";

      if (assignmentFile) {
        const fileName =
          `${Date.now()}-${assignmentFile.name}`;

        const { error } =
          await supabase.storage
            .from("assignments")
            .upload(
              fileName,
              assignmentFile
            );

        if (error) {
          console.error(
            "SUPABASE ERROR:",
            error
          );

          alert(error.message);
          return;
        }

        const { data: publicUrlData } =
          supabase.storage
            .from("assignments")
            .getPublicUrl(fileName);

        assignmentFileUrl =
          publicUrlData.publicUrl;
      }

      await addDoc(
        collection(db, "assignments"),
        {
          title: title.trim(),
          description:
            description.trim(),

          dueDate:
            calculatedDueDate,

          batchId,

          // Course-level capstone:
          // deliberately NOT attached to a module.
          moduleId:
            isCapstone
              ? null
              : moduleId,

          type: assessmentType,

          fileUrl:
            fileUrl.trim(),

          assignmentFileUrl,

          maximumMarks:
            isCapstone ? 50 : 20,

          isCourseLevel:
            isCapstone,

          createdAt:
            new Date(),

          active: true,
        }
      );

      alert(
        `${assessmentType} created successfully.`
      );

      setTitle("");
      setDescription("");
      setDueDate("");
      setBatchId("");
      setModuleId("");
      setFileUrl("");
      setAssignmentFile(null);
      setAssessmentType("Assignment");
    } catch (error) {
      console.error(
        "CREATE ASSESSMENT ERROR:",
        error
      );

      alert(
        "Error creating assessment. Please check the console."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950" />
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative p-7 md:p-9">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Assessment Studio
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">Create Assessment</h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-300">Create assignments, projects and course-level capstones with a structured delivery workflow.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm"><div className="text-lg font-black">20</div><div className="text-[10px] uppercase tracking-wider text-slate-400">Marks</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm"><div className="text-lg font-black">14d</div><div className="text-[10px] uppercase tracking-wider text-slate-400">Default</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm"><div className="text-lg font-black">3</div><div className="text-[10px] uppercase tracking-wider text-slate-400">Types</div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
        <input
          type="text"
          placeholder="Assessment Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <select
          value={batchId}
          onChange={(e) =>
            setBatchId(e.target.value)
          }
          className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
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

        <select
          value={assessmentType}
          onChange={(e) => {
            setAssessmentType(
              e.target.value
            );

            if (
              e.target.value ===
              "Capstone Project"
            ) {
              setModuleId("");
            }
          }}
          className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
        >
          <option value="Assignment">
            Assignment
          </option>

          <option value="Project">
            Project
          </option>

          <option value="Capstone Project">
            Capstone Project
          </option>
        </select>

        {!isCapstone && (
          <select
            value={moduleId}
            onChange={(e) =>
              setModuleId(e.target.value)
            }
            className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
        )}

        {isCapstone && (
          <div className="mb-4 rounded-xl bg-orange-50 border border-orange-100 p-4">
            <p className="text-sm font-bold text-orange-800">
              Course-Level Capstone
            </p>

            <p className="text-xs text-orange-700 mt-1">
              Capstone projects are not linked to any course module.
              Students will access them from Submit Capstone.
            </p>
          </div>
        )}

        <textarea
          placeholder={
            isCapstone
              ? "Capstone Project Description"
              : "Assessment Description"
          }
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          rows="5"
        />

        <input
          type="text"
          placeholder="Optional Google Drive / external link"
          value={fileUrl}
          onChange={(e) =>
            setFileUrl(e.target.value)
          }
          className="w-full border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl mb-6 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <div className="mb-6">
          <label className="block mb-2 font-semibold">
            {isCapstone
              ? "Upload Capstone Project ZIP"
              : "Upload Assessment File"}
          </label>

          <input
            type="file"
            accept={
              isCapstone
                ? ".zip"
                : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ipynb,.py,.jpg,.jpeg,.png"
            }
            onChange={(e) =>
              setAssignmentFile(
                e.target.files?.[0] ||
                  null
              )
            }
            className="w-full border border-dashed border-slate-300 bg-slate-50 p-4 rounded-xl"
          />

          <p className="text-sm text-gray-500 mt-2">
            {isCapstone
              ? "Only .zip files are accepted for Capstone Projects."
              : "PDF, DOCX, XLSX, CSV, IPYNB, PY, JPG, PNG"}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className={`w-full text-white px-6 py-3.5 rounded-xl font-bold shadow-lg transition ${
            isCapstone
              ? "bg-orange-600 hover:bg-orange-700 shadow-orange-100"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
          }`}
        >
          {isCapstone
            ? "Create Capstone Project"
            : "Create Assessment"}
        </button>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Workflow</p>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-black">1</span><div><b className="text-slate-800">Define</b><p className="text-slate-500 mt-0.5">Title, batch and assessment type.</p></div></div>
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-black">2</span><div><b className="text-slate-800">Configure</b><p className="text-slate-500 mt-0.5">Module, description and resources.</p></div></div>
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-black">3</span><div><b className="text-slate-800">Publish</b><p className="text-slate-500 mt-0.5">Create and make it available to students.</p></div></div>
          </div>
        </div>
        <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <p className="text-sm font-black text-slate-900">Assessment guardrails</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">Capstones remain course-level and require ZIP delivery. Regular assessments remain module-linked.</p>
        </div>
      </aside>
      </div>
    </div>
  </div>
  );
}
