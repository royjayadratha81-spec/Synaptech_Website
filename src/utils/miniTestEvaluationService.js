import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/*
  STUDENT-SCOPED Mini-Test Evaluation service.

  SOURCE OF TRUTH
  ----------------
  modules    -> module list/order
  mcqTests   -> Mini-Test definitions (batch + module + due date)
  mcqResults -> ONLY the logged-in student's attempts/results

  Important rules:
  1. Interview Questions & Answers is excluded completely.
  2. The current student's email is mandatory. This page must never
     calculate KPIs from other students' mcqResults.
  3. The student's batch is mandatory for a valid evaluation view.
  4. The Mini-Test definition is the source of truth for batch ownership.
  5. If duplicate active tests exist for one module/batch, choose the
     newest definition. Do NOT choose a test because another
     student's result happens to exist on it.
  6. All students therefore use the same test definitions and module order,
     while each student sees only their own results.
*/

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeModuleName = (value) =>
  normalize(value).replace(/[^a-z0-9]/g, "");

const EXCLUDED_MODULE = "interviewquestionsanswers";

const isExcludedModule = (value) =>
  normalizeModuleName(value) === EXCLUDED_MODULE;

const toDate = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const timestamp = (value) => {
  const date = toDate(value);
  return date ? date.getTime() : 0;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const testStart = (test) =>
  test?.startAt ||
  test?.startDate ||
  test?.availableFrom ||
  test?.createdAt ||
  null;

const testEnd = (test) =>
  test?.endAt ||
  test?.endDate ||
  test?.availableUntil ||
  test?.dueDate ||
  null;

const resultDate = (result) =>
  result?.submittedAt ||
  result?.completedAt ||
  result?.createdAt ||
  null;

const maximum = (result) => {
  const value = Number(
    result?.maxScore ??
      result?.totalMarks ??
      result?.totalQuestions ??
      0
  );

  return value > 0 ? value : 0;
};

const score = (result) => Number(result?.score ?? 0);

const percentage = (result) => {
  if (
    result?.percentage !== undefined &&
    result?.percentage !== null &&
    Number.isFinite(Number(result.percentage))
  ) {
    return Number(result.percentage);
  }

  const max = maximum(result);
  return max
    ? Number(((score(result) / max) * 100).toFixed(1))
    : 0;
};

const studentKey = (result) => normalize(result?.studentEmail);

const pickBestAttempt = (attempts) => {
  if (!attempts.length) return null;

  return [...attempts].sort((a, b) => {
    const percentageDifference = percentage(b) - percentage(a);

    if (percentageDifference !== 0) {
      return percentageDifference;
    }

    return timestamp(resultDate(b)) - timestamp(resultDate(a));
  })[0];
};

/*
  One active/current Mini-Test per module + batch.
  Selection is independent of student results so every student in the
  same batch sees the same Mini-Test definition.
*/
const selectCanonicalTests = (tests) => {
  const groups = new Map();

  tests.forEach((test) => {
    if (!test.moduleId || !test.batchId) return;

    const key = `${test.batchId}::${test.moduleId}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(test);
  });

  const canonical = [];

  groups.forEach((moduleTests) => {
    const ranked = [...moduleTests].sort((a, b) => {
      const activeDifference =
        Number(b.active !== false) - Number(a.active !== false);

      if (activeDifference !== 0) {
        return activeDifference;
      }

      const dateDifference =
        timestamp(testStart(b)) - timestamp(testStart(a));

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return String(b.id).localeCompare(String(a.id));
    });

    if (ranked[0]) canonical.push(ranked[0]);
  });

  return canonical;
};

export async function loadMiniTestEvaluationData({
  studentEmail = "",
  batchId = "",
  moduleId = "",
  testId = "",
} = {}) {
  const normalizedEmail = normalize(studentEmail);

  if (!normalizedEmail) {
    throw new Error("Student email is required for Mini-Test Evaluation.");
  }

  if (!batchId) {
    throw new Error("Student batch is required for Mini-Test Evaluation.");
  }

  const [modulesSnap, testsSnap, resultsSnap] = await Promise.all([
    getDocs(collection(db, "modules")),
    getDocs(
      query(
        collection(db, "mcqTests"),
        where("batchId", "==", batchId)
      )
    ),
    getDocs(
      query(
        collection(db, "mcqResults"),
        where("studentEmail", "==", studentEmail)
      )
    ),
  ]);

  const modules = modulesSnap.docs
    .map((docItem) => {
      const data = docItem.data();
      const name =
        data.moduleName ||
        data.name ||
        data.title ||
        docItem.id;

      return {
        id: docItem.id,
        name,
        order: Number(data.moduleOrder || 999),
      };
    })
    .filter(
      (module) =>
        !isExcludedModule(module.name) &&
        !isExcludedModule(module.id)
    )
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.name.localeCompare(b.name)
    );

  const moduleMap = Object.fromEntries(
    modules.map((module) => [module.id, module])
  );

  const allTests = testsSnap.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .filter((test) => {
      if (!test.moduleId || !test.batchId) return false;
      if (!moduleMap[test.moduleId]) return false;
      if (test.active === false) return false;
      if (normalize(test.batchId) !== normalize(batchId)) return false;

      if (
        moduleId &&
        normalize(test.moduleId) !== normalize(moduleId)
      ) {
        return false;
      }

      if (testId && test.id !== testId) return false;

      return true;
    })
    .map((test) => ({
      ...test,
      moduleName: moduleMap[test.moduleId]?.name || test.moduleId,
      moduleOrder: moduleMap[test.moduleId]?.order || 999,
      startDateResolved: testStart(test),
      dueDateResolved: testEnd(test),
    }));

  const tests = selectCanonicalTests(allTests).sort(
    (a, b) =>
      a.moduleOrder - b.moduleOrder ||
      timestamp(testStart(a)) - timestamp(testStart(b)) ||
      String(a.title || a.id).localeCompare(
        String(b.title || b.id)
      )
  );

  const testMap = Object.fromEntries(
    tests.map((test) => [test.id, test])
  );

  /*
    Only this student's results are loaded. Results are additionally tied
    back to the canonical test definition, preventing cross-student or old
    duplicate-test leakage.
  */
  const results = resultsSnap.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .filter((result) => {
      if (!result.testId) return false;
      if (!testMap[result.testId]) return false;
      if (normalize(result.studentEmail) !== normalizedEmail) return false;
      return true;
    })
    .map((result) => ({
      ...result,
      score: score(result),
      maximum: maximum(result),
      percentage: percentage(result),
      submittedDate: formatDate(resultDate(result)),
      submittedDateTime: formatDateTime(resultDate(result)),
      submittedTimestamp: timestamp(resultDate(result)),
      evaluationDate: result.evaluationDate
        ? formatDateTime(result.evaluationDate)
        : "—",
    }));

  const testRows = tests.map((test) => {
    const testResults = results.filter(
      (result) => result.testId === test.id
    );

    const bestAttempt = pickBestAttempt(testResults);
    const averagePercentage = bestAttempt
      ? Number(bestAttempt.percentage.toFixed(1))
      : null;

    const maximumMarks =
      bestAttempt?.maximum ||
      Number(
        test.questionCount ||
          test.totalQuestions ||
          0
      ) ||
      null;

    return {
      id: test.id,
      testId: test.id,
      title: test.title || test.name || "Mini Test",
      moduleId: test.moduleId,
      module: test.moduleName,
      moduleOrder: test.moduleOrder,
      batchId: test.batchId,
      startDate: formatDate(test.startDateResolved),
      dueDate: formatDate(test.dueDateResolved),
      totalQuestions: Number(
        test.questionCount || test.totalQuestions || 0
      ),
      durationMinutes: Number(test.durationMinutes || 0),
      maximumMarks,
      totalStudentsAttempted: bestAttempt ? 1 : 0,
      totalAttempts: testResults.length,
      averageScore: bestAttempt ? bestAttempt.score : null,
      averagePercentage,
      highestScore: bestAttempt ? bestAttempt.score : null,
      highestPercentage: bestAttempt
        ? bestAttempt.percentage
        : null,
      status: bestAttempt ? "Attempted" : "Not Attempted",
      bestAttempt,
      latestResult: testResults.length
        ? [...testResults].sort(
            (a, b) =>
              b.submittedTimestamp - a.submittedTimestamp
          )[0]
        : null,
      results: testResults,
    };
  });

  const moduleRows = modules
    .filter(
      (module) =>
        !moduleId ||
        normalize(module.id) === normalize(moduleId)
    )
    .map((module) => {
      const moduleTests = testRows.filter(
        (test) => test.moduleId === module.id
      );

      const test = moduleTests[0] || null;

      return {
        moduleId: module.id,
        module: module.name,
        moduleOrder: module.order,
        totalTests: moduleTests.length,
        studentsAttempted: test?.bestAttempt ? 1 : 0,
        totalAttempts: test?.totalAttempts || 0,
        averagePercentage: test?.averagePercentage ?? null,
        averageScore: test?.averageScore ?? null,
        highestPercentage: test?.highestPercentage ?? null,
        highestScore: test?.highestScore ?? null,
        completedTests: test?.bestAttempt ? 1 : 0,
        notAttemptedTests:
          moduleTests.length -
          (test?.bestAttempt ? 1 : 0),
        dueDate: test?.dueDate || null,
        submittedDate: test?.latestResult?.submittedDate || null,
        evaluationDate:
          test?.bestAttempt?.evaluationDate ||
          test?.bestAttempt?.submittedDateTime ||
          null,
        status: test?.bestAttempt
          ? "Attempted"
          : test
            ? "Not Attempted"
            : "No Mini-Test",
        tests: moduleTests,
      };
    });

  const bestAll = testRows
    .map((test) => test.bestAttempt)
    .filter(Boolean);

  const testsAttempted = bestAll.length;
  const totalAttempts = results.length;

  const averagePercentage = bestAll.length
    ? Number(
        (
          bestAll.reduce(
            (sum, result) => sum + result.percentage,
            0
          ) / bestAll.length
        ).toFixed(1)
      )
    : null;

  const highestPercentage = bestAll.length
    ? Math.max(...bestAll.map((result) => result.percentage))
    : null;

  const scoreDistribution = [
    {
      name: "90–100%",
      value: bestAll.filter((result) => result.percentage >= 90).length,
    },
    {
      name: "75–89%",
      value: bestAll.filter(
        (result) =>
          result.percentage >= 75 && result.percentage < 90
      ).length,
    },
    {
      name: "60–74%",
      value: bestAll.filter(
        (result) =>
          result.percentage >= 60 && result.percentage < 75
      ).length,
    },
    {
      name: "Below 60%",
      value: bestAll.filter((result) => result.percentage < 60).length,
    },
  ].filter((item) => item.value > 0);

  return {
    studentEmail,
    batchId,
    modules: moduleRows,
    tests: testRows,
    results,

    kpis: {
      totalMiniTests: tests.length,
      testsAttempted,
      totalStudentsAttempted: testsAttempted,
      studentsAttempted: testsAttempted,
      totalAttempts,
      averagePercentage,
      highestPercentage,
    },

    moduleChartData: moduleRows
      .filter((module) => module.averagePercentage !== null)
      .map((module) => ({
        module: module.module,
        moduleId: module.moduleId,
        averagePercentage: module.averagePercentage,
        highestPercentage: module.highestPercentage,
        studentsAttempted: module.studentsAttempted,
        totalTests: module.totalTests,
      })),

    scoreDistributionChart: scoreDistribution,

    filters: {
      studentEmail,
      batchId,
      moduleId,
      testId,
    },
  };
}

export default loadMiniTestEvaluationData;
