import { useEffect, useState } from "react";
import {
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function AssignmentSubmissions() {

  const [submissions, setSubmissions] =
    useState([]);

  useEffect(() => {

    fetchSubmissions();

  }, []);

  const fetchSubmissions = async () => {

    const snapshot = await getDocs(
      collection(
        db,
        "assignmentSubmissions"
      )
    );

    const submissionList =
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    setSubmissions(
      submissionList
    );

  };

  return (

    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Assignment Submissions
      </h1>

      <div className="space-y-6">

        {submissions.map(
          (submission) => (

          <div
            key={submission.id}
            className="
              bg-white
              p-6
              rounded-2xl
              shadow-lg
            "
          >

            <p>
              Assignment ID:
              {" "}
              {submission.assignmentId}
            </p>

            <p>
              Status:
              {" "}
              {submission.status}
            </p>

            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-blue-600
                hover:underline
              "
            >
              Download Submission
            </a>

          </div>

        ))}

      </div>

    </div>

  );

}