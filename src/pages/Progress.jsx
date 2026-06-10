import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Progress() {

  const [stats, setStats] = useState({
  assignmentsSubmitted: 0,
  assignmentsEvaluated: 0,
  averageMarks: 0,
  paymentStatus: "Not Submitted",
  course: "Not Assigned",
});

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {

    const studentData = JSON.parse(
      localStorage.getItem("studentData")
    );
    const course =
  studentData?.course ||
  "Not Assigned";
    const paymentSnapshot = await getDocs(
  collection(db, "payments")
);

const paymentRecord = paymentSnapshot.docs
  .map((doc) => doc.data())
  .find(
    (item) =>
      item.studentEmail ===
      studentData?.email
  );

const paymentStatus =
  paymentRecord?.paymentStatus ||
  "Not Submitted";

    const querySnapshot = await getDocs(
      collection(db, "submissions")
    );

    const submissions = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (item) =>
          item.studentEmail ===
          studentData?.email
      );

    const evaluated =
      submissions.filter(
        (item) => item.marks
      );

    const totalMarks =
      evaluated.reduce(
        (sum, item) =>
          sum + Number(item.marks),
        0
      );

    const averageMarks =
      evaluated.length > 0
        ? (
            totalMarks /
            evaluated.length
          ).toFixed(2)
        : 0;

    setStats({
  assignmentsSubmitted: submissions.length,
  assignmentsEvaluated: evaluated.length,
  averageMarks,
  paymentStatus,
  course,
});

  };

  return (

    <div className="bg-white p-8 rounded-2xl shadow-lg">

      <h2 className="text-3xl font-bold text-green-700 mb-8">
        My Learning Progress
      </h2>

      <div className="space-y-6">

        <div className="bg-blue-50 p-5 rounded-xl">
          <h3 className="font-bold text-xl">
            Assignments Submitted
          </h3>

          <p className="text-3xl text-blue-700 font-bold mt-2">
            {stats.assignmentsSubmitted}
          </p>
        </div>

        <div className="bg-green-50 p-5 rounded-xl">
          <h3 className="font-bold text-xl">
            Assignments Evaluated
          </h3>

          <p className="text-3xl text-green-700 font-bold mt-2">
            {stats.assignmentsEvaluated}
          </p>
        </div>

        <div className="bg-yellow-50 p-5 rounded-xl">
          <h3 className="font-bold text-xl">
            Average Marks
          </h3>

          <p className="text-3xl text-yellow-700 font-bold mt-2">
            {stats.averageMarks}
          </p>
        </div>
        <div className="bg-purple-50 p-5 rounded-xl">

  <h3 className="font-bold text-xl">
    Payment Status
  </h3>

  <p className="text-3xl text-purple-700 font-bold mt-2">
    {stats.paymentStatus}
  </p>

</div>
<div className="bg-indigo-50 p-5 rounded-xl">

  <h3 className="font-bold text-xl">
    My Course
  </h3>

  <p className="text-xl text-indigo-700 font-bold mt-2">
    {stats.course}
  </p>

</div>

      </div>

    </div>

  );

}