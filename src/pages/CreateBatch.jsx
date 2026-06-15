import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function CreateBatch() {

  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [course, setCourse] = useState("");
  const [trainer, setTrainer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      await setDoc(doc(db, "batches", batchId), {

        batchName,
        course,
        trainer,
        startDate,
        endDate,
        active: true,
        createdAt: new Date(),

      });

      alert("Batch Created Successfully");

      setBatchId("");
      setBatchName("");
      setCourse("");
      setTrainer("");
      setStartDate("");
      setEndDate("");

    } catch (error) {

      console.log(error);

      alert("Error Creating Batch");

    }
  };

  return (

    <div className="min-h-screen p-10">

      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-8">
          Create Batch
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <input
            type="text"
            placeholder="Batch ID"
            value={batchId}
            onChange={(e) =>
              setBatchId(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <input
            type="text"
            placeholder="Batch Name"
            value={batchName}
            onChange={(e) =>
              setBatchName(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <input
            type="text"
            placeholder="Course"
            value={course}
            onChange={(e) =>
              setCourse(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <input
            type="text"
            placeholder="Trainer"
            value={trainer}
            onChange={(e) =>
              setTrainer(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
            className="w-full border p-3"
            required
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded"
          >
            Create Batch
          </button>

        </form>

      </div>

    </div>
  );
}