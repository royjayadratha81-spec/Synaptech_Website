import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* =========================================================
   CANONICAL ASSESSMENT DATA SERVICE — PHASE 1

   Architecture contract:
   Firebase definitions/submissions/results
          ↓
   loadAssessmentTable()   ← SINGLE SOURCE OF TRUTH
          ↓
   AssessmentHistoryTable
   AssessmentSummaryCards
   AssessmentAnalytics
   Assignment / Project evaluation views

   Course-module completion is intentionally NOT calculated here.
   This service is only for assessment/evaluation state.

   Interview Questions & Answers is excluded everywhere.
   Capstone remains course-level and outside module rows.
========================================================= */

const INTERVIEW_MODULE = "interviewquestionsanswers";

function normalise(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") return value.toDate();
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getTimestamp(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
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

function formatDateRange(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate && !endDate) return "—";
  if (startDate && endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }
  if (startDate) return `${formatDate(startDate)} – —`;
  return `— – ${formatDate(endDate)}`;
}

function percentage(score, maximum) {
  const s = Number(score || 0);
  const m = Number(maximum || 0);
  if (!m) return 0;
  return Number(((s / m) * 100).toFixed(1));
}

function scoreDisplay(score, maximum) {
  if (score === null || score === undefined || score === "") return null;
  return `${score}/${maximum}`;
}

function isAssignmentType(value) {
  return normalise(value) === "assignment";
}

function isProjectType(value) {
  return normalise(value) === "project";
}

function isCapstoneType(value) {
  return normalise(value) === "capstoneproject";
}

function isInterviewModule(value) {
  return normalise(value) === INTERVIEW_MODULE;
}

function latestByDate(items) {
  if (!items?.length) return null;

  return [...items].sort(
    (a, b) =>
      getTimestamp(
        b.submittedAt ||
          b.completedAt ||
          b.createdAt ||
          b.evaluationDate
      ) -
      getTimestamp(
        a.submittedAt ||
          a.completedAt ||
          a.createdAt ||
          a.evaluationDate
      )
  )[0];
}

function bestEvaluated(items) {
  const evaluated = (items || []).filter(
    (item) => item?.evaluated === true
  );

  if (!evaluated.length) return null;

  return [...evaluated].sort(
    (a, b) => Number(b?.marks || 0) - Number(a?.marks || 0)
  )[0];
}

function updateModuleDateWindow(row, start, end, fallback) {
  const startDate = toDate(start) || toDate(fallback);
  const endDate = toDate(end) || toDate(fallback);

  if (startDate && (!row.dateStart || startDate < row.dateStart)) {
    row.dateStart = startDate;
  }

  if (endDate && (!row.dateEnd || endDate > row.dateEnd)) {
    row.dateEnd = endDate;
  }
}

/* =========================================================
   FIREBASE SOURCE LOADER
========================================================= */

async function loadSources(studentEmail, batchId) {
  const [
    submissionsSnapshot,
    mcqSnapshot,
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

  const modules = modulesSnapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
      moduleName:
        docItem.data().moduleName ||
        docItem.data().name ||
        docItem.data().title ||
        docItem.id,
      moduleOrder: Number(docItem.data().moduleOrder || 999),
    }))
    .filter((module) => !isInterviewModule(module.moduleName))
    .sort((a, b) => a.moduleOrder - b.moduleOrder);

  const assignments = assignmentsSnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  const tests = testsSnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  const assignmentMap = Object.fromEntries(
    assignments.map((item) => [item.id, item])
  );

  const testMap = Object.fromEntries(
    tests.map((item) => [item.id, item])
  );

  /*
     Definitions are batch-scoped. This is essential for both:
     - historically enrolled students
     - future students

     A current student's batch can never see another batch's
     assessment definition merely because the module is shared.
  */
  const batchAssignments = assignments.filter((item) => {
    if (item.active === false) return false;
    if (!item.moduleId && !isCapstoneType(item.type || item.assignmentType)) {
      return false;
    }
    return !batchId || item.batchId === batchId;
  });

  const batchTests = tests.filter((item) => {
    if (item.active === false) return false;
    if (!item.moduleId) return false;
    return !batchId || item.batchId === batchId;
  });

  /*
     Historical submission filtering follows the assessment definition
     whenever possible. We deliberately do NOT trust an arbitrary
     submission.batchId over the definition's batchId.
  */
  const submissions = submissionsSnapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((submission) => {
      if (!batchId) return true;

      const definition = assignmentMap[submission.assignmentId];
      if (!definition) return false;

      return definition.batchId === batchId;
    });

  const mcqResults = mcqSnapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((result) => {
      if (!batchId) return true;

      const definition = testMap[result.testId];
      if (!definition) return false;

      return definition.batchId === batchId;
    });

  return {
    modules,
    assignments: batchAssignments,
    tests: batchTests,
    assignmentMap,
    testMap,
    submissions,
    mcqResults,
  };
}

