import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MiniTestSection({ tests = [], history = [] }) {
  const navigate = useNavigate();
    const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const getRemainingDays = (endAt) => {
    if (!endAt) return null;

    let endTime;

    if (typeof endAt?.toMillis === "function") {
      endTime = endAt.toMillis();
    } else if (endAt?.seconds) {
      endTime = endAt.seconds * 1000;
    } else {
      endTime = new Date(endAt).getTime();
    }

    const remaining =
      endTime - now;

    if (remaining <= 0) {
      return 0;
    }

    return Math.ceil(
      remaining /
        (1000 * 60 * 60 * 24)
    );
  };

  if (!tests || tests.length === 0) {
    return null;
  }

  const getTestHistory = (testId) => {
    return history
      .filter((item) => item.testId === testId)
      .sort((a, b) => {
        const aTime = a.submittedAt?.seconds || 0;
        const bTime = b.submittedAt?.seconds || 0;
        return bTime - aTime;
      });
  };

  const getBestResult = (testId) => {
    const attempts = getTestHistory(testId);

    if (attempts.length === 0) {
      return null;
    }

    return attempts.reduce((best, current) => {
      const currentScore =
        Number(current.percentage ?? current.score ?? 0);

      const bestScore =
        Number(best.percentage ?? best.score ?? 0);

      return currentScore > bestScore ? current : best;
    });
  };

  const getAttemptCount = (testId) => {
    return getTestHistory(testId).length;
  };

  return (
    <section className="mt-10 mb-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Knowledge Check
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Mini Tests
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Test your understanding of this module.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold w-fit">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Auto Evaluated
        </div>
      </div>

      {/* Test Cards */}
      <div className="space-y-5">
        {tests.map((test) => {
  const attempts = getAttemptCount(test.id);
  const maxAttempts = Number(test.maxAttempts ?? 3);

  const testHistory = getTestHistory(test.id);

  const bestResult = getBestResult(test.id);

  const finalResult = testHistory.find(
    (item) =>
      item.finalSubmission === true ||
      item.locked === true
  );

  const finalSubmitted = Boolean(finalResult);

  const locked =
    finalSubmitted || attempts >= maxAttempts;
                    const normalEndTime =
  test.endAt
    ? typeof test.endAt?.toMillis === "function"
      ? test.endAt.toMillis()
      : test.endAt?.seconds
      ? test.endAt.seconds * 1000
      : new Date(test.endAt).getTime()
    : null;

const extensionEndTime =
  test.extensionEndAt
    ? typeof test.extensionEndAt?.toMillis === "function"
      ? test.extensionEndAt.toMillis()
      : test.extensionEndAt?.seconds
      ? test.extensionEndAt.seconds * 1000
      : new Date(test.extensionEndAt).getTime()
    : null;

const effectiveEndAt =
  normalEndTime &&
  now < normalEndTime
    ? test.endAt
    : extensionEndTime
    ? test.extensionEndAt
    : test.endAt;

const remainingDays =
  getRemainingDays(effectiveEndAt);

          const windowClosed =
            remainingDays !== null &&
            remainingDays <= 0;

          const availabilityLocked =
            locked || windowClosed;
            const submittedAtMillis =
  finalResult?.submittedAt
    ? typeof finalResult.submittedAt?.toMillis === "function"
      ? finalResult.submittedAt.toMillis()
      : finalResult.submittedAt?.seconds
      ? finalResult.submittedAt.seconds * 1000
      : new Date(finalResult.submittedAt).getTime()
    : null;

const submittedDaysAgo =
  submittedAtMillis
    ? Math.max(
        0,
        Math.floor(
          (now - submittedAtMillis) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

          const bestScore = bestResult
            ? Number(
                bestResult.percentage ??
                  (
                    (Number(bestResult.score || 0) /
                      Math.max(
  Number(
    bestResult.maxScore ||
    bestResult.totalQuestions ||
    1
  ),
  1
)) *
                    100
                  )
              )
            : null;

          return (
            <div
              key={test.id}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)] hover:shadow-[0_16px_45px_rgba(15,23,42,0.10)] transition-all duration-300"
            >
              {/* Premium top accent */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500" />

              <div className="p-6 md:p-7">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                  {/* Left side */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                      <span className="text-2xl">🧠</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                          Knowledge Assessment
                        </span>

                        {availabilityLocked && (
  <span
    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
      windowClosed
        ? "bg-red-50 text-red-600"
        : "bg-slate-100 text-slate-600"
    }`}
  >
    {windowClosed
      ? "Window Closed"
      : "Test Locked"}
  </span>
)}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        {test.title || "Mini Test"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-500">
                        <span>
                          {Number(test.questionCount || 0)} Questions
                        </span>

                        <span>
                          {Number(test.durationMinutes || 0)} Minutes
                        </span>

                        <span>
                          {attempts}/{maxAttempts} Attempts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">

                    {/* View Result */}
                    <button
                      type="button"
                      onClick={() => {
                        if (bestResult?.id) {
                          navigate(
                            `/mini-test/${test.id}/result/${bestResult.id}`
                          );
                        }
                      }}
                      disabled={!bestResult}
                      className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                        bestResult
                          ? "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                          : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      View Result
                    </button>

                    {/* Start Quiz */}
                    <button
  type="button"
  onClick={() => {
    if (!availabilityLocked) {
      navigate(`/mini-test/${test.id}/take`);
    }
  }}
  disabled={availabilityLocked}
  className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
    availabilityLocked
      ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
      : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:-translate-y-0.5"
  }`}
>
  {windowClosed
    ? "🔒 Test Window Closed"
    : locked
    ? "🔒 Test Locked"
    : "Start Quiz →"}
</button>
                  </div>
                </div>

                {/* Bottom information panel */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="space-y-4">

                    <div
  className={`mb-5 rounded-2xl border p-4 ${
    windowClosed
      ? "border-red-200 bg-red-50"
      : remainingDays <= 2
      ? "border-amber-200 bg-amber-50"
      : "border-indigo-200 bg-indigo-50"
  }`}
>
  <div className="flex items-center justify-between gap-4">

    <div>
      <p
        className={`text-xs font-bold uppercase tracking-wider ${
          windowClosed
            ? "text-red-600"
            : remainingDays <= 2
            ? "text-amber-600"
            : "text-indigo-600"
        }`}
      >
        Test Availability
      </p>

      <p
        className={`text-lg font-black mt-1 ${
          windowClosed
            ? "text-red-700"
            : remainingDays <= 2
            ? "text-amber-700"
            : "text-slate-900"
        }`}
      >
        {finalSubmitted
  ? submittedDaysAgo === 0
    ? "Mini Test Submitted today"
    : `Mini Test Submitted ${submittedDaysAgo} ${
        submittedDaysAgo === 1
          ? "day"
          : "days"
      } ago`
  : remainingDays === null
  ? "Availability not configured"
  : windowClosed
  ? "Test Window Closed"
  : `${remainingDays} ${
      remainingDays === 1
        ? "day"
        : "days"
    } remaining`}
      </p>
    </div>

    <div className="text-2xl">
  {finalSubmitted
    ? "✅"
    : windowClosed
    ? "🔒"
    : "⏳"}
</div>

  </div>
</div>
                        </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
          Attempts Used
                      </p>

                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {attempts}/{maxAttempts}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                        Best Score
                      </p>

                      <p className="text-lg font-bold text-indigo-600 mt-1">
                        {bestScore !== null
                          ? `${Math.round(bestScore)}%`
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                        Status
                      </p>

                      <p
  className={`text-lg font-bold mt-1 ${
  finalSubmitted
    ? "text-emerald-600"
    : windowClosed
    ? "text-red-600"
    : locked
    ? "text-emerald-600"
    : bestResult
    ? "text-emerald-600"
    : "text-slate-700"
}`}
>
  {finalSubmitted
  ? "Completed"
  : windowClosed
  ? "Window Closed"
  : locked
  ? "Completed"
  : bestResult
  ? "In Progress"
  : "Not Attempted"}
</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}