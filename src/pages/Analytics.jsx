import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Analytics() {

  const [bestScore, setBestScore] =
    useState(0);

  const [attempts, setAttempts] =
    useState(0);

  const [averageScore, setAverageScore] =
    useState(0);

  useEffect(() => {

    fetchAnalytics();

  }, []);

  const fetchAnalytics = async () => {

    const studentData =
      JSON.parse(
        localStorage.getItem(
          "studentData"
        )
      );

    const currentEmail =
      studentData?.email;

    if (!currentEmail) return;

    const q = query(
      collection(db, "mcqResults"),
      where(
        "studentEmail",
        "==",
        currentEmail
      )
    );

    const snapshot =
      await getDocs(q);

    let totalScore = 0;
    let highestScore = 0;

    snapshot.forEach((docItem) => {

      const data =
        docItem.data();

      totalScore +=
        data.score || 0;

      if (
        (data.score || 0) >
        highestScore
      ) {
        highestScore =
          data.score;
      }

    });

    const totalAttempts =
      snapshot.size;

    setAttempts(
      totalAttempts
    );

    setBestScore(
      highestScore
    );

    setAverageScore(
      totalAttempts > 0
        ? (
            totalScore /
            totalAttempts
          ).toFixed(2)
        : 0
    );

  };

  return (

    <div className="min-h-screen p-10 bg-gray-100">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        My Analytics
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold">
            Best MCQ Score
          </h2>
          <p className="text-3xl mt-3">
            {bestScore}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold">
            Total Attempts
          </h2>
          <p className="text-3xl mt-3">
            {attempts}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold">
            Average Score
          </h2>
          <p className="text-3xl mt-3">
            {averageScore}
          </p>
        </div>

      </div>

    </div>

  );

}