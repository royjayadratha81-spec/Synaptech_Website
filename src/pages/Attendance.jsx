import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Attendance() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const querySnapshot = await getDocs(
      collection(db, "students")
    );

    const studentList = [];

    querySnapshot.forEach((doc) => {
      studentList.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    setStudents(
  studentList.filter(
    (student) => student.approved === true
  )
);
  };

  return (
    <div className="min-h-screen p-10">

      <h1 className="text-4xl font-bold text-blue-800 mb-8">
        Attendance Management
      </h1>

      {students.map((student) => (
        <div
          key={student.id}
          className="border p-4 rounded-lg mb-4 bg-white shadow"
        >
          <h3 className="font-bold">
            {student.name}
          </h3>

          <p>{student.email}</p>

          <p>{student.course}</p>
          <div className="mt-3 flex gap-3">

  <button
    className="bg-green-600 text-white px-4 py-2 rounded"
  >
    Present
  </button>

  <button
    className="bg-red-600 text-white px-4 py-2 rounded"
  >
    Absent
  </button>

</div>
        </div>
      ))}

    </div>
  );
}