import { updateStudentAnalytics } from "../utils/updateStudentAnalytics";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [evaluations, setEvaluations] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const querySnapshot = await getDocs(
      collection(db, "submissions")
    );

    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setSubmissions(data);
  };

  const saveEvaluation = async (id) => {

  try {

    await updateDoc(
      doc(db, "submissions", id),
      {
        marks: Number(evaluations[id]?.marks || 0),
        remarks: evaluations[id]?.remarks || "",
        evaluated: true,
        evaluatedBy: "Admin",
        evaluationDate: serverTimestamp(),
      }
    );

    // Find this submission
    const submission =
      submissions.find(
        (item) => item.id === id
      );

    // Update analytics automatically
    await updateStudentAnalytics(
      submission.studentEmail
    );

    alert("Evaluation Saved");

    fetchSubmissions();

  } catch (error) {

    console.error(error);

    alert("Failed to Save Evaluation");

  }

};
  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold mb-8 text-blue-700">
        Student Assignment Submissions
      </h1>

      {submissions.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow">
          No submissions found.
        </div>
      ) : (
        <div className="space-y-6">

          {submissions.map((item) => (

            <div
              key={item.id}
              className="bg-white p-6 rounded-2xl shadow-lg"
            >

              <h2 className="text-2xl font-bold text-gray-800">
                {item.fileName}
              </h2>
              <p className="text-blue-700 font-semibold mt-2">
  Assignment: {item.assignmentTitle || "Not Available"}
</p>

              <p className="text-gray-600 mt-2">
  Submitted By: {item.studentName || "Unknown Student"}
</p>

<p className="text-gray-600 mt-1">
  Email: {item.studentEmail || "No Email"}
</p>

<p className="text-gray-600 mt-1">
  Submitted On: {
    item.submittedAt?.seconds
      ? new Date(
          item.submittedAt.seconds * 1000
        ).toLocaleString()
      : item.submittedAt
  }
</p>

              <p className="text-green-600 font-semibold mt-2">
                {item.status}
              </p>

              {item.fileUrl && (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Download Submission
                </a>
              )}
              <div className="mt-6 border-t pt-4">

  <label className="block font-semibold mb-2">
    Marks
  </label>

  <input
  type="number"
  placeholder="Enter Marks"
  className="w-full border p-3 rounded-lg mb-4"
  onChange={(e) =>
    setEvaluations({
      ...evaluations,
      [item.id]: {
        ...evaluations[item.id],
        marks: e.target.value,
      },
    })
  }
/>

  <label className="block font-semibold mb-2">
    Remarks
  </label>

  <textarea
  placeholder="Enter Remarks"
  className="w-full border p-3 rounded-lg mb-4"
  rows="3"
  onChange={(e) =>
    setEvaluations({
      ...evaluations,
      [item.id]: {
        ...evaluations[item.id],
        remarks: e.target.value,
      },
    })
  }
/>

  <button
  onClick={() =>
  saveEvaluation(
    item.id,
    item.studentEmail
  )
}
  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
>
  Save Evaluation
</button>

</div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}