/* =========================================================
   EMPTY MODULE ROW

   IMPORTANT: The row contract preserves the fields already used
   by the evaluation pages and by AssessmentSummaryCards.
========================================================= */

function createEmptyRow(module) {
  return {
    id: `module-${module.id}`,
    moduleId: module.id,
    module: module.moduleName,
    topic: module.moduleName,

    dateStart: null,
    dateEnd: null,
    dateRange: "—",

    mcqExists: false,
    assignmentExists: false,
    projectExists: false,

    mcq: null,
    assignment: null,
    project: null,

    mcqMarks: null,
    assignmentMarks: null,
    projectMarks: null,

    mcqMaximum: null,
    assignmentMaximum: 20,
    projectMaximum: 20,

    mcqScore: null,
    assignmentScore: null,
    projectScore: null,

    mcqCompleted: false,
    assignmentCompleted: false,
    projectCompleted: false,

    mcqEvaluated: false,
    assignmentEvaluated: false,
    projectEvaluated: false,

    mcqStatus: "Not Started",
    assignmentStatus: "Not Started",
    projectStatus: "Not Started",

    mcqDueDate: null,
    assignmentDueDate: null,
    projectDueDate: null,

    mcqSubmissionDate: null,
    assignmentSubmissionDate: null,
    projectSubmissionDate: null,

    mcqUploadDate: null,
    assignmentUploadDate: null,
    projectUploadDate: null,

    mcqEvaluationDate: null,
    assignmentEvaluationDate: null,
    projectEvaluationDate: null,

    latestAssessment: null,
    latestActivity: null,
    latestActivityTimestamp: 0,

    status: "Not Started",
    assessmentConfigured: false,
    categories: [],
  };
}

/* =========================================================
   MODULE STATUS

   HISTORY-TABLE RULE — FIXED CONTRACT:

   Complete:
     Mini-Test + Assignment + Project are all evaluated/completed.

   Evaluation Awaited:
     All three assessment activities have been submitted/recorded,
     but at least one is still awaiting evaluation.

   In Progress:
     Any assessment activity exists, but the module has not reached
     the above two states.

   Not Started:
     No assessment activity exists.

   NOTE:
     This intentionally treats the three assessment columns as the
     module's assessment lifecycle. Course Modules completion is a
     separate concept and is NOT used here.
========================================================= */

