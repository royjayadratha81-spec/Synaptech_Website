/**
 * Synaptech LMS - Attendance domain rules
 *
 * This module contains READ-ONLY attendance calculations.
 * It never creates, updates or deletes Firestore data.
 *
 * Source of truth:
 *   1. Completed live sessions -> denominator
 *   2. Attendance records -> present/manual state
 *   3. Missing record for a completed session -> absent for reporting
 */

export const normalizeEmail = (email) =>
  String(email || "").trim().toLowerCase();

export const isCompletedSession = (session) =>
  session?.status === "ended";

export const getCompletedSessions = (sessions = [], batchId = null) =>
  sessions
    .filter(
      (session) =>
        isCompletedSession(session) &&
        (!batchId || session.batchId === batchId)
    )
    .sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;
      return dateA.localeCompare(dateB);
    });

/**
 * Resolve one student's attendance for one completed session.
 *
 * Priority:
 *   manual override > present > any existing record > missing
 *
 * The present priority is deliberate: if legacy data contains both
 * an absent and a present document for the same student/session,
 * the student must not be turned absent merely because Firestore
 * returned the absent document first.
 */
export const getResolvedAttendanceRecord = (
  records = [],
  sessionId,
  studentEmail
) => {
  const targetEmail = normalizeEmail(studentEmail);

  const matching = records.filter(
    (record) =>
      record?.sessionId === sessionId &&
      normalizeEmail(record?.studentEmail) === targetEmail
  );

  if (matching.length === 0) return null;

  const manual = matching.find(
    (record) => record?.manualOverride === true
  );
  if (manual) return manual;

  const present = matching.find(
    (record) =>
      String(record?.status || "").trim().toLowerCase() ===
      "present"
  );
  if (present) return present;

  return matching[0];
};

export const getStudentAttendanceStats = ({
  sessions = [],
  attendanceRecords = [],
  studentEmail,
}) => {
  const completedSessions = sessions.filter(isCompletedSession);

  let present = 0;

  for (const session of completedSessions) {
    const record = getResolvedAttendanceRecord(
      attendanceRecords,
      session.id,
      studentEmail
    );

    if (
      String(record?.status || "").trim().toLowerCase() ===
      "present"
    ) {
      present += 1;
    }
  }

  const total = completedSessions.length;
  const absent = Math.max(total - present, 0);
  const percentage =
    total > 0 ? Math.round((present / total) * 100) : 0;

  return { total, present, absent, percentage };
};

export const getStudentModuleAttendance = ({
  sessions = [],
  attendanceRecords = [],
  studentEmail,
  moduleId,
}) => {
  const moduleSessions = sessions.filter(
    (session) =>
      isCompletedSession(session) &&
      String(session.moduleId || "").toUpperCase() ===
        String(moduleId || "").toUpperCase()
  );

  let present = 0;

  for (const session of moduleSessions) {
    const record = getResolvedAttendanceRecord(
      attendanceRecords,
      session.id,
      studentEmail
    );

    if (
      String(record?.status || "").trim().toLowerCase() ===
      "present"
    ) {
      present += 1;
    }
  }

  const total = moduleSessions.length;
  const absent = Math.max(total - present, 0);
  const percentage =
    total > 0 ? Math.round((present / total) * 100) : 0;

  return { total, present, absent, percentage };
};

export const getBatchModuleAttendance = ({
  sessions = [],
  students = [],
  attendanceRecords = [],
  moduleId,
}) => {
  const moduleSessions = sessions.filter(
    (session) =>
      isCompletedSession(session) &&
      String(session.moduleId || "").toUpperCase() ===
        String(moduleId || "").toUpperCase()
  );

  const possible = students.length * moduleSessions.length;
  let present = 0;

  for (const student of students) {
    for (const session of moduleSessions) {
      const record = getResolvedAttendanceRecord(
        attendanceRecords,
        session.id,
        student.email
      );

      if (
        String(record?.status || "").trim().toLowerCase() ===
        "present"
      ) {
        present += 1;
      }
    }
  }

  const percentage =
    possible > 0 ? Math.round((present / possible) * 100) : 0;

  return {
    sessions: moduleSessions.length,
    present,
    possible,
    percentage,
  };
};
