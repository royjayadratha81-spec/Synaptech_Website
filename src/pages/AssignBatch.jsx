import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function AssignBatch() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  const fetchStudents = async () => {
    const snapshot = await getDocs(
      collection(db, "students")
    );

    const studentList = [];

    snapshot.forEach((docItem) => {
      studentList.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    setStudents(studentList);
  };

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

  const assignBatch = async (
    studentId,
    batchId
  ) => {

    await updateDoc(
      doc(db, "students", studentId),
      {
        batchId,
      }
    );

    alert("Batch Assigned");

    fetchStudents();
  };

  return (
    <div className="min-h-screen p-10">

      <h1 className="text-4xl font-bold mb-8">
        Assign Batch
      </h1>

      {students.map((student) => (
        <div
          key={student.id}
          className="border p-4 mb-4 rounded"
        >
          <h3>{student.name}</h3>

          <p>{student.email}</p>

          <p>
            Current Batch:
            {" "}
            {student.batchId || "Not Assigned"}
          </p>

          <select
            onChange={(e) =>
              assignBatch(
                student.id,
                e.target.value
              )
            }
            className="border p-2 mt-2"
          >
            <option>
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

        </div>
      ))}

    </div>
  );
}