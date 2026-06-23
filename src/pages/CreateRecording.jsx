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

    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Upload Recording
      </h1>

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">

        <input
          type="text"
          placeholder="Recording Title"
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

        <input
          type="text"
          placeholder="Recording Link (Google Meet / Zoom / Webex / Drive)"
          value={videoLink}
          onChange={(e) => setVideoLink(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <input
          type="text"
          placeholder="Duration (Example: 1h 30m)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full border p-3 rounded-lg mb-6"
        />

        
          <input
  type="text"
  placeholder="Platform (Google Meet / Zoom / Webex)"
  value={platform}
  onChange={(e) => setPlatform(e.target.value)}
  className="w-full border p-3 rounded-lg mb-6"
/>
<button
          onClick={handleSubmit}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
        >
          Upload Recording
        </button>

      </div>

    </div>

  );

}