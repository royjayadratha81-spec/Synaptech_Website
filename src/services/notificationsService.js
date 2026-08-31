import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const NOTIFICATION_TYPES = {
  ASSIGNMENT: "assignment",
  PROJECT: "project",
  MINI_TEST: "mini_test",
  CAPSTONE: "capstone",
  LIVE_SESSION: "live_session",
  RECORDING: "recording",
  DOUBT_SESSION: "doubt_session",
  SYSTEM: "system",
};

export async function createNotification({
  email,
  title,
  message,
  type = NOTIFICATION_TYPES.SYSTEM,
  route = "",
  batchId = "",
  metadata = {},
}) {
  if (!email || !title) return null;

  return addDoc(collection(db, "notifications"), {
    email: String(email).trim().toLowerCase(),
    batchId: batchId || "",
    title,
    message: message || "",
    type,
    route,
    metadata,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToStudentNotifications(
  email,
  callback,
  maxItems = 30
) {
  if (!email) return () => {};

  const q = query(
    collection(db, "notifications"),
    where("email", "==", String(email).trim().toLowerCase()),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    (error) => {
      console.error("Notification listener failed:", error);
      callback([]);
    }
  );
}

export async function markNotificationRead(id) {
  if (!id) return;
  await updateDoc(
    (await import("firebase/firestore")).doc(db, "notifications", id),
    {
      read: true,
      readAt: serverTimestamp(),
    }
  );
}
