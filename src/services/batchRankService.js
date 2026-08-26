import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* =========================================================
   BATCH RANK SERVICE

   Ranking rule:
   - Only students belonging to the requested batch are ranked.
   - Only evaluated Assignments, Projects and completed Mini-Tests
     contribute to the ranking.
   - Every evaluated assessment contributes equally as one score.
   - Assignment / Project: best evaluated submission for each
     assessment definition is counted once.
   - Mini-Test: best result for each Mini-Test definition is counted
     once.
   - Capstone is NOT included.
   - Submitted-but-not-evaluated work is NOT counted.
   - The final performance score is the arithmetic mean of all
     counted assessment percentages.
   - Higher performance = better rank.
   - Equal performance receives competition ranking: 1, 1, 3, 4...

   This service deliberately does NOT use studentAnalytics.averageScore
   as the source of truth for Batch Rank.
========================================================= */

const normalise = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normaliseType = (value) =>
  normalise(value).replace(/[-_]/g, " ");

const isAssignmentType = (type) =>
  normaliseType(type) === "assignment";

const isProjectType = (type) =>
  normaliseType(type) === "project";

const isCapstoneType = (type) =>
  normaliseType(type).includes("capstone");

const isExcludedModule = (module) => {
  const name = normalise(module?.moduleName || module?.name || module?.title || module?.id)
    .replace(/[^a-z0-9]/g, "");

  return name === "interviewquestionsanswers";
};

const toPercentage = (score, maximum) => {
  const s = Number(score);
  const m = Number(maximum);

  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) {
    return null;
  }

  return Number(((s / m) * 100).toFixed(2));
};

const getMiniTestMaximum = (result, testDefinition) =>
  Number(
    result?.totalQuestions ||
      result?.maxScore ||
      testDefinition?.questionCount ||
      10
  );

const getAssessmentMaximum = (definition) =>
  Number(
    definition?.maximumMarks ||
      definition?.maxMarks ||
      definition?.totalMarks ||
      20
  );

const getBestEvaluatedSubmission = (submissions, definition) => {
  const evaluated = submissions.filter(
    (submission) => submission?.evaluated === true
  );

  if (!evaluated.length) return null;

  const maximum = getAssessmentMaximum(definition);

  return (
    [...evaluated]
      .map((submission) => ({
        submission,
        percentage: toPercentage(
          submission?.marks,
          maximum
        ),
      }))
      .filter((item) => item.percentage !== null)
      .sort((a, b) => b.percentage - a.percentage)[0] || null
  );
};

const getBestMiniTestResult = (results, testDefinition) => {
  if (!results.length) return null;

  return (
    [...results]
      .map((result) => ({
        result,
        percentage: toPercentage(
          result?.score,
          getMiniTestMaximum(result, testDefinition)
        ),
      }))
      .filter((item) => item.percentage !== null)
      .sort((a, b) => b.percentage - a.percentage)[0] || null
  );
};

async function loadBatchDefinitions(batchId) {
  const [assignmentsSnapshot, testsSnapshot, modulesSnapshot] =
    await Promise.all([
      getDocs(
        query(
          collection(db, "assignments"),
          where("batchId", "==", batchId)
        )
      ),
      getDocs(
        query(
          collection(db, "mcqTests"),
          where("batchId", "==", batchId)
        )
      ),
      getDocs(collection(db, "modules")),
    ]);

  const modules = modulesSnapshot.docs.map((moduleDoc) => ({
    id: moduleDoc.id,
    ...moduleDoc.data(),
  }));

  const excludedModuleIds = new Set(
    modules
      .filter(isExcludedModule)
      .map((module) => module.id)
  );

  const assignments = assignmentsSnapshot.docs
    .map((assignmentDoc) => ({
      id: assignmentDoc.id,
      ...assignmentDoc.data(),
    }))
    .filter((definition) => {
      if (excludedModuleIds.has(definition.moduleId)) {
        return false;
      }

      const type = definition.type || definition.assignmentType;

      return (
        isAssignmentType(type) ||
        isProjectType(type)
      ) && !isCapstoneType(type);
    });

  const tests = testsSnapshot.docs
    .map((testDoc) => ({
      id: testDoc.id,
      ...testDoc.data(),
    }))
    .filter(
      (test) =>
        !excludedModuleIds.has(test.moduleId)
    );

  return {
    assignments,
    tests,
  };
}

