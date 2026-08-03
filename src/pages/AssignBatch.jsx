import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { createStudentAnalytics } from "../utils/createStudentAnalytics";

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
    batchId: docItem.id,
    ...docItem.data(),
});
    });

    setBatches(batchList);
  };

  const assignBatch = async (
  studentId,
  batchId
) => {

  const selectedBatch = batches.find(
    (batch) => batch.batchId === batchId
);

  if (!selectedBatch) {
    alert("Batch not found");
    return;
  }

  await updateDoc(
  doc(db, "students", studentId),
  {
    batchId: selectedBatch.batchId,
    batchName: selectedBatch.batchName,
    course: selectedBatch.course,
    startDate: selectedBatch.startDate,
    endDate: selectedBatch.endDate,
  }
);
  const studentRef = doc(db, "students", studentId);

const studentSnap = await getDoc(studentRef);

const student = studentSnap.data();
await createStudentAnalytics(student);

  alert("Batch Assigned Successfully");

  fetchStudents();
};

  return (
    <div className="min-h-screen p-10">

      <h1 className="text-4xl font-bold mb-8">
        Assign Batch
      </h1>

      {students
  .filter((student) => student.approved === true)
  .map((student) => (
        <div
          key={student.id}
          className="border p-4 mb-4 rounded"
        >
          <h3>{student.name}</h3>

          <p>{student.email}</p>

          <p>
Current Batch:
{" "}
{student.batchName || "Not Assigned"}
</p>

          <select
  value={student.batchId || ""}
  onChange={(e) =>
    assignBatch(
      student.id,
      e.target.value
    )
  }
  className="border p-2 mt-2"
>
            <option value="">
  Select Batch
</option>

            {batches.map((batch) => (
              <option
    key={batch.id}
    value={batch.batchId}
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