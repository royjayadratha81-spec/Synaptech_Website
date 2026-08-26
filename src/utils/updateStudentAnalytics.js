import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* =========================================================
   HELPERS
========================================================= */

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  return null;
}

function getTimestamp(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function percentage(score, maximum) {
  const s = Number(score || 0);
  const m = Number(maximum || 0);

  if (!m) return 0;

  return Number(
    ((s / m) * 100).toFixed(2)
  );
}

function getGrade(average) {
  if (average >= 90) return "A+";
  if (average >= 80) return "A";
  if (average >= 70) return "B";
  if (average >= 60) return "C";
  if (average >= 50) return "D";
  return "F";
}

/* =========================================================
   UPDATE STUDENT ANALYTICS

   This version uses the student's CURRENT BATCH.

   It therefore does not allow an evaluated submission from
   an older batch to contaminate the student's current
   assessment analytics.
========================================================= */

export async function updateStudentAnalytics(
  studentEmail,
  studentBatchId = null
) {
  try {
    if (!studentEmail) return;

    /* -------------------------------------------------------
       STUDENT BATCH
    ------------------------------------------------------- */

    let batchId = studentBatchId;

    if (!batchId) {
      try {
        const studentSnapshot = await getDocs(
          query(
            collection(db, "students"),
            where(
              "email",
              "==",
              studentEmail
            )
          )
        );

        if (!studentSnapshot.empty) {
          batchId =
            studentSnapshot.docs[0].data()
              ?.batchId || null;
        }
      } catch (error) {
        console.warn(
          "Could not resolve student batch:",
          error
        );
      }
    }

    /* -------------------------------------------------------
       FETCH CURRENT ASSIGNMENTS
    ------------------------------------------------------- */

    const [
      submissionsSnapshot,
      mcqSnapshot,
      assignmentsSnapshot,
      testsSnapshot,
    ] = await Promise.all([
      getDocs(
        query(
          collection(db, "submissions"),
          where(
            "studentEmail",
            "==",
            studentEmail
          ),
          where(
            "evaluated",
            "==",
            true
          )
        )
      ),

      getDocs(
        query(
          collection(db, "mcqResults"),
          where(
            "studentEmail",
            "==",
            studentEmail
          )
        )
      ),

      getDocs(
        collection(db, "assignments")
      ),

      getDocs(
        collection(db, "mcqTests")
      ),
    ]);

    const currentAssignments =
      assignmentsSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter((assignment) => {
          if (!batchId) return true;

          return (
            assignment.batchId ===
            batchId
          );
        });

    const currentAssignmentIds =
      new Set(
        currentAssignments.map(
          (assignment) =>
            assignment.id
        )
      );

    /* -------------------------------------------------------
       CURRENT MINI-TEST DEFINITIONS
    ------------------------------------------------------- */

    const currentTests =
      testsSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter((test) => {
          if (test.active !== true) {
            return false;
          }

          if (
            test.batchId !== undefined &&
            test.batchId !== null &&
            test.batchId !== ""
          ) {
            return (
              test.batchId ===
              batchId
            );
          }

          return true;
        });

    const currentTestByModule = {};

    currentTests.forEach((test) => {
      if (!test.moduleId) return;

      const current =
        currentTestByModule[
          test.moduleId
        ];

      if (
        !current ||
        getTimestamp(test.createdAt) >
          getTimestamp(
            current.createdAt
          )
      ) {
        currentTestByModule[
          test.moduleId
        ] = test;
      }
    });

    const currentTestIds = new Set(
      Object.values(
        currentTestByModule
      ).map((test) => test.id)
    );

    /* -------------------------------------------------------
       COUNTERS
    ------------------------------------------------------- */

    let assignmentCount = 0;
    let projectCount = 0;
    let capstoneCount = 0;
    let miniTestCount = 0;

    let assignmentPercentageTotal = 0;
    let projectPercentageTotal = 0;
    let capstonePercentageTotal = 0;
    let miniTestPercentageTotal = 0;

    let highestAssignmentScore = 0;
    let highestProjectScore = 0;
    let highestCapstoneScore = 0;
    let highestMiniTestScore = 0;

    let overallPercentageTotal = 0;
    let overallAssessmentCount = 0;

    let latestEvaluation = null;
    let latestEvaluationTime = 0;

    /* =======================================================
       CURRENT EVALUATED ASSIGNMENTS / PROJECTS / CAPSTONE
    ======================================================= */

    submissionsSnapshot.forEach(
      (document) => {
        const data =
          document.data();

        if (
          !currentAssignmentIds.has(
            data.assignmentId
          )
        ) {
          return;
        }

        const marks =
          Number(data.marks || 0);

        const type =
          data.assignmentType ||
          data.type ||
          "";

        let maximum = 20;

        if (
          type === "Capstone Project" ||
          type === "Capstone"
        ) {
          maximum = 50;
        }

        const scorePercentage =
          percentage(
            marks,
            maximum
          );

        if (
          type === "Assignment"
        ) {
          assignmentCount += 1;
          assignmentPercentageTotal +=
            scorePercentage;

          highestAssignmentScore =
            Math.max(
              highestAssignmentScore,
              marks
            );
        }

        if (type === "Project") {
          projectCount += 1;
          projectPercentageTotal +=
            scorePercentage;

          highestProjectScore =
            Math.max(
              highestProjectScore,
              marks
            );
        }

        if (
          type === "Capstone Project" ||
          type === "Capstone"
        ) {
          capstoneCount += 1;
          capstonePercentageTotal +=
            scorePercentage;

          highestCapstoneScore =
            Math.max(
              highestCapstoneScore,
              marks
            );
        }

        overallPercentageTotal +=
          scorePercentage;

        overallAssessmentCount +=
          1;

        const evaluationTime =
          getTimestamp(
            data.evaluationDate ||
              data.submittedAt
          );

        if (
          evaluationTime >
          latestEvaluationTime
        ) {
          latestEvaluationTime =
            evaluationTime;

          latestEvaluation =
            data.evaluationDate ||
            data.submittedAt ||
            null;
        }
      }
    );

    /* =======================================================
       CURRENT MINI-TESTS ONLY
    ======================================================= */

    mcqSnapshot.forEach(
      (document) => {
        const data =
          document.data();

        if (
          !currentTestIds.has(
            data.testId
          )
        ) {
          return;
        }

        const score =
          Number(data.score || 0);

        const maximum =
          Number(
            data.totalQuestions ||
              data.maxScore ||
              10
          );

        const scorePercentage =
          percentage(
            score,
            maximum
          );

        miniTestCount += 1;

        miniTestPercentageTotal +=
          scorePercentage;

        highestMiniTestScore =
          Math.max(
            highestMiniTestScore,
            score
          );

        overallPercentageTotal +=
          scorePercentage;

        overallAssessmentCount +=
          1;

        const activityDate =
          data.submittedAt ||
          data.completedAt ||
          data.createdAt;

        const activityTime =
          getTimestamp(
            activityDate
          );

        if (
          activityTime >
          latestEvaluationTime
        ) {
          latestEvaluationTime =
            activityTime;

          latestEvaluation =
            activityDate;
        }
      }
    );

    /* =======================================================
       AVERAGES
    ======================================================= */

    const assignmentAverage =
      assignmentCount > 0
        ? Number(
            (
              assignmentPercentageTotal /
              assignmentCount
            ).toFixed(2)
          )
        : 0;

    const projectAverage =
      projectCount > 0
        ? Number(
            (
              projectPercentageTotal /
              projectCount
            ).toFixed(2)
          )
        : 0;

    const capstoneAverage =
      capstoneCount > 0
        ? Number(
            (
              capstonePercentageTotal /
              capstoneCount
            ).toFixed(2)
          )
        : 0;

    const miniTestAverage =
      miniTestCount > 0
        ? Number(
            (
              miniTestPercentageTotal /
              miniTestCount
            ).toFixed(2)
          )
        : 0;

    const averageScore =
      overallAssessmentCount > 0
        ? Number(
            (
              overallPercentageTotal /
              overallAssessmentCount
            ).toFixed(2)
          )
        : 0;

    const performanceGrade =
      getGrade(averageScore);

    /* =======================================================
       SAVE
    ======================================================= */

    await updateDoc(
      doc(
        db,
        "studentAnalytics",
        studentEmail
      ),
      {
        assignmentAverage,
        assignmentCount,
        highestAssignmentScore,

        projectAverage,
        projectCount,
        highestProjectScore,

        capstoneAverage,
        capstoneCount,
        highestCapstoneScore,

        miniTestAverage,
        miniTestCount,
        highestMiniTestScore,

        averageScore,
        performanceGrade,

        latestEvaluation,

        analyticsBatchId:
          batchId || null,
      }
    );

    console.log(
      "Student assessment analytics updated:",
      {
        studentEmail,
        batchId,
        averageScore,
        performanceGrade,
        assignmentCount,
        projectCount,
        capstoneCount,
        miniTestCount,
      }
    );
  } catch (error) {
    console.error(
      "Analytics Update Failed:",
      error
    );
  }
}
