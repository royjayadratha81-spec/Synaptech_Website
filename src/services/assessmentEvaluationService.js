import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/*
  ============================================================
  ASSESSMENT EVALUATION SERVICE - STEP 1
  Assignment Evaluation Engine

  Purpose:
  - Read current-batch Assignment definitions from `assignments`
  - Read the current student's submissions from `submissions`
  - Exclude Capstone Projects
  - Exclude Interview Questions & Answers
  - Support multiple Assignments per module
  - Distinguish:
      Not Submitted
      Evaluation Awaited
      Complete
  - Use the Assignment definition's maximumMarks where available
  - Keep the best evaluated submission for score analytics
  - Keep the latest submission for current status/date
  - Return module-level and submission-level data for the UI

  This service is deliberately separate from the existing
  assessmentAnalyticsService so the working Mini-Test / Assessment
  Overview code is not disturbed during this implementation step.
  ============================================================
*/

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

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return null;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function latestByTimestamp(items, fields = []) {
  if (!items.length) return null;

  return [...items].sort((a, b) => {
    const timestamp = (item) => {
      for (const field of fields) {
        if (item?.[field]) {
          return getTimestamp(item[field]);
        }
      }

      return 0;
    };

    return timestamp(b) - timestamp(a);
  })[0];
}

function bestEvaluatedSubmission(items) {
  const evaluated = items.filter(
    (item) => item?.evaluated === true
  );

  if (!evaluated.length) return null;

  return [...evaluated].sort(
    (a, b) =>
      Number(b?.marks || 0) -
      Number(a?.marks || 0)
  )[0];
}

function getMaximumMarks(definition) {
  const maximum = Number(
    definition?.maximumMarks
  );

  return maximum > 0 ? maximum : 20;
}

async function loadAssignmentEvaluationSources(
  studentEmail,
  batchId
) {
  if (!studentEmail) {
    return {
      modules: [],
      assignments: [],
      submissions: [],
      moduleMap: {},
      assignmentMap: {},
    };
  }

  const [
    submissionsSnapshot,
    modulesSnapshot,
    assignmentsSnapshot,
  ] = await Promise.all([
    getDocs(
      query(
        collection(db, "submissions"),
        where("studentEmail", "==", studentEmail)
      )
    ),
    getDocs(collection(db, "modules")),
    getDocs(collection(db, "assignments")),
  ]);

  const modules = modulesSnapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .sort(
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

  const allAssignments =
    assignmentsSnapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

  /*
    Assessment definition is the source of truth for batch ownership.
    This prevents historical submissions from another batch appearing
    in the current student's Assignment Evaluation page.
  */
  const assignments = allAssignments.filter(
    (definition) => {
      const moduleName =
        moduleMap[definition.moduleId]?.moduleName ||
        definition.moduleName ||
        definition.moduleId ||
        "";

      return (
        (!batchId || definition.batchId === batchId) &&
        definition.active !== false &&
        isAssignmentType(definition.type) &&
        !definition.isCourseLevel &&
        Boolean(definition.moduleId) &&
        !isExcludedAssessmentModule(moduleName)
      );
    }
  );

  const assignmentMap = {};

  assignments.forEach((assignment) => {
    assignmentMap[assignment.id] = assignment;
  });

  const validAssignmentIds = new Set(
    assignments.map((assignment) => assignment.id)
  );

  /*
    Submission records are restricted by assignmentId against the
    current-batch assignment definitions. We deliberately do not trust
    an old submission's batchId by itself.
  */
  const submissions = submissionsSnapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }))
    .filter((submission) =>
      validAssignmentIds.has(
        submission.assignmentId
      )
    );

  return {
    modules,
    assignments,
    submissions,
    moduleMap,
    assignmentMap,
  };
}

