import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewSubmissions() {
  const [submissions, setSubmissions] = useState([]);

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

              <p className="text-gray-600 mt-2">
                Submitted On: {item.date}
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

            </div>

          ))}

        </div>
      )}

    </div>
  );
}