function finaliseModuleStatus(row) {
  /*
    HISTORY STATUS CONTRACT
    -----------------------
    The history table always represents the three assessment slots:
      1. Mini-Test
      2. Assignment
      3. Project

    A module can become COMPLETE only when ALL THREE are configured
    and all THREE have been evaluated.

    This is intentionally different from Course Module completion.
    A module having only a completed Mini-Test must remain In Progress
    in Assessment History until Assignment and Project are also present
    and evaluated. This prevents a module such as NumPy from becoming
    Complete merely because its only currently configured assessment is
    complete.
  */
  const states = {
    mcq: row.mcqExists ? row.mcqStatus : "Not Started",
    assignment: row.assignmentExists
      ? row.assignmentStatus
      : "Not Started",
    project: row.projectExists
      ? row.projectStatus
      : "Not Started",
  };

  const allThreeConfigured =
    row.mcqExists === true &&
    row.assignmentExists === true &&
    row.projectExists === true;

  const allThreeComplete =
    allThreeConfigured &&
    states.mcq === "Complete" &&
    states.assignment === "Complete" &&
    states.project === "Complete";

  const allThreeSubmitted =
    allThreeConfigured &&
    [states.mcq, states.assignment, states.project].every(
      (state) =>
        state === "Complete" ||
        state === "Evaluation Awaited"
    );

  const anyActivity =
    [states.mcq, states.assignment, states.project].some(
      (state) => state !== "Not Started"
    );

  row.assessmentConfigured =
    row.mcqExists ||
    row.assignmentExists ||
    row.projectExists;

  if (!row.assessmentConfigured) {
    row.status = "Not Started";
    return row;
  }

  if (allThreeComplete) {
    row.status = "Complete";
    return row;
  }

  if (
    allThreeSubmitted &&
    [states.mcq, states.assignment, states.project].some(
      (state) => state === "Evaluation Awaited"
    )
  ) {
    row.status = "Evaluation Awaited";
    return row;
  }

  row.status = anyActivity
    ? "In Progress"
    : "Not Started";

  return row;
}

/* =========================================================
   CANONICAL ASSESSMENT HISTORY
========================================================= */

