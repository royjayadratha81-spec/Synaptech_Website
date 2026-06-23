import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewMcqResults() {

  const [results, setResults] = useState([]);

  useEffect(() => {

    fetchResults();

  }, []);

  const fetchResults = async () => {

    const snapshot = await getDocs(
      collection(db, "mcqResults")
    );

    const resultList = [];

    snapshot.forEach((docItem) => {

      resultList.push({
        id: docItem.id,
        ...docItem.data(),
      });

    });

    setResults(resultList);

  };

  return (

    <div className="p-6">

      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        MCQ Test Results
      </h1>

      <table className="w-full border">

        <thead>

          <tr className="bg-gray-200">

            <th className="border p-2">
              Student Email
            </th>

            <th className="border p-2">
              Module
            </th>

            <th className="border p-2">
              Score
            </th>

            <th className="border p-2">
              Total Questions
            </th>

            <th className="border p-2">
              Attempt
            </th>

          </tr>

        </thead>

        <tbody>

          {results.map((result) => (

            <tr key={result.id}>

              <td className="border p-2">
                {result.studentEmail}
              </td>

              <td className="border p-2">
                {result.moduleId}
              </td>

              <td className="border p-2">
                {result.score}
              </td>

              <td className="border p-2">
                {result.totalQuestions}
              </td>

              <td className="border p-2">
                {result.attemptNumber}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}