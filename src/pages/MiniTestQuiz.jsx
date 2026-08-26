import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const MAX_ATTEMPTS_DEFAULT = 3;
const DURATION_MINUTES_DEFAULT = 25;

const getStudent = () => {
  try {
    return JSON.parse(localStorage.getItem("studentData") || "null");
  } catch {
    return null;
  }
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
};
const toDate = (value) => {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

export default function MiniTestQuiz() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const student = useMemo(getStudent, []);

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [questionTimes, setQuestionTimes] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
    DURATION_MINUTES_DEFAULT * 60
  );
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [locked, setLocked] = useState(false);
const [lockReason, setLockReason] = useState("");
const [attemptNumber, setAttemptNumber] = useState(1);
const [finalSubmitted, setFinalSubmitted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const maxAttempts =
    Number(test?.maxAttempts) || MAX_ATTEMPTS_DEFAULT;

  const durationMinutes =
    Number(test?.durationMinutes) ||
    DURATION_MINUTES_DEFAULT;

  const recordCurrentQuestionTime = () => {
    if (!currentQuestion) return;

    const elapsed = Math.max(
      0,
      Math.round((Date.now() - questionStartedAt) / 1000)
    );

    setQuestionTimes((prev) => ({
      ...prev,
      [currentQuestion.id]:
        (prev[currentQuestion.id] || 0) + elapsed,
    }));
  };

  const loadQuiz = async () => {
    if (!testId || !student?.email) return;

    try {
      setLoading(true);

      // -----------------------------------------
      // LOAD TEST
      // -----------------------------------------
      const testSnap = await getDoc(
        doc(db, "mcqTests", testId)
      );

      if (!testSnap.exists()) {
        throw new Error("Test not found.");
      }

      const testData = {
        id: testSnap.id,
        ...testSnap.data(),
      };

      setTest(testData);

      setTimeLeft(
        (Number(testData.durationMinutes) ||
          DURATION_MINUTES_DEFAULT) * 60
      );
            // -----------------------------------------
      // CHECK TEST AVAILABILITY
      // -----------------------------------------

      const now = new Date();

      const startAt = toDate(testData.startAt);
      const normalEndAt = toDate(testData.endAt);

      let extensionEndAt = null;

      // -----------------------------------------
      // LOAD STUDENT EXTENSION
      // -----------------------------------------

      try {
        const extensionSnap = await getDocs(
          query(
            collection(db, "mcqExtensions"),
            where(
              "studentEmail",
              "==",
              student.email
            )
          )
        );

        const extensionDoc =
          extensionSnap.docs.find(
            (item) =>
              item.data()?.testId === testId
          );

        if (extensionDoc) {
          extensionEndAt = toDate(
            extensionDoc.data()?.extensionEndAt
          );
        }
      } catch (extensionError) {
        console.error(
          "Extension lookup error:",
          extensionError
        );
      }

      // -----------------------------------------
      // DETERMINE EFFECTIVE END DATE
      // -----------------------------------------

      let effectiveEndAt = normalEndAt;

      if (
        extensionEndAt &&
        (!effectiveEndAt ||
          extensionEndAt > effectiveEndAt)
      ) {
        effectiveEndAt = extensionEndAt;
      }

      // -----------------------------------------
      // TEST NOT STARTED
      // -----------------------------------------

      if (startAt && now < startAt) {
        setLockReason("notStarted");
        setLocked(true);
        return;
      }

      // -----------------------------------------
      // TEST WINDOW CLOSED
      // -----------------------------------------

      if (
        effectiveEndAt &&
        now >= effectiveEndAt
      ) {
        setLockReason("windowClosed");
        setLocked(true);
        return;
      }

      // -----------------------------------------
      // LOAD QUESTIONS
      // -----------------------------------------
      const questionSnap = await getDocs(
        collection(
          db,
          "mcqTests",
          testId,
          "questions"
        )
      );

      const loadedQuestions = questionSnap.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      setQuestions(loadedQuestions);

      // -----------------------------------------
      // LOAD PREVIOUS ATTEMPTS
      // -----------------------------------------
      const resultSnap = await getDocs(
        query(
          collection(db, "mcqResults"),
          where("studentEmail", "==", student.email),
          where("testId", "==", testId)
        )
      );

      const nextAttempt = resultSnap.size + 1;

      setAttemptNumber(nextAttempt);

            const hasFinalSubmission =
        resultSnap.docs.some(
          (item) =>
            item.data()?.finalSubmission === true ||
            item.data()?.locked === true
        );

      const maxAttemptsReached =
        resultSnap.size >=
        (Number(testData.maxAttempts) ||
          MAX_ATTEMPTS_DEFAULT);

      if (
        hasFinalSubmission ||
        maxAttemptsReached
      ) {
        setLocked(true);
        setFinalSubmitted(hasFinalSubmission);
      }
    } catch (error) {
      console.error("Mini test load error:", error);

      alert(
        error.message ||
          "Unable to load the test."
      );
    } finally {
      setLoading(false);
      setQuestionStartedAt(Date.now());
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [testId, student?.email]);

  // -----------------------------------------
  // TIMER
  // -----------------------------------------
  useEffect(() => {
    if (
      loading ||
      locked ||
      submitting ||
      questions.length === 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          handleSubmit(true);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    loading,
    locked,
    submitting,
    questions.length,
  ]);

  // -----------------------------------------
  // SELECT ANSWER
  // -----------------------------------------
  const selectAnswer = (value) => {
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  // -----------------------------------------
  // QUESTION NAVIGATION
  // -----------------------------------------
  const goToQuestion = (index) => {
    recordCurrentQuestionTime();

    setCurrentIndex(index);

    setQuestionStartedAt(Date.now());

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // -----------------------------------------
  // SUBMIT TEST
  // -----------------------------------------
  const handleSubmit = async (
  autoSubmitted = false,
  finalSubmission = false
) => {
    if (
      submitting ||
      !questions.length ||
      !student?.email
    ) {
      return;
    }

    recordCurrentQuestionTime();

    setSubmitting(true);

    try {
      const finalQuestionTimes = {
        ...questionTimes,

        [currentQuestion?.id]:
          (questionTimes[currentQuestion?.id] || 0) +
          (currentQuestion
            ? Math.max(
                0,
                Math.round(
                  (Date.now() - questionStartedAt) /
                    1000
                )
              )
            : 0),
      };

      // -----------------------------------------
      // BUILD ANSWER RECORDS
      // -----------------------------------------
      const answerRecords = questions.map(
        (question) => {
          const selectedAnswer =
            answers[question.id] || null;

          const isAnswered =
            Boolean(selectedAnswer);

          const isCorrect =
            isAnswered &&
            selectedAnswer ===
              question.correctAnswer;

          const positiveMarks = Number(
            question.positiveMarks ?? 1
          );

          const negativeMarks = Number(
            question.negativeMarks ?? 0
          );

          return {
            questionId: question.id,

            question:
              question.question || "",

            option1:
              question.option1 || "",

            option2:
              question.option2 || "",

            option3:
              question.option3 || "",

            option4:
              question.option4 || "",

            selectedAnswer,

            correctAnswer:
              question.correctAnswer || "",

            isCorrect,

            isAnswered,

            timeTaken: Number(
              finalQuestionTimes[
                question.id
              ] || 0
            ),

            topic:
              question.topic || "General",

            difficulty:
              question.difficulty ||
              "Not specified",

            explanation:
              question.explanation || "",

            positiveMarks,

            negativeMarks,
          };
        }
      );

      // -----------------------------------------
      // SCORE CALCULATION
      // -----------------------------------------
      const correctCount =
        answerRecords.filter(
          (item) => item.isCorrect
        ).length;

      const incorrectCount =
        answerRecords.filter(
          (item) =>
            item.isAnswered &&
            !item.isCorrect
        ).length;

      const unansweredCount =
        answerRecords.filter(
          (item) => !item.isAnswered
        ).length;

      const score =
        answerRecords.reduce(
          (total, item) => {
            if (item.isCorrect) {
              return (
                total + item.positiveMarks
              );
            }

            if (item.isAnswered) {
              return (
                total - item.negativeMarks
              );
            }

            return total;
          },
          0
        );

      const maxScore =
        answerRecords.reduce(
          (total, item) =>
            total + item.positiveMarks,
          0
        );

      const percentage =
        maxScore > 0
          ? Math.max(
              0,
              (score / maxScore) * 100
            )
          : 0;

      const totalTimeSeconds =
        Math.max(
          0,
          durationMinutes * 60 -
            timeLeft
        );

      // -----------------------------------------
      // SAVE RESULT
      // -----------------------------------------
      const resultRef = await addDoc(
        collection(db, "mcqResults"),
        {
          studentEmail:
            student.email,

          studentName:
            student.name ||
            student.fullName ||
            "Student",

          testId,

          testTitle:
            test?.title ||
            "Mini Test",

          moduleId:
            test?.moduleId || "",

          attemptNumber,

          score,

          maxScore,

          totalQuestions:
            questions.length,

          percentage:
            Number(
              percentage.toFixed(2)
            ),

          correctCount,

          incorrectCount,

          unansweredCount,

          totalTimeSeconds,

          startedAt: new Date(
            Date.now() -
              totalTimeSeconds * 1000
          ),

          submittedAt:
            serverTimestamp(),

          answers: answerRecords,

          autoSubmitted,
          finalSubmission,
locked: finalSubmission,
        }
      );

      // -----------------------------------------
      // GO TO RESULT PAGE
      // -----------------------------------------
      if (finalSubmission) {
  setFinalSubmitted(true);
  setLocked(true);
}
      navigate(
        `/mini-test/${testId}/result/${resultRef.id}`,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Mini test submission error:",
        error
      );

      alert(
        error.message ||
          "Unable to submit the test."
      );

      setSubmitting(false);
    }
  };

  // -----------------------------------------
  // LOADING
  // -----------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 px-8 py-10 text-center text-white shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl mb-4">
            🧠
          </div>

          <p className="text-lg font-semibold">
            Preparing your assessment…
          </p>

          <p className="text-sm text-slate-400 mt-1">
            Loading questions securely.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // LOCKED
  // -----------------------------------------
  if (locked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-3xl bg-white p-8 shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-3xl mb-5">
            🔒
          </div>

          <h1 className="text-2xl font-black text-slate-900">
  {lockReason === "windowClosed"
    ? "Test Window Closed"
    : lockReason === "notStarted"
    ? "Test Not Yet Available"
    : "Test Locked"}
</h1>

          <p className="text-slate-500 mt-2">
  {lockReason === "windowClosed"
    ? "The availability period for this assessment has ended."
    : lockReason === "notStarted"
    ? "This assessment is not available yet."
    : "You have used all available attempts for this assessment."}
</p>

          <button
            onClick={() =>
              navigate(
                `/module/${test?.moduleId}`
              )
            }
            className="mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
          >
            Back to Module
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // MAIN QUIZ UI
  // -----------------------------------------
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">

      {/* TOP HEADER */}
      <div className="bg-slate-950 text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-indigo-300 font-bold">
              Knowledge Assessment
            </p>

            <h1 className="text-xl md:text-2xl font-black mt-1">
              {test?.title ||
                "Mini Test"}
            </h1>

            <p className="text-sm text-slate-400 mt-1">
              Attempt {attemptNumber} of{" "}
              {maxAttempts}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="text-xs text-slate-400 block">
                Questions
              </span>

              <span className="font-bold">
                {currentIndex + 1} /{" "}
                {questions.length}
              </span>
            </div>

            <div
              className={`px-4 py-2 rounded-xl border font-black tabular-nums ${
                timeLeft <= 60
                  ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
                  : "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
              }`}
            >
              {formatTime(timeLeft)}
            </div>

          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* QUESTION */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">

            <div className="p-6 md:p-8 border-b border-slate-100">

              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">
                    Question {currentIndex + 1}
                  </p>

                  <h2 className="text-xl md:text-2xl font-black mt-2 leading-snug">
                    {currentQuestion?.question}
                  </h2>
                </div>

                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {currentQuestion?.difficulty ||
                    "Standard"}
                </span>

              </div>
            </div>

            {/* OPTIONS */}
            <div className="p-6 md:p-8 space-y-3">

              {[
                "option1",
                "option2",
                "option3",
                "option4",
              ].map((key, index) => {

                const value =
                  currentQuestion?.[key];

                if (!value) return null;

                const selected =
                  answers[
                    currentQuestion.id
                  ] === value;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      selectAnswer(value)
                    }
                    className={`w-full text-left rounded-2xl border-2 p-4 md:p-5 flex gap-4 items-start transition-all ${
                      selected
                        ? "border-indigo-600 bg-indigo-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >

                    <span
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>

                    <span className="pt-1 font-medium leading-relaxed">
                      {value}
                    </span>

                  </button>
                );
              })}

            </div>

            {/* NAVIGATION */}
            <div className="px-6 md:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between">

              <button
                disabled={
                  currentIndex === 0
                }
                onClick={() =>
                  goToQuestion(
                    currentIndex - 1
                  )
                }
                className="px-5 py-3 rounded-xl border border-slate-300 bg-white font-bold disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentIndex <
              questions.length - 1 ? (
                <button
                  onClick={() =>
                    goToQuestion(
                      currentIndex + 1
                    )
                  }
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg"
                >
                  Save & Next →
                </button>
                            ) : (
                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    onClick={() =>
                      handleSubmit(false)
                    }
                    disabled={submitting}
                    className="px-7 py-3 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-lg disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting…"
                      : "Submit Test ✓"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Are you sure you want to submit the Mini Test finally? You will not be able to attempt it again after final submission."
                      );

                      if (confirmed) {
                        handleSubmit(false, true);
                      }
                    }}
                    disabled={submitting}
                    className="px-7 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 shadow-lg disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting…"
                      : "Submit Final Test & Lock 🔒"}
                  </button>

                </div>
              )}

            </div>
          </section>

          {/* QUESTION NAVIGATOR */}
          <aside className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 h-fit lg:sticky lg:top-28">

            <div className="flex items-center justify-between mb-4">

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  Question Navigator
                </p>

                <p className="font-black mt-1">
                  Your Progress
                </p>
              </div>

              <span className="text-sm font-black text-indigo-600">
                {Object.keys(answers).length}/
                {questions.length}
              </span>

            </div>

            <div className="grid grid-cols-5 gap-2">

              {questions.map(
                (question, index) => {

                  const answered =
                    Boolean(
                      answers[question.id]
                    );

                  const active =
                    index ===
                    currentIndex;

                  return (
                    <button
                      key={question.id}
                      onClick={() =>
                        goToQuestion(index)
                      }
                      className={`h-10 rounded-xl text-sm font-black border transition ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : answered
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}

            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs text-slate-500">

              <div className="flex justify-between">
                <span>Answered</span>
                <b className="text-emerald-600">
                  {Object.keys(
                    answers
                  ).length}
                </b>
              </div>

              <div className="flex justify-between">
                <span>Remaining</span>
                <b>
                  {questions.length -
                    Object.keys(
                      answers
                    ).length}
                </b>
              </div>

              <div className="flex justify-between">
                <span>Attempts</span>
                <b>
                  {attemptNumber}/
                  {maxAttempts}
                </b>
              </div>

            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}