export async function loadAssessmentTable(studentEmail, batchId) {
  if (!studentEmail) return [];

  const {
    modules,
    assignments,
    tests,
    assignmentMap,
    testMap,
    submissions,
    mcqResults,
  } = await loadSources(studentEmail, batchId);

  const rows = {};

  modules.forEach((module) => {
    rows[module.id] = createEmptyRow(module);
  });

  /* ---------------------------------------------------------
     ASSESSMENT DEFINITIONS
  --------------------------------------------------------- */

  assignments.forEach((definition) => {
    const row = rows[definition.moduleId];
    if (!row) return;

    const type = definition.type || definition.assignmentType || "";

    if (isAssignmentType(type)) {
      row.assignmentExists = true;
      row.assignmentDueDate = formatDate(definition.dueDate);
      row.assignmentMaximum = Number(
        definition.maximumMarks || definition.maxMarks || 20
      );

      if (!row.categories.includes("Assignment")) {
        row.categories.push("Assignment");
      }
    }

    if (isProjectType(type)) {
      row.projectExists = true;
      row.projectDueDate = formatDate(definition.dueDate);
      row.projectMaximum = Number(
        definition.maximumMarks || definition.maxMarks || 20
      );

      if (!row.categories.includes("Project")) {
        row.categories.push("Project");
      }
    }

    updateModuleDateWindow(
      row,
      definition.createdAt || definition.startAt || definition.startDate,
      definition.dueDate || definition.endAt || definition.endDate,
      null
    );
  });

  /* Mini-Test definition: one active/current test per module. */
  tests.forEach((definition) => {
    const row = rows[definition.moduleId];
    if (!row) return;

    const definitionStart =
      definition.startAt ||
      definition.startDate ||
      definition.availableFrom ||
      definition.createdAt;

    const definitionEnd =
      definition.endAt ||
      definition.endDate ||
      definition.availableUntil ||
      definition.dueDate;

    const currentStart = getTimestamp(row.mcqDefinitionStart);
    const newStart = getTimestamp(definitionStart);

    if (!row.mcqExists || newStart >= currentStart) {
      row.mcqExists = true;
      row.mcqDefinitionId = definition.id;
      row.mcqDefinitionStart = definitionStart;
      row.mcqMaximum = Number(
        definition.totalQuestions ||
          definition.questionCount ||
          definition.maxScore ||
          definition.maximumMarks ||
          10
      );
      row.mcqDueDate = formatDate(definitionEnd);
    }

    if (!row.categories.includes("Mini-Test")) {
      row.categories.push("Mini-Test");
    }

    updateModuleDateWindow(
      row,
      definitionStart,
      definitionEnd,
      null
    );
  });

  /* ---------------------------------------------------------
     ASSIGNMENT / PROJECT SUBMISSIONS

     Current status = latest submission.
     Score = best evaluated submission.
     Evaluation date = best evaluated submission's evaluationDate.
  --------------------------------------------------------- */

  const submissionGroups = {};

  submissions.forEach((submission) => {
    const definition = assignmentMap[submission.assignmentId];
    const type =
      submission.assignmentType ||
      submission.type ||
      definition?.type ||
      "";

    if (!isAssignmentType(type) && !isProjectType(type)) return;

    if (!submissionGroups[submission.assignmentId]) {
      submissionGroups[submission.assignmentId] = [];
    }

    submissionGroups[submission.assignmentId].push({
      ...submission,
      _definition: definition,
      _type: type,
    });
  });

  Object.values(submissionGroups).forEach((group) => {
    const latest = latestByDate(group);
    if (!latest) return;

    const definition = latest._definition;
    const type = latest._type;
    const moduleId = latest.moduleId || definition?.moduleId;
    const row = rows[moduleId];

    if (!row) return;

    const submissionDate =
      latest.submittedAt ||
      latest.createdAt ||
      latest.evaluationDate;

    const evaluatedSubmission = bestEvaluated(group);

    if (isAssignmentType(type)) {
      row.assignmentSubmissionDate = formatDate(submissionDate);
      row.assignmentUploadDate = row.assignmentSubmissionDate;
      row.assignmentStatus =
        latest.evaluated === true
          ? "Complete"
          : "Evaluation Awaited";
      row.assignmentEvaluated = latest.evaluated === true;

      if (evaluatedSubmission) {
        const marks = Number(evaluatedSubmission.marks || 0);
        const maximum = Number(
          definition?.maximumMarks ||
            definition?.maxMarks ||
            20
        );

        row.assignment = scoreDisplay(marks, maximum);
        row.assignmentScore = row.assignment;
        row.assignmentMarks = marks;
        row.assignmentMaximum = maximum;
        row.assignmentCompleted = true;
        row.assignmentEvaluated = true;
        row.assignmentEvaluationDate = formatDate(
          evaluatedSubmission.evaluationDate ||
            evaluatedSubmission.evaluatedAt ||
            evaluatedSubmission.updatedAt
        );
      }
    }

    if (isProjectType(type)) {
      row.projectSubmissionDate = formatDate(submissionDate);
      row.projectUploadDate = row.projectSubmissionDate;
      row.projectStatus =
        latest.evaluated === true
          ? "Complete"
          : "Evaluation Awaited";
      row.projectEvaluated = latest.evaluated === true;

      if (evaluatedSubmission) {
        const marks = Number(evaluatedSubmission.marks || 0);
        const maximum = Number(
          definition?.maximumMarks ||
            definition?.maxMarks ||
            20
        );

        row.project = scoreDisplay(marks, maximum);
        row.projectScore = row.project;
        row.projectMarks = marks;
        row.projectMaximum = maximum;
        row.projectCompleted = true;
        row.projectEvaluated = true;
        row.projectEvaluationDate = formatDate(
          evaluatedSubmission.evaluationDate ||
            evaluatedSubmission.evaluatedAt ||
            evaluatedSubmission.updatedAt
        );
      }
    }

    updateModuleDateWindow(
      row,
      definition?.createdAt || definition?.startAt || definition?.startDate,
      definition?.dueDate || definition?.endAt || definition?.endDate,
      submissionDate
    );

    const activityTime = getTimestamp(
      latest.evaluationDate ||
        latest.submittedAt ||
        latest.createdAt
    );

    if (activityTime > row.latestActivityTimestamp) {
      row.latestActivityTimestamp = activityTime;
      row.latestAssessment = type;
    }
  });

  /* ---------------------------------------------------------
     MINI-TEST RESULTS

     Mini-Test is automatically evaluated on submission.
     Best score is displayed; latest result supplies submission date.
  --------------------------------------------------------- */

  const resultsByTest = {};

  mcqResults.forEach((result) => {
    if (!result.testId) return;
    if (!resultsByTest[result.testId]) {
      resultsByTest[result.testId] = [];
    }
    resultsByTest[result.testId].push(result);
  });

  Object.values(rows).forEach((row) => {
    if (!row.mcqDefinitionId) return;

    const definition = testMap[row.mcqDefinitionId];
    if (!definition) return;

    const results = resultsByTest[definition.id] || [];
    if (!results.length) return;

    const latest = latestByDate(results);

    const best = [...results].sort((a, b) => {
      const aMaximum = Number(
        a.totalQuestions || a.maxScore || row.mcqMaximum || 10
      );
      const bMaximum = Number(
        b.totalQuestions || b.maxScore || row.mcqMaximum || 10
      );

      return (
        percentage(Number(b.score || 0), bMaximum) -
        percentage(Number(a.score || 0), aMaximum)
      );
    })[0];

    const maximum = Number(
      best.totalQuestions ||
        best.maxScore ||
        definition.totalQuestions ||
        definition.questionCount ||
        definition.maxScore ||
        row.mcqMaximum ||
        10
    );

    const score = Number(best.score || 0);

    row.mcq = scoreDisplay(score, maximum);
    row.mcqScore = row.mcq;
    row.mcqMarks = score;
    row.mcqMaximum = maximum;
    row.mcqCompleted = true;
    row.mcqEvaluated = true;
    row.mcqStatus = "Complete";

    const submissionDate =
      latest.submittedAt ||
      latest.completedAt ||
      latest.createdAt;

    row.mcqSubmissionDate = formatDate(submissionDate);
    row.mcqUploadDate = row.mcqSubmissionDate;

    /* Mini-test evaluation is automatic. */
    row.mcqEvaluationDate = formatDate(
      latest.evaluationDate ||
        latest.evaluatedAt ||
        latest.submittedAt ||
        latest.completedAt ||
        latest.createdAt
    );

    updateModuleDateWindow(
      row,
      definition.startAt ||
        definition.startDate ||
        definition.availableFrom ||
        definition.createdAt,
      definition.endAt ||
        definition.endDate ||
        definition.availableUntil ||
        definition.dueDate,
      submissionDate
    );

    const activityTime = getTimestamp(submissionDate);
    if (activityTime > row.latestActivityTimestamp) {
      row.latestActivityTimestamp = activityTime;
      row.latestAssessment = "Mini-Test";
    }
  });

  /* ---------------------------------------------------------
     FINAL MODULE ROWS
  --------------------------------------------------------- */

  const moduleRows = Object.values(rows)
    .map((row) => {
      finaliseModuleStatus(row);

      return {
        ...row,
        dateRange: formatDateRange(row.dateStart, row.dateEnd),
        latestActivity: row.latestActivityTimestamp
          ? formatDate(row.latestActivityTimestamp)
          : null,
        mcqDisplay: row.mcq,
        assignmentDisplay: row.assignment,
        projectDisplay: row.project,
      };
    })
    .sort((a, b) => {
      const moduleA = modules.find((item) => item.id === a.moduleId);
      const moduleB = modules.find((item) => item.id === b.moduleId);
      return (
        Number(moduleA?.moduleOrder || 999) -
        Number(moduleB?.moduleOrder || 999)
      );
    });

  /* ---------------------------------------------------------
     COURSE-LEVEL CAPSTONE
  --------------------------------------------------------- */

  const capstoneDefinitions = assignments.filter((definition) =>
    isCapstoneType(definition.type || definition.assignmentType)
  );

  const capstoneRows = capstoneDefinitions.map((definition) => {
    const related = submissions.filter(
      (submission) =>
        submission.assignmentId === definition.id &&
        isCapstoneType(
          submission.assignmentType ||
            submission.type ||
            definition.type
        )
    );

    const latest = latestByDate(related);
    const best = bestEvaluated(related);
    const maximum = Number(
      definition.maximumMarks ||
        definition.maxMarks ||
        50
    );

    let status = "Not Started";
    let score = null;
    let percentageValue = null;
    let submissionDate = null;
    let evaluationDate = null;

    if (latest) {
      submissionDate = formatDate(
        latest.submittedAt ||
          latest.createdAt ||
          latest.evaluationDate
      );

      status =
        latest.evaluated === true
          ? "Complete"
          : "Evaluation Awaited";
    }

    if (best) {
      const marks = Number(best.marks || 0);
      score = scoreDisplay(marks, maximum);
      percentageValue = percentage(marks, maximum);
      evaluationDate = formatDate(
        best.evaluationDate ||
          best.evaluatedAt ||
          best.updatedAt
      );
    }

    return {
      id: `capstone-${definition.id}`,
      assignmentId: definition.id,
      moduleId: null,
      module: "Course-Level",
      topic: "Course-Level Capstone",
      title: definition.title || "Capstone Project",
      maximum,
      score,
      marks: score,
      percentage: percentageValue,
      dueDate: formatDate(definition.dueDate),
      submissionDate,
      uploadDate: submissionDate,
      evaluationDate,
      dateRange: formatDateRange(
        definition.createdAt || definition.startAt || definition.startDate,
        definition.dueDate || definition.endAt || definition.endDate
      ),
      status,
      isCapstone: true,
      assessmentType: "Capstone Project",
      categories: ["Capstone"],
      latestAssessment: "Capstone Project",
      mcq: null,
      assignment: null,
      project: null,
      mcqStatus: null,
      assignmentStatus: null,
      projectStatus: null,
      assessmentConfigured: true,
    };
  });

  return [...moduleRows, ...capstoneRows];
}

