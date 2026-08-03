import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function AdminAnalytics() {

  const [totalStudents, setTotalStudents] = useState(0);
  const [approvedStudents, setApprovedStudents] = useState(0);
  const [rejectedStudents, setRejectedStudents] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    const studentsSnapshot = await getDocs(
      collection(db, "students")
    );

    const rejectedSnapshot = await getDocs(
      collection(db, "rejectedStudents")
    );

    setTotalStudents(studentsSnapshot.size);

    const approved = studentsSnapshot.docs.filter(
      (doc) => doc.data().approved === true
    );

    setApprovedStudents(approved.length);

    setRejectedStudents(rejectedSnapshot.size);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">

      <h1 className="text-4xl font-bold mb-8">
        Admin Analytics
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="font-bold">Total Students</h3>
          <p className="text-4xl mt-3">{totalStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="font-bold">Approved Students</h3>
          <p className="text-4xl mt-3">{approvedStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="font-bold">Rejected Students</h3>
          <p className="text-4xl mt-3">{rejectedStudents}</p>
        </div>

      </div>

    </div>
  );
}