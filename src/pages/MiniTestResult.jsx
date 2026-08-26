import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { db } from "../firebase/firebaseConfig";

export default function MiniTestResult() {
  const { testId, resultId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  useEffect(() => {
    loadResult();
  }, [testId, resultId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      setError("");

      if (!testId || !resultId) {
        setError("Invalid test or result.");
        return;
      }

      // ---------------------------------------------------------
      // 1. LOAD TEST
      // ---------------------------------------------------------
      const testRef = doc(db, "mcqTests", testId);
      const testSnap = await getDoc(testRef);

      if (!testSnap.exists()) {
        setError("Mini test not found.");
        return;
      }

      const testData = {
        id: testSnap.id,
        ...testSnap.data(),
      };

      setTest(testData);

      // ---------------------------------------------------------
      // 2. LOAD QUESTIONS
      // ---------------------------------------------------------
      const questionsRef = collection(
        db,
        "mcqTests",
        testId,
        "questions"
      );

      const questionsSnap = await getDocs(questionsRef);

      const questionData = questionsSnap.docs.map((questionDoc) => ({
        id: questionDoc.id,
        ...questionDoc.data(),
      }));

      setQuestions(questionData);

      // ---------------------------------------------------------
      // 3. LOAD RESULT
      // ---------------------------------------------------------
      const resultRef = doc(db, "mcqResults", resultId);
      const resultSnap = await getDoc(resultRef);

      if (!resultSnap.exists()) {
        setError("Result not found.");
        return;
      }

      setResult({
        id: resultSnap.id,
        ...resultSnap.data(),
      });
    } catch (err) {
      console.error("Error loading mini test result:", err);
      setError("Unable to load the result.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // LOADING
  // -------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-slate-600 font-medium">
            Loading your result...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ERROR
  // -------------------------------------------------------------

  if (error || !result || !test) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Result unavailable
          </h2>

          <p className="text-slate-500 mb-6">
            {error || "We could not load this mini-test result."}
          </p>

          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // BASIC RESULT VALUES
  // -------------------------------------------------------------

  const totalQuestions = Number(
    result.totalQuestions || questions.length || 0
  );

  const score = Number(result.score || 0);

  const maxScore = Number(
    result.maxScore ||
      result.totalMarks ||
      totalQuestions ||
      1
  );

  const percentage = Number(
    result.percentage ??
      ((score / Math.max(maxScore, 1)) * 100)
  );

  const correct = Number(
  result.correctCount ??
    result.correct ??
    result.correctAnswers ??
    0
);

  const incorrect = Number(
  result.incorrectCount ??
  result.incorrect ??
  result.incorrectAnswers ??
  (
    Array.isArray(result.answers)
      ? result.answers.filter(
          (answer) =>
            answer?.isAnswered === true &&
            answer?.isCorrect === false
        ).length
      : 0
  )
);

  const unanswered = Number(
  result.unansweredCount ??
    result.unanswered ??
    result.unansweredQuestions ??
    Math.max(
      totalQuestions - correct - incorrect,
      0
    )
);
const maxAttempts =
  Number(test.maxAttempts) || 3;

const answersRevealed =
  result.finalSubmission === true ||
  result.locked === true ||
  Number(result.attemptNumber) >= maxAttempts;

  // -------------------------------------------------------------
  // CHART DATA
  // -------------------------------------------------------------

  const performanceData = [
    {
      name: test.title || "Mini Test",
      score,
      maximum: maxScore,
    },
  ];

  const resultDistribution = [
    {
      name: "Correct",
      value: correct,
    },
    {
      name: "Incorrect",
      value: incorrect,
    },
    {
      name: "Unanswered",
      value: unanswered,
    },
  ].filter((item) => item.value > 0);

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                Knowledge Assessment
              </p>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {test.title || "Mini Test"}
              </h1>

              <p className="text-slate-500 mt-2">
                Detailed assessment performance
              </p>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              ← Back
            </button>

          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Percentage
            </p>

            <p className="text-3xl font-bold text-indigo-600 mt-2">
              {percentage.toFixed(0)}%
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Your Score
            </p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {score}/{maxScore}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Correct
            </p>

            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {correct}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Incorrect
            </p>

            <p className="text-3xl font-bold text-red-500 mt-2">
              {incorrect}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Unanswered
            </p>

            <p className="text-3xl font-bold text-amber-500 mt-2">
              {unanswered}
            </p>
          </div>

        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* BAR CHART */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Performance Overview
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Score compared with maximum marks
              </p>
            </div>

            <div className="h-72">

              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="score"
                    name="Your Score"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />

                  <Bar
                    dataKey="maximum"
                    name="Maximum Marks"
                    fill="#cbd5e1"
                    radius={[6, 6, 0, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>

            </div>
          </div>

          {/* PIE CHART */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Answer Distribution
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Correct, incorrect and unanswered questions
              </p>
            </div>

            <div className="h-72">

              {resultDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>

                    <Pie
                      data={resultDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {resultDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? "#22c55e"
                              : index === 1
                              ? "#ef4444"
                              : "#f59e0b"
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No answer data available
                </div>
              )}

            </div>
          </div>

        </div>

        {/* QUESTION REPORT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Question-wise Report
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Detailed question-level performance
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-left">

                  <th className="px-4 py-4 font-semibold text-slate-600">
                    Question
                  </th>

                  <th className="px-4 py-4 font-semibold text-slate-600">
                    Your Answer
                  </th>

                  <th className="px-4 py-4 font-semibold text-slate-600">
  Correct Answer
</th>

                  <th className="px-4 py-4 font-semibold text-slate-600">
                    Result
                  </th>

                  <th className="px-4 py-4 font-semibold text-slate-600">
                    Marks
                  </th>

                </tr>
              </thead>

              <tbody>

  {questions.map((question, index) => {

    const answer =
      Array.isArray(result.answers)
        ? result.answers.find(
            (item) => item.questionId === question.id
          )
        : result.answers?.[question.id] ??
          result.answers?.[index] ??
          null;

    const selectedAnswer =
      answer?.selectedAnswer ??
      answer?.answer ??
      answer ??
      null;

    const correctAnswer =
      question.correctAnswer ??
      question.answer ??
      question.correctOption ??
      "-";

    const isAnswered =
      answer?.isAnswered ??
      Boolean(selectedAnswer);

    const isCorrect =
      isAnswered &&
      (
        answer?.isCorrect ??
        String(selectedAnswer) === String(correctAnswer)
      );

    const isExpanded =
      expandedQuestionId === question.id;

    const options = [
  question.option1,
  question.option2,
  question.option3,
  question.option4,
].filter(
  (option) =>
    option !== undefined &&
    option !== null &&
    String(option).trim() !== ""
);

    return (
      <React.Fragment key={question.id}>

        {/* QUESTION SUMMARY ROW */}
        <tr
          onClick={() =>
            setExpandedQuestionId(
              isExpanded ? null : question.id
            )
          }
          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
        >

          <td className="px-4 py-4 font-semibold text-indigo-600">
            <div className="flex items-center gap-2">
              <span>
                Q{index + 1}
              </span>

              <span className="text-xs text-slate-400">
                {isExpanded ? "▲" : "▼"}
              </span>
            </div>
          </td>

          <td className="px-4 py-4 text-slate-600">
            {selectedAnswer
              ? String(selectedAnswer)
              : "Not Answered"}
          </td>

          <td className="px-4 py-4 text-slate-600">
  {answersRevealed
    ? String(correctAnswer)
    : "Hidden until final submission"}
</td>

          <td className="px-4 py-4">

            {!isAnswered ? (
              <span className="inline-flex px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                Unanswered
              </span>
            ) : isCorrect ? (
              <span className="inline-flex px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                Correct
              </span>
            ) : (
              <span className="inline-flex px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold">
                Incorrect
              </span>
            )}

          </td>

          <td className="px-4 py-4 font-semibold text-slate-800">

            {!isAnswered
              ? "—"
              : isCorrect
              ? `+${answer?.positiveMarks ?? 1}`
              : `-${answer?.negativeMarks ?? 0}`}

          </td>

        </tr>


        {/* EXPANDED QUESTION DETAILS */}
        {isExpanded && (

          <tr className="bg-slate-50">

            <td
              colSpan={5}
              className="px-6 py-6"
            >

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

                {/* QUESTION */}
                <div className="mb-6">

                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                    Question {index + 1}
                  </p>

                  <h3 className="text-lg font-semibold text-slate-900 leading-relaxed">
                    {question.question ||
                      question.questionText ||
                      question.text ||
                      "Question unavailable"}
                  </h3>

                </div>


                {/* OPTIONS */}
                <div className="space-y-3">

                  {options.length > 0 ? (

                    options.map((option, optionIndex) => {

                      const optionText =
                        typeof option === "object"
                          ? option.text ??
                            option.label ??
                            option.value ??
                            ""
                          : option;

                      const selected =
                        String(selectedAnswer) ===
                        String(optionText);

                      const correct =
  answersRevealed &&
  String(correctAnswer) ===
    String(optionText);

                      let optionClass =
                        "border-slate-200 bg-white text-slate-700";

                      if (correct) {
                        optionClass =
                          "border-emerald-400 bg-emerald-50 text-emerald-800";
                      }

                      if (selected && !correct) {
                        optionClass =
                          "border-red-400 bg-red-50 text-red-800";
                      }

                      if (selected && correct) {
                        optionClass =
                          "border-emerald-500 bg-emerald-100 text-emerald-900";
                      }

                      return (
                        <div
                          key={optionIndex}
                          className={`border-2 rounded-xl p-4 ${optionClass}`}
                        >

                          <div className="flex items-start gap-3">

                            <span className="font-bold">
                              {String.fromCharCode(
                                65 + optionIndex
                              )}.
                            </span>

                            <span className="flex-1 font-medium">
                              {String(optionText)}
                            </span>

                            {selected && (
                              <span className="text-xs font-bold uppercase">
                                Your Answer
                              </span>
                            )}

                            {correct && answersRevealed && (
  <span className="text-xs font-bold uppercase">
    Correct Answer
  </span>
)}

                          </div>

                        </div>
                      );

                    })

                  ) : (

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                      Options are not available for this question.
                    </div>

                  )}

                </div>


                {/* ANSWER SUMMARY */}
                <div className="mt-6 pt-5 border-t border-slate-200">

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="rounded-xl bg-slate-50 p-4">

                      <p className="text-xs font-semibold text-slate-500 uppercase">
                        Your Answer
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedAnswer
                          ? String(selectedAnswer)
                          : "Not Answered"}
                      </p>

                    </div>


                    <div className="rounded-xl bg-emerald-50 p-4">

  <p className="text-xs font-semibold text-emerald-600 uppercase">
    Correct Answer
  </p>

  <p className="mt-1 font-semibold text-emerald-800">
    {answersRevealed
      ? String(correctAnswer)
      : "Hidden until final submission"}
  </p>

</div>


                    <div
                      className={`rounded-xl p-4 ${
                        !isAnswered
                          ? "bg-amber-50"
                          : isCorrect
                          ? "bg-emerald-50"
                          : "bg-red-50"
                      }`}
                    >

                      <p className="text-xs font-semibold uppercase">
                        Result
                      </p>

                      <p className="mt-1 font-semibold">

                        {!isAnswered
                          ? "Not Attempted"
                          : isCorrect
                          ? "Correct Answer"
                          : "Incorrect Answer"}

                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </td>

          </tr>

        )}

      </React.Fragment>
    );
  })}

</tbody>

            </table>

          </div>

        </div>

      </div>
    </div>
  );
}