/* =========================================================
   OVERVIEW CHART DATA

   IMPORTANT: This is deliberately derived from the canonical
   assessment table. The chart can therefore never disagree with
   the history table's assessment records.
========================================================= */

export async function loadAssignmentAnalytics(studentEmail, batchId) {
  const rows = await loadAssessmentTable(studentEmail, batchId);

  return rows
    .filter(
      (row) =>
        !row.isCapstone &&
        !isInterviewModule(row.module)
    )
    .map((row) => ({
      moduleId: row.moduleId,
      module: row.module,

      mcq: row.mcqCompleted
        ? percentage(row.mcqMarks, row.mcqMaximum)
        : 0,

      assignment: row.assignmentCompleted
        ? percentage(row.assignmentMarks, row.assignmentMaximum)
        : 0,

      project: row.projectCompleted
        ? percentage(row.projectMarks, row.projectMaximum)
        : 0,

      status: row.status,
    }));
}

/* =========================================================
   LATEST FEEDBACK
========================================================= */

export async function loadLatestFeedback(studentEmail, batchId) {
  if (!studentEmail) return null;

  const snapshot = await getDocs(
    query(
      collection(db, "submissions"),
      where("studentEmail", "==", studentEmail)
    )
  );

  const evaluated = snapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((item) => {
      if (item.evaluated !== true) return false;
      if (!batchId) return true;

      /* Match the same batch contract as the canonical table. */
      return item.batchId === batchId;
    });

  if (!evaluated.length) return null;

  evaluated.sort(
    (a, b) =>
      getTimestamp(
        b.evaluationDate ||
          b.evaluatedAt ||
          b.updatedAt ||
          b.submittedAt
      ) -
      getTimestamp(
        a.evaluationDate ||
          a.evaluatedAt ||
          a.updatedAt ||
          a.submittedAt
      )
  );

  return evaluated[0];
}
