import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Results() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {

    const studentData = JSON.parse(
      localStorage.getItem("studentData")
    );

    const querySnapshot = await getDocs(
      collection(db, "submissions")
    );

    const data = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (item) =>
          item.studentEmail ===
          studentData?.email
      );

    setResults(data);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold mb-8 text-blue-700">
        My Assignment Results
      </h1>

      {results.length === 0 ? (

        <div className="bg-white p-6 rounded-xl shadow">
          No evaluated assignments found.
        </div>

      ) : (

        <div className="space-y-6">

          {results.map((item) => (

            <div
              key={item.id}
              className="bg-white p-6 rounded-2xl shadow-lg"
            >

              <h2 className="text-2xl font-bold text-gray-800">
                {item.assignmentTitle}
              </h2>

              <p className="mt-2 text-gray-600">
                Submitted On: {item.submittedAt}
              </p>

              <p className="mt-3 text-green-700 font-semibold">
                Marks: {item.marks || "Not Evaluated"}
              </p>

              <p className="mt-2 text-blue-700">
                Remarks: {item.remarks || "Pending"}
              </p>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}