export async function loadAssignmentEvaluation(
  studentEmail,
  batchId
) {
  if (!studentEmail) {
    return {
      type: "Assignment",
      studentEmail: null,
      batchId: batchId || null,
      summary: {
        totalAssignments: 0,
        submittedAssignments: 0,
        evaluatedAssignments: 0,
        pendingEvaluations: 0,
        notSubmittedAssignments: 0,
        averagePercentage: null,
        highestPercentage: null,
      },
      moduleRows: [],
      details: [],
    };
  }

  const {
    modules,
    assignments,
    submissions,
    moduleMap,
    assignmentMap,
  } = await loadAssignmentEvaluationSources(
    studentEmail,
    batchId
  );

  /*
    Group submissions by Assignment definition.
    This supports multiple attempts for one Assignment.
  */
  const submissionsByAssignment = {};

  submissions.forEach((submission) => {
    const assignmentId =
      submission.assignmentId;

    if (!assignmentId) return;

    if (!submissionsByAssignment[assignmentId]) {
      submissionsByAssignment[assignmentId] = [];
    }

    submissionsByAssignment[assignmentId].push(
      submission
    );
  });

  /*
    Only modules that can legitimately participate in Assignment
    Evaluation are included.
  */
  const moduleRows = {};

  modules
    .filter(
      (module) =>
        !isExcludedAssessmentModule(
          module.moduleName ||
          module.name ||
          module.title ||
          module.id
        )
    )
    .forEach((module) => {
      moduleRows[module.id] = {
        id: `assignment-module-${module.id}`,
        moduleId: module.id,
        module:
          module.moduleName ||
          module.name ||
          module.title ||
          module.id,

        assignmentCount: 0,
        submittedCount: 0,
        evaluatedCount: 0,
        pendingEvaluationCount: 0,
        notSubmittedCount: 0,

        averagePercentage: null,
        highestPercentage: null,

        status: "Not Started",
      };
    });

  const details = [];

  /*
    Build one detail row per Assignment definition.
    This is the key difference from the old one-row-per-module
    assessment history: multiple Assignments in one module are
    fully supported.
  */
  assignments.forEach((definition) => {
    const moduleId = definition.moduleId;

    if (!moduleId) return;

    if (!moduleRows[moduleId]) {
      /*
        This protects the engine if a valid Assignment points to a
        module whose module document is missing.
      */
      moduleRows[moduleId] = {
        id: `assignment-module-${moduleId}`,
        moduleId,
        module:
          moduleMap[moduleId]?.moduleName ||
          moduleId,

        assignmentCount: 0,
        submittedCount: 0,
        evaluatedCount: 0,
        pendingEvaluationCount: 0,
        notSubmittedCount: 0,

        averagePercentage: null,
        highestPercentage: null,

        status: "Not Started",
      };
    }

    const row = moduleRows[moduleId];

    row.assignmentCount += 1;

    const submissionList =
      submissionsByAssignment[
        definition.id
      ] || [];

    const latestSubmission =
      latestByTimestamp(
        submissionList,
        ["submittedAt", "createdAt"]
      );

    const bestSubmission =
      bestEvaluatedSubmission(
        submissionList
      );

    const maximum =
      getMaximumMarks(definition);

    let status = "Not Submitted";

    if (latestSubmission) {
      row.submittedCount += 1;

      status =
        latestSubmission.evaluated === true
          ? "Complete"
          : "Evaluation Awaited";

      if (
        latestSubmission.evaluated !== true
      ) {
        row.pendingEvaluationCount += 1;
      }
    } else {
      row.notSubmittedCount += 1;
    }

    let score = null;
    let percentageScore = null;
    let evaluationDate = null;

    if (bestSubmission) {
      row.evaluatedCount += 1;

      score = Number(
        bestSubmission.marks || 0
      );

      percentageScore = percentage(
        score,
        maximum
      );

      evaluationDate = formatDateTime(
        bestSubmission.evaluationDate
      );
    }

    details.push({
      id: definition.id,
      assignmentId: definition.id,

      moduleId,
      module:
        moduleMap[moduleId]?.moduleName ||
        moduleId,

      title:
        definition.title ||
        "Assignment",

      type: "Assignment",

      description:
        definition.description || "",

      dueDate: formatDate(
        definition.dueDate
      ),

      maximumMarks: maximum,

      submissionId:
        latestSubmission?.id || null,

      studentName:
        latestSubmission?.studentName ||
        null,

      studentEmail:
        latestSubmission?.studentEmail ||
        studentEmail,

      submissionDate: latestSubmission
        ? formatDateTime(
            latestSubmission.submittedAt ||
            latestSubmission.createdAt
          )
        : null,

      submissionFileName:
        latestSubmission?.fileName ||
        null,

      submissionFileUrl:
        latestSubmission?.fileUrl ||
        null,

      score,
      scoreDisplay:
        score !== null
          ? scoreDisplay(
              score,
              maximum
            )
          : null,

      percentage: percentageScore,

      evaluated:
        bestSubmission
          ? true
          : false,

      evaluatedBy:
        bestSubmission?.evaluatedBy ||
        null,

      evaluationDate,

      remarks:
        bestSubmission?.remarks ||
        "",

      status,

      attemptCount:
        submissionList.length,

      latestSubmissionEvaluated:
        latestSubmission
          ? latestSubmission.evaluated === true
          : false,

      hasSubmission:
        Boolean(latestSubmission),
    });
  });

  /*
    Module-level aggregates.
  */
  Object.values(moduleRows).forEach(
    (row) => {
      const moduleDetails =
        details.filter(
          (item) =>
            item.moduleId === row.moduleId
        );

      const evaluatedScores =
        moduleDetails
          .filter(
            (item) =>
              item.percentage !== null
          )
          .map(
            (item) =>
              Number(item.percentage)
          );

      if (evaluatedScores.length) {
        const total =
          evaluatedScores.reduce(
            (sum, score) =>
              sum + score,
            0
          );

        row.averagePercentage =
          Number(
            (
              total /
              evaluatedScores.length
            ).toFixed(1)
          );

        row.highestPercentage =
          Math.max(
            ...evaluatedScores
          );
      }

      if (
        row.assignmentCount === 0
      ) {
        row.status = "Not Started";
      } else if (
        row.pendingEvaluationCount > 0
      ) {
        row.status =
          "Evaluation Awaited";
      } else if (
        row.evaluatedCount ===
        row.assignmentCount
      ) {
        row.status = "Complete";
      } else if (
        row.submittedCount > 0
      ) {
        row.status = "In Progress";
      } else {
        row.status = "Not Started";
      }
    }
  );

  /*
    Preserve module order from the modules collection.
  */
  const orderedModuleRows =
    Object.values(moduleRows).sort(
      (a, b) =>
        Number(
          moduleMap[a.moduleId]
            ?.moduleOrder || 999
        ) -
        Number(
          moduleMap[b.moduleId]
            ?.moduleOrder || 999
        )
    );

  /*
    Assignment-level summary.
  */
  const totalAssignments =
    assignments.length;

  const submittedAssignments =
    details.filter(
      (item) => item.hasSubmission
    ).length;

  // KPI/status counts are based on the CURRENT submission state.
  // A historical evaluated attempt must not make an assignment appear
  // "Complete" when the student has since submitted a new attempt.
  // "Evaluated" means this assignment has at least one
  // evaluated submission, so a previous evaluated attempt remains
  // academically valid even if a newer attempt is awaiting evaluation.
  const evaluatedAssignments =
    details.filter(
      (item) => item.evaluated === true
    ).length;

  // "Complete" is the CURRENT submission state.
  const completedAssignments =
    details.filter(
      (item) => item.status === "Complete"
    ).length;

  const pendingEvaluations =
    details.filter(
      (item) =>
        item.status ===
        "Evaluation Awaited"
    ).length;

  const notSubmittedAssignments =
    details.filter(
      (item) =>
        item.status ===
        "Not Submitted"
    ).length;

  const evaluatedPercentages =
    details
      .filter(
        (item) =>
          item.percentage !== null
      )
      .map(
        (item) =>
          Number(item.percentage)
      );

  const averagePercentage =
    evaluatedPercentages.length
      ? Number(
          (
            evaluatedPercentages.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            evaluatedPercentages.length
          ).toFixed(1)
        )
      : null;

  const highestPercentage =
    evaluatedPercentages.length
      ? Math.max(
          ...evaluatedPercentages
        )
      : null;

  /*
    Detail rows are kept in module order and then by due date/title.
  */
  const moduleOrderMap = {};

  orderedModuleRows.forEach(
    (module, index) => {
      moduleOrderMap[
        module.moduleId
      ] = index;
    }
  );

  details.sort((a, b) => {
    const moduleOrderA =
      moduleOrderMap[a.moduleId] ??
      999;

    const moduleOrderB =
      moduleOrderMap[b.moduleId] ??
      999;

    if (
      moduleOrderA !==
      moduleOrderB
    ) {
      return (
        moduleOrderA -
        moduleOrderB
      );
    }

    const dueA =
      getTimestamp(
        assignmentMap[a.assignmentId]
          ?.dueDate
      );

    const dueB =
      getTimestamp(
        assignmentMap[b.assignmentId]
          ?.dueDate
      );

    if (dueA !== dueB) {
      return dueA - dueB;
    }

    return String(
      a.title || ""
    ).localeCompare(
      String(b.title || "")
    );
  });

  return {
    type: "Assignment",

    studentEmail,

    batchId: batchId || null,

    summary: {
      totalAssignments,
      submittedAssignments,
      evaluatedAssignments,
      completedAssignments,
      pendingEvaluations,
      notSubmittedAssignments,
      averagePercentage,
      highestPercentage,
    },

    moduleRows:
      orderedModuleRows,

    details,
  };
}

/*
  Convenience helper for a future combined Assignment + Project
  evaluation service. Kept intentionally small so Project Evaluation
  can use the same data contract in the next step.
*/
export function getAssignmentScorePercentage(
  score,
  maximumMarks
) {
  return percentage(
    score,
    maximumMarks
  );
}

export function getAssignmentScoreDisplay(
  score,
  maximumMarks
) {
  return scoreDisplay(
    score,
    maximumMarks
  );
}
