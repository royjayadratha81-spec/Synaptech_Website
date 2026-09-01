import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* =========================================================
   COMMON HELPERS
========================================================= */

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return null;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimestamp(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function percentage(score, maximum) {
  const s = Number(score || 0);
  const m = Number(maximum || 0);

  if (!m) return 0;

  return Number(((s / m) * 100).toFixed(1));
}

function scoreDisplay(score, maximum) {
  if (score === null || score === undefined) return null;
  return `${score}/${maximum}`;
}

function normaliseType(value) {
  return String(value || "").trim().toLowerCase();
}

function isAssignmentType(type) {
  return normaliseType(type) === "assignment";
}

function isProjectType(type) {
  return normaliseType(type) === "project";
}

function isCapstoneType(type) {
  return normaliseType(type) === "capstone project";
}

function normalizeModuleName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const EXCLUDED_ASSESSMENT_MODULES = new Set([
  "interviewquestionsanswers",
]);

function isExcludedAssessmentModule(moduleName) {
  return EXCLUDED_ASSESSMENT_MODULES.has(
    normalizeModuleName(moduleName)
  );
}

/*
  A submission can be linked to its batch either directly
  or indirectly through the assessment definition.
*/
function belongsToBatch(item, definition, batchId) {
  if (!batchId) return true;

  if (item?.batchId && item.batchId === batchId) {
    return true;
  }

  if (definition?.batchId && definition.batchId === batchId) {
    return true;
  }

  return false;
}

function latestByTimestamp(items, dateFields = []) {
  if (!items.length) return null;

  return [...items].sort((a, b) => {
    const getDate = (item) => {
      for (const field of dateFields) {
        if (item?.[field]) return getTimestamp(item[field]);
      }
      return 0;
    };

    return getDate(b) - getDate(a);
  })[0];
}

function bestEvaluatedSubmission(items) {
  const evaluated = items.filter(
    (item) => item?.evaluated === true
  );

  if (!evaluated.length) return null;

  return [...evaluated].sort(
    (a, b) => Number(b?.marks || 0) - Number(a?.marks || 0)
  )[0];
}

/* =========================================================
   LOAD COMMON ASSESSMENT DATA
========================================================= */

async function loadAssessmentSources(studentEmail, batchId) {
  const [
    submissionsSnapshot,
    mcqResultsSnapshot,
    modulesSnapshot,
    assignmentsSnapshot,
    testsSnapshot,
  ] = await Promise.all([
    getDocs(
      query(
        collection(db, "submissions"),
        where("studentEmail", "==", studentEmail)
      )
    ),

    getDocs(
      query(
        collection(db, "mcqResults"),
        where("studentEmail", "==", studentEmail)
      )
    ),

    getDocs(collection(db, "modules")),
    getDocs(collection(db, "assignments")),
    getDocs(collection(db, "mcqTests")),
  ]);

  const modules = modulesSnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  modules.sort(
    (a, b) =>
      Number(a.moduleOrder || 999) -
      Number(b.moduleOrder || 999)
  );

  const moduleMap = {};
  modules.forEach((module) => {
    moduleMap[module.id] = {
      ...module,
      moduleName:
        module.moduleName ||
        module.name ||
        module.title ||
        module.id,
    };
  });

  const assignments = assignmentsSnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  const assignmentMap = {};
  assignments.forEach((assignment) => {
    assignmentMap[assignment.id] = assignment;
  });

  const tests = testsSnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  const testMap = {};
  tests.forEach((test) => {
    testMap[test.id] = test;
  });

  /*
    Only definitions belonging to the student's batch are used.
    This prevents June/July/August assessments leaking into one
    another.
  */
  const batchAssignments = assignments.filter(
    (item) =>
      (!batchId || item.batchId === batchId) &&
      item.active !== false
  );

  const batchTests = tests.filter(
    (item) => !batchId || item.batchId === batchId
  );

  const submissions = submissionsSnapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .filter((item) => {
      const definition = assignmentMap[item.assignmentId];

      /*
        A submission is usable only when its assignment definition
        still exists in the student's current batch. This prevents
        historical submissions from deleted/old assignments from
        entering analytics or feedback.
      */
      if (!definition) return false;
      if (definition.active === false) return false;

      return (
        (!batchId || definition.batchId === batchId) &&
        belongsToBatch(item, definition, batchId)
      );
    });

  const mcqResults = mcqResultsSnapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .filter((item) => {
      const test = testMap[item.testId];
      return belongsToBatch(item, test, batchId);
    });

  return {
    modules,
    moduleMap,
    assignments: batchAssignments,
    assignmentMap,
    tests: batchTests,
    testMap,
    submissions,
    mcqResults,
  };
}

/* =========================================================
   ASSESSMENT OVERVIEW ANALYTICS

   Deliberately excludes Capstone because Capstone is
   course-level and does not belong to a module.
========================================================= */

export async function loadAssignmentAnalytics(
  studentEmail,
  batchId
) {
  if (!studentEmail) return [];

  /*
    IMPORTANT:
    The Assessment Overview chart must use the exact same canonical
    assessment data as the Assessment History table.

    Do NOT build chart scores directly from the student's entire
    submissions history. An old evaluated submission can otherwise
    appear in the chart even when that submission belongs to an old
    assignment definition which is no longer part of the current
    assessment table.

    loadAssessmentTable already:
      - limits definitions to the student's batch
      - matches submissions to the assignment definition
      - requires evaluated === true for a score
      - keeps uploaded-but-not-submitted / submitted-but-not-evaluated
        work out of the score
      - keeps Capstone separate
      - selects the current Mini-Test definition/result

    Therefore the chart is deliberately derived from that table.
  */

  const tableRows = await loadAssessmentTable(
    studentEmail,
    batchId
  );

  const scoreToPercentage = (score) => {
    if (score === null || score === undefined) return 0;

    const match = String(score).match(
      /(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/
    );

    if (!match) return 0;

    const obtained = Number(match[1]);
    const maximum = Number(match[2]);

    if (!Number.isFinite(obtained) || !Number.isFinite(maximum)) {
      return 0;
    }

    return maximum > 0
      ? Number(((obtained / maximum) * 100).toFixed(1))
      : 0;
  };

  return (tableRows || [])
    .filter(
      (row) =>
        !row.isCapstone &&
        !isExcludedAssessmentModule(row.module)
    )
    .map((row) => ({
      moduleId: row.moduleId,
      module: row.module,

      /*
        A score is shown only when the corresponding assessment
        is actually completed/evaluated in the canonical table.
      */
      mcq: row.mcqCompleted
        ? scoreToPercentage(row.mcqScore)
        : 0,

      assignment: row.assignmentCompleted
        ? scoreToPercentage(row.assignmentScore)
        : 0,

      project: row.projectCompleted
        ? scoreToPercentage(row.projectScore)
        : 0,

      mcqMarks: row.mcqCompleted
        ? row.mcqScore
        : null,

      assignmentMarks: row.assignmentCompleted
        ? row.assignmentScore
        : null,

      projectMarks: row.projectCompleted
        ? row.projectScore
        : null,

      mcqCompleted: Boolean(row.mcqCompleted),
      assignmentCompleted: Boolean(row.assignmentCompleted),
      projectCompleted: Boolean(row.projectCompleted),

      mcqDisplay: row.mcqCompleted
        ? row.mcqScore
        : null,

      assignmentDisplay: row.assignmentCompleted
        ? row.assignmentScore
        : null,

      projectDisplay: row.projectCompleted
        ? row.projectScore
        : null,
    }));
}

/* =========================================================
   LATEST FEEDBACK
========================================================= */

export async function loadLatestFeedback(
  studentEmail,
  batchId
) {
  if (!studentEmail) return null;

  const {
    assignmentMap,
    submissions,
  } = await loadAssessmentSources(
    studentEmail,
    batchId
  );

  const evaluated = submissions.filter(
    (item) =>
      item.evaluated === true &&
      !isCapstoneType(
        item.assignmentType || item.type
      )
  );

  if (!evaluated.length) return null;

  const sorted = [...evaluated].sort(
    (a, b) =>
      getTimestamp(
        b.evaluationDate || b.submittedAt
      ) -
      getTimestamp(
        a.evaluationDate || a.submittedAt
      )
  );

  return {
    ...sorted[0],
    assignmentDefinition:
      assignmentMap[sorted[0].assignmentId] || null,
  };
}

/* =========================================================
   CONSOLIDATED ASSESSMENT HISTORY

   One row per module.

   Each assessment category contains:
     - Due Date
     - Score
     - Upload Date
     - Status

   Capstone is returned separately and never becomes a
   module row.
========================================================= */

export async function loadAssessmentTable(
  studentEmail,
  batchId
) {
  if (!studentEmail) return [];

  const {
    modules,
    moduleMap,
    assignments,
    assignmentMap,
    tests,
    testMap,
    submissions,
    mcqResults,
  } = await loadAssessmentSources(studentEmail, batchId);

  const rows = {};

  /* -------------------------------------------------------
     INITIALISE EVERY MODULE
  ------------------------------------------------------- */

  modules.forEach((module) => {
    rows[module.id] = {
      id: `module-${module.id}`,
      moduleId: module.id,
      module:
        module.moduleName ||
        module.name ||
        module.title ||
        module.id,

      categories: [],

      mcqExists: false,
      assignmentExists: false,
      projectExists: false,

      mcqDueDate: null,
      mcqScore: null,
      mcqUploadDate: null,
      mcqStatus: "Not Started",

      assignmentDueDate: null,
      assignmentScore: null,
      assignmentUploadDate: null,
      assignmentStatus: "Not Started",

      projectDueDate: null,
      projectScore: null,
      projectUploadDate: null,
      projectStatus: "Not Started",

      mcqCompleted: false,
      assignmentCompleted: false,
      projectCompleted: false,

      latestAssessment: null,
      latestActivity: null,
      latestActivityTimestamp: 0,

      status: "Not Started",
    };
  });

  /* -------------------------------------------------------
     FIND ASSESSMENT DEFINITIONS FOR EACH MODULE
  ------------------------------------------------------- */

  assignments.forEach((definition) => {
    const moduleId = definition.moduleId;
    if (!moduleId || !rows[moduleId]) return;

    const type = definition.type || "";

    if (isAssignmentType(type)) {
      rows[moduleId].assignmentExists = true;
      rows[moduleId].assignmentDueDate =
        formatDate(definition.dueDate);
    }

    if (isProjectType(type)) {
      rows[moduleId].projectExists = true;
      rows[moduleId].projectDueDate =
        formatDate(definition.dueDate);
    }
  });

  tests.forEach((test) => {
    const moduleId = test.moduleId;
    if (!moduleId || !rows[moduleId]) return;

    /*
      One Mini-Test definition per module is expected.
      If multiple exist, keep the latest active test.
    */
    const current = rows[moduleId];

    const currentTimestamp = getTimestamp(
      current.mcqDefinitionStart
    );

    const newTimestamp = getTimestamp(
      test.startAt ||
      test.startDate ||
      test.createdAt
    );

    if (
      !current.mcqExists ||
      newTimestamp >= currentTimestamp
    ) {
      current.mcqExists = true;

      current.mcqDueDate = formatDate(
        test.endAt ||
        test.endDate ||
        test.availableUntil ||
        test.dueDate
      );

      current.mcqDefinitionStart =
        test.startAt ||
        test.startDate ||
        test.createdAt;

      current.mcqDefinitionId = test.id;
    }
  });

  /* -------------------------------------------------------
     SUBMISSIONS

     We keep:
       - latest upload date/status
       - best evaluated score

     Therefore a student who has an old evaluated score
     but has just uploaded a new attempt will see:
       score = best evaluated score
       status = Evaluation Awaited
  ------------------------------------------------------- */

  const submissionsByAssignment = {};

  submissions.forEach((submission) => {
    const assignmentId = submission.assignmentId;
    if (!assignmentId) return;

    if (!submissionsByAssignment[assignmentId]) {
      submissionsByAssignment[assignmentId] = [];
    }

    submissionsByAssignment[assignmentId].push(
      submission
    );
  });

  assignments.forEach((definition) => {
    const moduleId = definition.moduleId;
    if (!moduleId || !rows[moduleId]) return;

    const type = definition.type || "";
    const submissionList =
      submissionsByAssignment[definition.id] || [];

    if (isCapstoneType(type)) {
      return;
    }

    const latestSubmission = latestByTimestamp(
      submissionList,
      [
        "submittedAt",
        "createdAt",
      ]
    );

    const bestSubmission =
      bestEvaluatedSubmission(submissionList);

    const row = rows[moduleId];

    if (isAssignmentType(type)) {
      if (latestSubmission) {
        row.assignmentUploadDate =
          formatDate(
            latestSubmission.submittedAt ||
            latestSubmission.createdAt
          );

        row.assignmentStatus =
          latestSubmission.evaluated === true
            ? "Complete"
            : "Submitted — Evaluation Awaited";

        row.latestActivityTimestamp =
          Math.max(
            row.latestActivityTimestamp,
            getTimestamp(
              latestSubmission.evaluationDate ||
              latestSubmission.submittedAt ||
              latestSubmission.createdAt
            )
          );

        row.latestAssessment =
          "Assignment";
      }

      if (bestSubmission) {
        const marks = Number(
          bestSubmission.marks || 0
        );

        row.assignmentScore =
          scoreDisplay(marks, 20);

        row.assignmentCompleted = true;
      }

      if (
        !row.categories.includes("Assignment")
      ) {
        row.categories.push("Assignment");
      }
    }

    if (isProjectType(type)) {
      if (latestSubmission) {
        row.projectUploadDate =
          formatDate(
            latestSubmission.submittedAt ||
            latestSubmission.createdAt
          );

        row.projectStatus =
          latestSubmission.evaluated === true
            ? "Complete"
            : "Submitted — Evaluation Awaited";

        row.latestActivityTimestamp =
          Math.max(
            row.latestActivityTimestamp,
            getTimestamp(
              latestSubmission.evaluationDate ||
              latestSubmission.submittedAt ||
              latestSubmission.createdAt
            )
          );

        row.latestAssessment =
          "Project";
      }

      if (bestSubmission) {
        const marks = Number(
          bestSubmission.marks || 0
        );

        row.projectScore =
          scoreDisplay(marks, 20);

        row.projectCompleted = true;
      }

      if (
        !row.categories.includes("Project")
      ) {
        row.categories.push("Project");
      }
    }
  });

  /* -------------------------------------------------------
     MINI-TEST RESULTS
  ------------------------------------------------------- */

  const resultsByTest = {};

  mcqResults.forEach((result) => {
    const testId = result.testId;
    if (!testId) return;

    if (!resultsByTest[testId]) {
      resultsByTest[testId] = [];
    }

    resultsByTest[testId].push(result);
  });

  /*
    Process each module's selected Mini-Test definition.
  */
  Object.values(rows).forEach((row) => {
    if (!row.mcqDefinitionId) return;

    const test = testMap[row.mcqDefinitionId];
    if (!test) return;

    const resultList =
      resultsByTest[test.id] || [];

    row.mcqDueDate = formatDate(
      test.endAt ||
      test.endDate ||
      test.availableUntil ||
      test.dueDate
    );

    if (resultList.length) {
      const latestResult = latestByTimestamp(
        resultList,
        [
          "submittedAt",
          "completedAt",
          "createdAt",
        ]
      );

      const bestResult = [...resultList].sort(
        (a, b) => {
          const aScore =
            Number(a.score || 0) /
            Number(
              a.totalQuestions ||
              a.maxScore ||
              10
            );

          const bScore =
            Number(b.score || 0) /
            Number(
              b.totalQuestions ||
              b.maxScore ||
              10
            );

          return bScore - aScore;
        }
      )[0];

      const maximum = Number(
        bestResult?.totalQuestions ||
        bestResult?.maxScore ||
        test.questionCount ||
        10
      );

      row.mcqScore = bestResult
        ? scoreDisplay(
            Number(bestResult.score || 0),
            maximum
          )
        : null;

      row.mcqUploadDate =
        formatDate(
          latestResult?.submittedAt ||
          latestResult?.completedAt ||
          latestResult?.createdAt
        );

      row.mcqStatus = "Complete";
      row.mcqCompleted = true;

      row.latestActivityTimestamp =
        Math.max(
          row.latestActivityTimestamp,
          getTimestamp(
            latestResult?.submittedAt ||
            latestResult?.completedAt ||
            latestResult?.createdAt
          )
        );

      row.latestAssessment =
        "Mini-Test";
    }

    if (!row.categories.includes("Mini-Test")) {
      row.categories.push("Mini-Test");
    }
  });

  /* -------------------------------------------------------
     FINALISE MODULE STATUS
  ------------------------------------------------------- */

  const moduleRows = Object.values(rows).map(
    (row) => {
      const pendingEvaluation =
        row.assignmentStatus ===
          "Submitted — Evaluation Awaited" ||
        row.projectStatus ===
          "Submitted — Evaluation Awaited";

      const allThreeComplete =
        row.mcqCompleted &&
        row.assignmentCompleted &&
        row.projectCompleted;

      if (allThreeComplete) {
        row.status = "Complete";
      } else if (pendingEvaluation) {
        row.status = "Evaluation Awaited";
      } else if (
        row.mcqCompleted ||
        row.assignmentCompleted ||
        row.projectCompleted
      ) {
        row.status = "In Progress";
      } else {
        row.status = "Not Started";
      }

      row.latestActivity =
        row.latestActivityTimestamp
          ? formatDate(
              row.latestActivityTimestamp
            )
          : null;

      return row;
    }
  );

  /* -------------------------------------------------------
     PRESERVE MODULE ORDER
  ------------------------------------------------------- */

  moduleRows.sort((a, b) => {
    const orderA =
      Number(
        moduleMap[a.moduleId]?.moduleOrder ||
        999
      );

    const orderB =
      Number(
        moduleMap[b.moduleId]?.moduleOrder ||
        999
      );

    return orderA - orderB;
  });

  /* -------------------------------------------------------
     CAPSTONE

     Capstone is course-level. It is NOT attached to a module.

     Important:
       - Show every current Capstone Project definition.
       - If there is no student submission: Not Started.
       - If submitted but not evaluated: Evaluation Awaited.
       - If evaluated: Complete.
       - Keep the best evaluated score if there are multiple
         submissions for the same capstone.
  ------------------------------------------------------- */

  const capstoneMap = {};

  assignments
    .filter((definition) => isCapstoneType(definition.type))
    .forEach((definition) => {
      capstoneMap[definition.id] = {
        id: definition.id,
        assignmentId: definition.id,
        title:
          definition.title ||
          "Capstone Project",
        dueDate:
          formatDate(definition.dueDate),
        score: null,
        submissionDate: null,
        status: "Not Started",
        maximum:
          Number(definition.maximumMarks || 50),
        _bestMarks: 0,
        _latestSubmissionTimestamp: 0,
      };
    });

  submissions.forEach((submission) => {
    const definition =
      assignmentMap[submission.assignmentId];

    const type =
      submission.assignmentType ||
      submission.type ||
      definition?.type ||
      "";

    if (!isCapstoneType(type)) return;

    // Only current batch capstones are allowed because
    // submissions have already been batch-filtered above.
    if (!definition) return;

    if (!capstoneMap[submission.assignmentId]) {
      capstoneMap[submission.assignmentId] = {
        id: submission.assignmentId,
        assignmentId: submission.assignmentId,
        title:
          definition.title ||
          submission.assignmentTitle ||
          "Capstone Project",
        dueDate:
          formatDate(definition.dueDate),
        score: null,
        submissionDate: null,
        status: "Not Started",
        maximum:
          Number(definition.maximumMarks || 50),
        _bestMarks: 0,
        _latestSubmissionTimestamp: 0,
      };
    }

    const capstone =
      capstoneMap[submission.assignmentId];

    const submissionTimestamp =
      getTimestamp(
        submission.submittedAt ||
        submission.createdAt
      );

    if (
      submissionTimestamp >
      capstone._latestSubmissionTimestamp
    ) {
      capstone._latestSubmissionTimestamp =
        submissionTimestamp;

      capstone.submissionDate =
        formatDate(
          submission.submittedAt ||
          submission.createdAt
        );

      capstone.status =
        submission.evaluated === true
          ? "Complete"
          : "Evaluation Awaited";
    }

    if (
      submission.evaluated === true &&
      Number(submission.marks || 0) >=
        Number(capstone._bestMarks || 0)
    ) {
      capstone._bestMarks =
        Number(submission.marks || 0);

      capstone.score =
        scoreDisplay(
          Number(submission.marks || 0),
          capstone.maximum
        );
    }
  });

  const capstones = Object.values(capstoneMap).map(
    (capstone) => ({
      ...capstone,
      percentage:
        capstone.score !== null
          ? percentage(
              capstone._bestMarks,
              capstone.maximum
            )
          : 0,
      isCapstone: true,
      moduleId: null,
      module: "Course-Level",
      topic: "Course-Level Capstone",
      categories: ["Capstone"],
      latestAssessment: "Capstone Project",
    })
  );

  return [
    ...moduleRows,
    ...capstones,
  ];
}
