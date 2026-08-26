import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, app } from "../firebase/firebaseConfig";

const storage = getStorage(app);
const FACULTY_COLLECTION = "faculties";
const FACULTY_STORAGE_PATH = "faculty-profiles";

const cleanText = (value) => String(value ?? "").trim();

const normaliseFaculty = (id, data) => ({
  id,
  name: cleanText(data.name),
  email: cleanText(data.email),
  photoURL: data.photoURL || "",
  photoPath: data.photoPath || "",
  designation: cleanText(data.designation),
  bio: cleanText(data.bio),
  experienceYears: Number(data.experienceYears || 0),
  expertise: Array.isArray(data.expertise) ? data.expertise : [],
  moduleIds: Array.isArray(data.moduleIds) ? data.moduleIds : [],
  linkedinUrl: cleanText(data.linkedinUrl),
  active: data.active !== false,
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

export async function listFaculties({ activeOnly = false } = {}) {
  const base = collection(db, FACULTY_COLLECTION);

  const q = activeOnly
    ? query(base, where("active", "==", true))
    : base;

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) =>
      normaliseFaculty(item.id, item.data())
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      })
    );
}

export async function getFacultyById(facultyId) {
  if (!facultyId) return null;

  const snapshot = await getDoc(
    doc(db, FACULTY_COLLECTION, facultyId)
  );

  if (!snapshot.exists()) return null;

  return normaliseFaculty(snapshot.id, snapshot.data());
}

async function uploadFacultyPhoto(file, facultyId) {
  if (!file) {
    return { photoURL: "", photoPath: "" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${FACULTY_STORAGE_PATH}/${facultyId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=31536000",
  });

  const photoURL = await getDownloadURL(storageRef);

  return {
    photoURL,
    photoPath: path,
  };
}

export async function createFaculty({
  name,
  email,
  designation,
  bio,
  experienceYears,
  expertise,
  moduleIds,
  linkedinUrl,
  active = true,
  photoFile = null,
}) {
  const payload = {
    name: cleanText(name),
    email: cleanText(email).toLowerCase(),
    designation: cleanText(designation),
    bio: cleanText(bio),
    experienceYears: Number(experienceYears || 0),
    expertise: Array.isArray(expertise) ? expertise : [],
    moduleIds: Array.isArray(moduleIds) ? moduleIds : [],
    linkedinUrl: cleanText(linkedinUrl),
    active: Boolean(active),
    photoURL: "",
    photoPath: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const facultyRef = await addDoc(
    collection(db, FACULTY_COLLECTION),
    payload
  );

  try {
    if (photoFile) {
      const photo = await uploadFacultyPhoto(
        photoFile,
        facultyRef.id
      );

      await updateDoc(facultyRef, {
        ...photo,
        updatedAt: serverTimestamp(),
      });

      return {
        id: facultyRef.id,
        ...payload,
        ...photo,
      };
    }

    return {
      id: facultyRef.id,
      ...payload,
    };
  } catch (error) {
    // Do not leave an unusable faculty document behind if the
    // optional profile-photo upload fails during creation.
    await deleteDoc(facultyRef);
    throw error;
  }
}

export async function updateFaculty(facultyId, updates) {
  if (!facultyId) {
    throw new Error("Faculty ID is required.");
  }

  const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);

  const payload = {
    name: cleanText(updates.name),
    email: cleanText(updates.email).toLowerCase(),
    designation: cleanText(updates.designation),
    bio: cleanText(updates.bio),
    experienceYears: Number(updates.experienceYears || 0),
    expertise: Array.isArray(updates.expertise)
      ? updates.expertise
      : [],
    moduleIds: Array.isArray(updates.moduleIds)
      ? updates.moduleIds
      : [],
    linkedinUrl: cleanText(updates.linkedinUrl),
    active: updates.active !== false,
    updatedAt: serverTimestamp(),
  };

  if (updates.photoFile) {
    const current = await getFacultyById(facultyId);

    const photo = await uploadFacultyPhoto(
      updates.photoFile,
      facultyId
    );

    payload.photoURL = photo.photoURL;
    payload.photoPath = photo.photoPath;

    if (current?.photoPath) {
      try {
        await deleteObject(ref(storage, current.photoPath));
      } catch (error) {
        console.warn(
          "Previous faculty photo could not be removed:",
          error
        );
      }
    }
  }

  await updateDoc(facultyRef, payload);

  return getFacultyById(facultyId);
}

export async function deleteFaculty(facultyId) {
  if (!facultyId) {
    throw new Error("Faculty ID is required.");
  }

  const current = await getFacultyById(facultyId);

  if (current?.photoPath) {
    try {
      await deleteObject(ref(storage, current.photoPath));
    } catch (error) {
      console.warn(
        "Faculty photo could not be removed:",
        error
      );
    }
  }

  await deleteDoc(doc(db, FACULTY_COLLECTION, facultyId));
}

export { FACULTY_COLLECTION };
