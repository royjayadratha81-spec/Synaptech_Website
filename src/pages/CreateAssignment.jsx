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
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-orange-700 mb-10">
        Create Assessment
      </h1>

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">
        <input
          type="text"
          placeholder="Assessment Title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full border p-3 rounded-lg mb-4"
        />

        <select
          value={batchId}
          onChange={(e) =>
            setBatchId(e.target.value)
          }
          className="w-full border p-3 rounded-lg mb-4"
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
          className="w-full border p-3 rounded-lg mb-4"
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
            className="w-full border p-3 rounded-lg mb-4"
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
          className="w-full border p-3 rounded-lg mb-4"
          rows="5"
        />

        <input
          type="text"
          placeholder="Optional Google Drive / external link"
          value={fileUrl}
          onChange={(e) =>
            setFileUrl(e.target.value)
          }
          className="w-full border p-3 rounded-lg mb-6"
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
            className="w-full border p-3 rounded-lg"
          />

          <p className="text-sm text-gray-500 mt-2">
            {isCapstone
              ? "Only .zip files are accepted for Capstone Projects."
              : "PDF, DOCX, XLSX, CSV, IPYNB, PY, JPG, PNG"}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className={`text-white px-6 py-3 rounded-xl ${
            isCapstone
              ? "bg-orange-600 hover:bg-orange-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isCapstone
            ? "Create Capstone Project"
            : "Create Assessment"}
        </button>
      </div>
    </div>
  );
}
