import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const DOUBT_SESSIONS_COLLECTION = "doubtSessions";

const cleanText = (value) => String(value ?? "").trim();

const toSafeDate = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getDoubtSessionStart = (session) => {
  if (session?.scheduledStartAt) {
    const parsed = toSafeDate(session.scheduledStartAt);
    if (parsed) return parsed;
  }

  if (session?.startAt) {
    const parsed = toSafeDate(session.startAt);
    if (parsed) return parsed;
  }

  if (session?.date && session?.time) {
    const parsed = new Date(`${session.date}T${session.time}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

export const getDoubtSessionStatus = (session) => {
  if (!session) return "unknown";

  if (session.sessionType === "recorded") {
    return session.active === false ? "inactive" : "recorded";
  }

  if (session.status === "live") return "live";
  if (session.status === "ended") return "ended";
  if (session.status === "cancelled") return "cancelled";

  return "scheduled";
};

export const normaliseDoubtSession = (id, data = {}) => ({
  id,
  title: cleanText(data.title),
  description: cleanText(data.description),
  sessionType:
    data.sessionType === "recorded" ? "recorded" : "live",

  batchId: cleanText(data.batchId),
  batchName: cleanText(data.batchName),

  moduleId: cleanText(data.moduleId),
  moduleName: cleanText(data.moduleName),

  facultyId: cleanText(data.facultyId),
  facultyName: cleanText(data.facultyName),
  facultyEmail: cleanText(data.facultyEmail),
  facultyPhotoURL: data.facultyPhotoURL || "",

  date: cleanText(data.date),
  time: cleanText(data.time),

  meetingProvider: cleanText(data.meetingProvider),
  meetingUrl: cleanText(data.meetingUrl),
  meetingId: cleanText(data.meetingId),

  recordingUrl: cleanText(data.recordingUrl),
  recordingPlatform: cleanText(data.recordingPlatform),

  scheduledStartAt: data.scheduledStartAt || null,
  startAt: data.startAt || null,
  actualStartAt: data.actualStartAt || null,
  actualEndAt: data.actualEndAt || null,

  status: cleanText(data.status) || "scheduled",
  active: data.active !== false,

  recordingId: cleanText(data.recordingId),
  recordingStatus: cleanText(data.recordingStatus) || "none",

  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

export const createDoubtSession = async ({
  title,
  description,
  sessionType = "live",

  batchId,
  batchName,

  moduleId,
  moduleName,

  facultyId,
  facultyName,
  facultyEmail,
  facultyPhotoURL,

  date,
  time,

  meetingProvider,
  meetingUrl,
  meetingId,

  recordingUrl,
  recordingPlatform,
}) => {
  if (!cleanText(title)) {
    throw new Error("Doubt session title is required.");
  }

  if (!cleanText(batchId)) {
    throw new Error("Batch is required.");
  }

  if (!cleanText(moduleId)) {
    throw new Error("Module is required.");
  }

  if (!cleanText(facultyId)) {
    throw new Error("Faculty is required.");
  }

  if (!cleanText(date)) {
    throw new Error("Date is required.");
  }

  if (!cleanText(time)) {
    throw new Error("Time is required.");
  }

  const type =
    sessionType === "recorded" ? "recorded" : "live";

  if (type === "live" && !cleanText(meetingUrl)) {
    throw new Error("Meeting URL is required for a live doubt session.");
  }

  if (type === "recorded" && !cleanText(recordingUrl)) {
    throw new Error("Recording URL is required for a recorded doubt session.");
  }

  const startDate = new Date(`${date}T${time}`);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid date or time.");
  }

  const payload = {
    title: cleanText(title),
    description: cleanText(description),
    sessionType: type,

    batchId: cleanText(batchId),
    batchName: cleanText(batchName),

    moduleId: cleanText(moduleId),
    moduleName: cleanText(moduleName),

    facultyId: cleanText(facultyId),
    facultyName: cleanText(facultyName),
    facultyEmail: cleanText(facultyEmail).toLowerCase(),
    facultyPhotoURL: facultyPhotoURL || "",

    date: cleanText(date),
    time: cleanText(time),

    meetingProvider:
      type === "live" ? cleanText(meetingProvider) : "",
    meetingUrl:
      type === "live" ? cleanText(meetingUrl) : "",
    meetingId:
      type === "live" ? cleanText(meetingId) : "",

    recordingUrl:
      type === "recorded" ? cleanText(recordingUrl) : "",
    recordingPlatform:
      type === "recorded" ? cleanText(recordingPlatform) : "",

    scheduledStartAt: startDate,
    startAt: startDate,

    actualStartAt: null,
    actualEndAt: null,

    status: type === "recorded" ? "recorded" : "scheduled",
    active: true,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(
    collection(db, DOUBT_SESSIONS_COLLECTION),
    payload
  );

  return {
    id: reference.id,
    ...payload,
  };
};

export const updateDoubtSession = async (sessionId, updates = {}) => {
  if (!sessionId) {
    throw new Error("Doubt session ID is required.");
  }

  const reference = doc(
    db,
    DOUBT_SESSIONS_COLLECTION,
    sessionId
  );

  await updateDoc(reference, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  return getDoubtSession(sessionId);
};


export const startDoubtSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Doubt session ID is required.");
  }

  const reference = doc(
    db,
    DOUBT_SESSIONS_COLLECTION,
    sessionId
  );

  const current = await getDoc(reference);

  if (!current.exists()) {
    throw new Error("Doubt session could not be found.");
  }

  const data = current.data() || {};

  if (data.sessionType !== "live") {
    throw new Error("Only live doubt sessions can be started.");
  }

  if (data.status === "ended") {
    throw new Error("This doubt session has already ended.");
  }

  await updateDoc(reference, {
    status: "live",
    active: true,
    actualStartAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return getDoubtSession(sessionId);
};

export const endDoubtSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Doubt session ID is required.");
  }

  const reference = doc(
    db,
    DOUBT_SESSIONS_COLLECTION,
    sessionId
  );

  const current = await getDoc(reference);

  if (!current.exists()) {
    throw new Error("Doubt session could not be found.");
  }

  const data = current.data() || {};

  if (data.sessionType !== "live") {
    throw new Error("Only live doubt sessions can be ended.");
  }

  if (data.status !== "live") {
    throw new Error("Only a live doubt session can be ended.");
  }

  const recordingReference = doc(
    collection(db, "doubtSessionRecordings")
  );

  const batch = writeBatch(db);

  batch.set(recordingReference, {
    sessionId,
    title: cleanText(data.title),
    description: cleanText(data.description),
    batchId: cleanText(data.batchId),
    batchName: cleanText(data.batchName),
    moduleId: cleanText(data.moduleId),
    moduleName: cleanText(data.moduleName),
    facultyId: cleanText(data.facultyId),
    facultyName: cleanText(data.facultyName),
    facultyEmail: cleanText(data.facultyEmail).toLowerCase(),
    meetingProvider: cleanText(data.meetingProvider),
    meetingId: cleanText(data.meetingId),
    source: "doubt_session",
    recordingStatus: "pending",
    recordingUrl: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(reference, {
    status: "ended",
    active: true,
    actualEndAt: serverTimestamp(),
    recordingId: recordingReference.id,
    recordingStatus: "pending",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return getDoubtSession(sessionId);
};

export const deleteDoubtSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Doubt session ID is required.");
  }

  await deleteDoc(
    doc(db, DOUBT_SESSIONS_COLLECTION, sessionId)
  );
};

export const getDoubtSession = async (sessionId) => {
  if (!sessionId) return null;

  const snapshot = await getDoc(
    doc(db, DOUBT_SESSIONS_COLLECTION, sessionId)
  );

  if (!snapshot.exists()) return null;

  return normaliseDoubtSession(
    snapshot.id,
    snapshot.data()
  );
};

export const listDoubtSessions = async ({
  batchId = "",
  moduleId = "",
  sessionType = "",
  activeOnly = false,
} = {}) => {
  const snapshot = await getDocs(
    collection(db, DOUBT_SESSIONS_COLLECTION)
  );

  return snapshot.docs
    .map((item) =>
      normaliseDoubtSession(item.id, item.data())
    )
    .filter((session) => {
      if (batchId && session.batchId !== batchId) return false;
      if (moduleId && session.moduleId !== moduleId) return false;
      if (sessionType && session.sessionType !== sessionType) {
        return false;
      }
      if (activeOnly && session.active === false) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = getDoubtSessionStart(a)?.getTime() || 0;
      const bTime = getDoubtSessionStart(b)?.getTime() || 0;
      return aTime - bTime;
    });
};

export const subscribeToDoubtSessions = (
  callback,
  {
    batchId = "",
    moduleId = "",
    sessionType = "",
    activeOnly = true,
  } = {}
) => {
  const reference = collection(
    db,
    DOUBT_SESSIONS_COLLECTION
  );

  return onSnapshot(
    reference,
    (snapshot) => {
      const sessions = snapshot.docs
        .map((item) =>
          normaliseDoubtSession(item.id, item.data())
        )
        .filter((session) => {
          if (batchId && session.batchId !== batchId) return false;
          if (moduleId && session.moduleId !== moduleId) return false;
          if (
            sessionType &&
            session.sessionType !== sessionType
          ) {
            return false;
          }
          if (activeOnly && session.active === false) return false;
          return true;
        })
        .sort((a, b) => {
          const aTime =
            getDoubtSessionStart(a)?.getTime() || 0;
          const bTime =
            getDoubtSessionStart(b)?.getTime() || 0;

          return aTime - bTime;
        });

      callback(sessions);
    },
    (error) => {
      console.error(
        "Error listening to doubt sessions:",
        error
      );
      callback([]);
    }
  );
};