async function calculateStudentPerformance(
  student,
  assignments,
  tests
) {
  const email = student?.email;

  if (!email) {
    return null;
  }

  const [submissionsSnapshot, mcqResultsSnapshot] =
    await Promise.all([
      getDocs(
        query(
          collection(db, "submissions"),
          where("studentEmail", "==", email)
        )
      ),
      getDocs(
        query(
          collection(db, "mcqResults"),
          where("studentEmail", "==", email)
        )
      ),
    ]);

  const submissions = submissionsSnapshot.docs.map(
    (submissionDoc) => ({
      id: submissionDoc.id,
      ...submissionDoc.data(),
    })
  );

  const mcqResults = mcqResultsSnapshot.docs.map(
    (resultDoc) => ({
      id: resultDoc.id,
      ...resultDoc.data(),
    })
  );

  const scores = [];
  const countedAssessments = [];

  /* ---------------------------------------------------------
     ASSIGNMENTS + PROJECTS
     --------------------------------------------------------- */
  for (const definition of assignments) {
    const definitionSubmissions = submissions.filter(
      (submission) =>
        submission.assignmentId === definition.id
    );

    const best = getBestEvaluatedSubmission(
      definitionSubmissions,
      definition
    );

    if (!best) continue;

    scores.push(best.percentage);

    countedAssessments.push({
      type: isProjectType(
        definition.type || definition.assignmentType
      )
        ? "project"
        : "assignment",
      id: definition.id,
      percentage: best.percentage,
    });
  }

  /* ---------------------------------------------------------
     MINI-TESTS
     --------------------------------------------------------- */
  const testsById = new Map(
    tests.map((test) => [test.id, test])
  );

  const resultsByTestId = new Map();

  for (const result of mcqResults) {
    const testDefinition = testsById.get(result.testId);

    // The test definition is the source of truth for batch ownership.
    if (!testDefinition) continue;

    if (!resultsByTestId.has(result.testId)) {
      resultsByTestId.set(result.testId, []);
    }

    resultsByTestId.get(result.testId).push(result);
  }

  for (const test of tests) {
    const results = resultsByTestId.get(test.id) || [];
    const best = getBestMiniTestResult(results, test);

    if (!best) continue;

    scores.push(best.percentage);

    countedAssessments.push({
      type: "mini-test",
      id: test.id,
      percentage: best.percentage,
    });
  }

  if (!scores.length) {
    return {
      email,
      average: null,
      assessmentCount: 0,
      assessments: [],
    };
  }

  const average = Number(
    (
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length
    ).toFixed(2)
  );

  return {
    email,
    average,
    assessmentCount: scores.length,
    assessments: countedAssessments,
  };
}

/**
 * Calculate the current student's rank within their batch.
 *
 * Ranking is based on the average percentage of ALL evaluated:
 *   - Mini-Tests
 *   - Assignments
 *   - Projects
 *
 * Each counted assessment has equal weight.
 * Capstone, pending evaluations and unevaluated submissions are excluded.
 *
 * Equal averages receive competition ranking:
 *   1, 1, 3, 4...
 *
 * @param {string} studentEmail - Current student's email.
 * @param {string} batchId - Current student's batch ID.
 * @returns {Promise<number|null>} Current student's batch rank.
 */
export async function getBatchRank(studentEmail, batchId) {
  try {
    if (!studentEmail || !batchId) {
      return null;
    }

    const studentsSnapshot = await getDocs(
      query(
        collection(db, "students"),
        where("batchId", "==", batchId)
      )
    );

    if (studentsSnapshot.empty) {
      return null;
    }

    const students = studentsSnapshot.docs.map(
      (studentDoc) => ({
        id: studentDoc.id,
        ...studentDoc.data(),
      })
    );

    const { assignments, tests } =
      await loadBatchDefinitions(batchId);

    const performanceResults = await Promise.all(
      students.map((student) =>
        calculateStudentPerformance(
          student,
          assignments,
          tests
        )
      )
    );

    const rankedStudents = performanceResults
      .filter(
        (result) =>
          result &&
          Number.isFinite(result.average)
      )
      .sort((a, b) => b.average - a.average);

    if (!rankedStudents.length) {
      return null;
    }

    let currentRank = 0;
    let previousAverage = null;

    for (let index = 0; index < rankedStudents.length; index++) {
      const current = rankedStudents[index];

      if (
        previousAverage === null ||
        current.average !== previousAverage
      ) {
        currentRank = index + 1;
        previousAverage = current.average;
      }

      current.rank = currentRank;
    }

    const requestedEmail = normalise(studentEmail);

    const currentStudent = rankedStudents.find(
      (student) =>
        normalise(student.email) === requestedEmail
    );

    console.log("=================================");
    console.log("BATCH RANK CALCULATION");
    console.log("Batch:", batchId);
    console.log(
      "Ranked Students:",
      rankedStudents.map((student) => ({
        email: student.email,
        average: student.average,
        assessmentCount: student.assessmentCount,
        rank: student.rank,
      }))
    );
    console.log("=================================");

    return currentStudent?.rank ?? null;
  } catch (error) {
    console.error(
      "Batch Rank Calculation Failed:",
      error
    );
    return null;
  }
}
