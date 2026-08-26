import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* =========================================================
   LEARNING STREAK SERVICE

   This service is intentionally independent from
   updateStudentAnalytics.js.

   Assessment analytics remains responsible for scores, marks,
   averages and grades. This service is responsible only for
   meaningful learning engagement and streak calculation.

   IMPORTANT: A streak is based on UNIQUE CALENDAR DAYS, not
   the number of activities. Multiple activities on one day
   therefore count as one streak day.
   ========================================================= */

const LEARNING_ACTIVITIES = "learningActivities";
const STUDENT_ANALYTICS = "studentAnalytics";

const VALID_ACTIVITY_TYPES = new Set([
  "live_class_attended",
  "module_completed",
  "lesson_completed",
  "assignment_submitted",
  "project_submitted",
  "mini_test_completed",
]);

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) return value;

  if (value?.seconds !== undefined) {
    return new Date(Number(value.seconds) * 1000);
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function toCalendarDate(value) {
  const date = toDate(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateToUtcDayNumber(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);

  if (!year || !month || !day) return null;

  return Math.floor(
    Date.UTC(year, month - 1, day) / 86400000
  );
}

function calculateStreakFromDates(dateStrings) {
  const uniqueDates = [...new Set(
    dateStrings.filter(Boolean)
  )].sort();

  if (uniqueDates.length === 0) {
    return {
      learningStreak: 0,
      longestLearningStreak: 0,
      lastLearningActivityDate: null,
    };
  }

  const dayNumbers = uniqueDates
    .map(dateToUtcDayNumber)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dayNumbers.length; index += 1) {
    if (dayNumbers[index] === dayNumbers[index - 1] + 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  const today = toCalendarDate(new Date());
  const latestDate = uniqueDates[uniqueDates.length - 1];

  // A streak is active only when the latest learning day is today
  // or yesterday. If there was a gap of two or more days, the
  // current streak is zero even though the historical longest streak
  // remains available.
  const todayNumber = dateToUtcDayNumber(today);
  const latestNumber = dateToUtcDayNumber(latestDate);
  const gapFromToday =
    todayNumber !== null && latestNumber !== null
      ? todayNumber - latestNumber
      : null;

  let learningStreak = 0;

  if (gapFromToday === 0 || gapFromToday === 1) {
    learningStreak = 1;

    for (let index = dayNumbers.length - 1; index > 0; index -= 1) {
      if (dayNumbers[index] === dayNumbers[index - 1] + 1) {
        learningStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    learningStreak,
    longestLearningStreak: longest,
    lastLearningActivityDate: latestDate,
  };
}

/* =========================================================
   RECORD A LEARNING ACTIVITY

   Uses a deterministic document id so repeated calls for the same
   student/activity/source/day do not create duplicate activity
   records.
   ========================================================= */
export async function recordLearningActivity({
  studentEmail,
  activityType,
  activityDate = new Date(),
  moduleId = null,
  moduleName = null,
  sourceId = null,
  batchId = null,
} = {}) {
  try {
    if (!studentEmail) {
      console.warn("STREAK: studentEmail is required.");
      return null;
    }

    if (!VALID_ACTIVITY_TYPES.has(activityType)) {
      console.warn(
        `STREAK: Unsupported activity type: ${activityType}`
      );
      return null;
    }

    const calendarDate = toCalendarDate(activityDate);

    if (!calendarDate) {
      console.warn("STREAK: Invalid activity date.");
      return null;
    }

    const safeEmail = String(studentEmail).trim().toLowerCase();
    const safeSource = sourceId || "none";

    const activityId = [
      safeEmail,
      activityType,
      safeSource,
      calendarDate,
    ]
      .join("__")
      .replace(/[\/#?%&.\[\]]/g, "_");

    const activityRef = doc(
      db,
      LEARNING_ACTIVITIES,
      activityId
    );

    await setDoc(
      activityRef,
      {
        studentEmail: safeEmail,
        activityType,
        activityDate: calendarDate,
        moduleId,
        moduleName,
        sourceId: sourceId || null,
        batchId: batchId || null,
        createdAt: new Date(),
      },
      { merge: true }
    );

    return activityId;
  } catch (error) {
    console.error(
      "STREAK: Failed to record learning activity:",
      error
    );
    return null;
  }
}

/* =========================================================
   CALCULATE + SAVE CURRENT STREAK
   ========================================================= */
export async function updateLearningStreak(studentEmail) {
  try {
    if (!studentEmail) return null;

    const safeEmail = String(studentEmail).trim().toLowerCase();

    const activitiesSnapshot = await getDocs(
      query(
        collection(db, LEARNING_ACTIVITIES),
        where("studentEmail", "==", safeEmail)
      )
    );

    const activityDates = activitiesSnapshot.docs
      .map((activityDoc) => activityDoc.data()?.activityDate)
      .filter(Boolean);

    const streak = calculateStreakFromDates(activityDates);

    await updateDoc(
      doc(db, STUDENT_ANALYTICS, studentEmail),
      {
        learningStreak: streak.learningStreak,
        longestLearningStreak: streak.longestLearningStreak,
        lastLearningActivityDate:
          streak.lastLearningActivityDate,
      }
    );

    return streak;
  } catch (error) {
    console.error(
      "STREAK: Failed to update student learning streak:",
      error
    );
    return null;
  }
}

/* =========================================================
   ONE-STEP HELPER

   Use this from the eventual activity integrations.
   ========================================================= */
export async function recordAndUpdateLearningStreak(activity) {
  const activityId = await recordLearningActivity(activity);

  if (!activityId) return null;

  return updateLearningStreak(activity.studentEmail);
}

export {
  calculateStreakFromDates,
  toCalendarDate,
};
