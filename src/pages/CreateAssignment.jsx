import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase";
import {
  collection,
  addDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function CreateAssignment() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
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

    let assignmentFileUrl = "";
    const today = new Date();

const due = new Date(today);

if (assessmentType === "assignment") {

  due.setDate(today.getDate() + 14);

}

else if (assessmentType === "project") {

  due.setDate(today.getDate() + 21);

}

else if (assessmentType === "capstone") {

  due.setDate(today.getDate() + 30);

}

const calculatedDueDate =
  due.toISOString().split("T")[0];

    if (assignmentFile) {

      const fileName =
        `${Date.now()}-${assignmentFile.name}`;

      const { data, error } =
  await supabase.storage
    .from("assignments")
    .upload(fileName, assignmentFile);

if (error) {
  console.error("SUPABASE ERROR:", error);
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

    await addDoc(collection(db, "assignments"), {
  title,
  description,
  dueDate: calculatedDueDate,

  batchId,
  moduleId,
  type: assessmentType,

  fileUrl,
  assignmentFileUrl,

  createdAt: new Date(),
  active: true,
});

    alert("Assignment Created Successfully");

    setTitle("");
setDescription("");
setDueDate("");

setBatchId("");
setModuleId("");

setFileUrl("");
setAssignmentFile(null);
setAssessmentType("assignment");
  } catch (error) {
    console.error(error);
    alert("Error Creating Assignment");
  }
};

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-orange-700 mb-10">
        Create Assignment
      </h1>

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">
        <input
          type="text"
          placeholder="Assignment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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

{/* Assessment Type */}

<select
  value={assessmentType}
  onChange={(e) =>
    setAssessmentType(e.target.value)
  }
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

        <textarea
          placeholder="Assignment Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
          rows="5"
        />

        {/*
<input
  type="date"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
  className="w-full border p-3 rounded-lg mb-6"
/>
*/}
        <input
  type="text"
  placeholder="Google Drive Assignment Link"
  value={fileUrl}
  onChange={(e) => setFileUrl(e.target.value)}
  className="w-full border p-3 rounded-lg mb-6"
/>
<div className="mb-6">

  <label className="block mb-2 font-semibold">
    Upload Assignment File
  </label>

  <input
    type="file"
    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ipynb,.py,.jpg,.jpeg,.png"
    onChange={(e) => setAssignmentFile(e.target.files[0])}
    className="w-full border p-3 rounded-lg"
  />

  <p className="text-sm text-gray-500 mt-2">
    PDF, DOCX, XLSX, CSV, IPYNB, PY, JPG, PNG
  </p>

</div>

<button
  onClick={handleSubmit}
  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl"
>
  Create Assignment
</button>

        
      </div>
    </div>
  );
}