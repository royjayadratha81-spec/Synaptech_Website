import { supabase } from "../supabase/supabase";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function UploadCourseMaterial() {

  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  const [batchId, setBatchId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [materialType, setMaterialType] =
  useState("");

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
  const handleUpload = async () => {

  if (!file) {

    alert("Please select a file");
    return;

  }

  try {

    const filePath =
      `${batchId}/${moduleId}/${Date.now()}_${file.name}`;

    const { error } =
      await supabase.storage
        .from("course-materials")
        .upload(filePath, file);

    if (error) throw error;

    const { data } =
      supabase.storage
        .from("course-materials")
        .getPublicUrl(filePath);

    await addDoc(
  collection(db, "courseMaterials"),
  {
    title,
    batchId,
    moduleId,
    materialType,
    fileName: file.name,
    fileUrl: data.publicUrl,
    uploadedAt: new Date(),
  }
);

    alert("Material Uploaded Successfully");

    setTitle("");
    setBatchId("");
    setModuleId("");
    setMaterialType("");
    setFile(null);

  } 
  catch (error) {

  console.error("UPLOAD ERROR:", error);

  alert(error.message);

}

};

  return (

    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Upload Course Material
      </h1>

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">

        <input
          type="text"
          placeholder="Material Title"
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
  value={materialType}
  onChange={(e) =>
    setMaterialType(e.target.value)
  }
  className="w-full border p-3 rounded-lg mb-4"
>
  <option value="">
    Select Material Type
  </option>

  <option value="reading">
    Reading Material
  </option>

  <option value="practice">
    Practice Material
  </option>

  <option value="interview">
    Interview Questions & Answers
  </option>

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
        <input
  type="file"
  onChange={(e) =>
    setFile(e.target.files[0])
  }
  className="w-full border p-3 rounded-lg mb-4"
/>
<button
  onClick={handleUpload}
  className="bg-blue-700 text-white px-6 py-3 rounded-xl"
>
  Upload Material
</button>

      </div>

    </div>

  );

}