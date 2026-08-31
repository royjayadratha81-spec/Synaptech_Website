import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";

export const INTERVIEW_CATEGORIES = [
  "R Language",
  "Statistics & Mathematics",
  "Generative AI",
  "Agentic AI",
  "Machine Learning",
  "Deep Learning",
  "Data Visualization",
  "Power BI",
  "MLOps",
  "Python",
  "NumPy",
  "Pandas",
  "EDA",
  "Tableau",
  "SQL",
  "Excel",
  "Data Science with Gen AI & Agentic AI",
];

export const INTERVIEW_MATERIAL_BUCKET = "interview-qna-materials";
export const INTERVIEW_MATERIAL_MAX_SIZE = 50 * 1024 * 1024;

export const INTERVIEW_MATERIAL_EXTENSIONS = [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "html",
  "htm",
  "ipynb",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "md",
];

export const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const getExtension = (fileName = "") => {
  const parts = String(fileName).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const safeFileName = (fileName = "file") =>
  String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");

export async function loadInterviewCategories() {
  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnACategories"),
      orderBy("order", "asc")
    )
  );

  // Defensive de-duplication: the UI should never render the same
  // category twice even if legacy duplicate documents still exist.
  const seen = new Set();
  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter((item) => {
      const key = slugify(item.slug || item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function seedInterviewCategories() {
  const snapshot = await getDocs(
    collection(db, "interviewQnACategories")
  );

  const existingBySlug = new Map();
  snapshot.docs.forEach((item) => {
    const data = item.data() || {};
    const slug = slugify(data.slug || data.name);
    if (slug && !existingBySlug.has(slug)) {
      existingBySlug.set(slug, item.id);
    }
  });

  const created = [];

  for (let index = 0; index < INTERVIEW_CATEGORIES.length; index += 1) {
    const name = INTERVIEW_CATEGORIES[index];
    const slug = slugify(name);

    // Never create another document when this category already exists.
    if (existingBySlug.has(slug)) continue;

    // Deterministic IDs prevent race-condition duplicates when two pages
    // initialise the categories at the same time.
    const categoryRef = doc(db, "interviewQnACategories", slug);
    await setDoc(categoryRef, {
      name,
      slug,
      type: name === "Data Science with Gen AI & Agentic AI"
        ? "course-wide"
        : "module",
      order: index + 1,
      isPublished: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: false });

    existingBySlug.set(slug, categoryRef.id);
    created.push(categoryRef.id);
  }

  return created;
}

/**
 * One-time migration for legacy duplicate interview category documents.
 *
 * It preserves the category document that has the most linked content,
 * moves questions/materials/progress from duplicate category IDs to that
 * canonical ID, and only then deletes the duplicate category documents.
 *
 * This is intentionally NOT called automatically. Run it once from an
 * authenticated admin action after deploying this service update.
 */
export async function repairInterviewCategoryDuplicates() {
  const categorySnapshot = await getDocs(
    collection(db, "interviewQnACategories")
  );

  const categories = categorySnapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  const questionSnapshot = await getDocs(collection(db, "interviewQnA"));
  const materialSnapshot = await getDocs(collection(db, "interviewQnAMaterials"));
  const progressSnapshot = await getDocs(collection(db, "interviewQnAProgress"));
  const materialProgressSnapshot = await getDocs(collection(db, "interviewQnAMaterialProgress"));

  const linkedCounts = new Map();
  const addCount = (categoryId) => {
    if (!categoryId) return;
    linkedCounts.set(categoryId, (linkedCounts.get(categoryId) || 0) + 1);
  };

  [
    ...questionSnapshot.docs,
    ...materialSnapshot.docs,
    ...progressSnapshot.docs,
    ...materialProgressSnapshot.docs,
  ].forEach((item) => addCount(item.data()?.categoryId));

  const groups = new Map();
  categories.forEach((category) => {
    const slug = slugify(category.slug || category.name);
    if (!slug) return;
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(category);
  });

  let duplicateCategories = 0;
  let migratedReferences = 0;
  const operations = [];

  for (const [slug, group] of groups.entries()) {
    if (group.length <= 1) continue;

    // Prefer the document with the most linked content. On a tie, prefer
    // the earliest declared category order, then the first document.
    group.sort((a, b) => {
      const countDifference = (linkedCounts.get(b.id) || 0) - (linkedCounts.get(a.id) || 0);
      if (countDifference !== 0) return countDifference;
      return Number(a.order || 0) - Number(b.order || 0);
    });

    const canonical = group[0];
    const duplicateIds = group.slice(1).map((item) => item.id);
    duplicateCategories += duplicateIds.length;

    const migrateSnapshot = (snapshot) => {
      snapshot.docs.forEach((item) => {
        const categoryId = item.data()?.categoryId;
        if (duplicateIds.includes(categoryId)) {
          operations.push({
            type: "update",
            ref: item.ref,
            data: { categoryId: canonical.id },
          });
          migratedReferences += 1;
        }
      });
    };

    migrateSnapshot(questionSnapshot);
    migrateSnapshot(materialSnapshot);
    migrateSnapshot(progressSnapshot);
    migrateSnapshot(materialProgressSnapshot);

    duplicateIds.forEach((duplicateId) => {
      operations.push({ type: "delete", ref: doc(db, "interviewQnACategories", duplicateId) });
    });

    console.log(
      `INTERVIEW CATEGORY REPAIR: ${slug} -> canonical ${canonical.id}; duplicates:`,
      duplicateIds
    );
  }

  // Firestore batches are limited to 500 writes. Execute in safe chunks.
  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => {
      if (operation.type === "update") {
        batch.update(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    });
    await batch.commit();
  }

  return {
    categoriesBefore: categories.length,
    duplicateCategoriesRemoved: duplicateCategories,
    referencesMigrated: migratedReferences,
  };
}

export async function loadInterviewQuestions(categoryId) {
  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnA"),
      where("categoryId", "==", categoryId)
    )
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.isPublished !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export async function saveInterviewQuestion({
  id,
  categoryId,
  categoryName,
  question,
  answer,
  difficulty = "Intermediate",
  order = 1,
  isPublished = false,
}) {
  const payload = {
    categoryId,
    categoryName,
    question: String(question || "").trim(),
    answer: String(answer || "").trim(),
    difficulty,
    order: Number(order) || 1,
    isPublished: Boolean(isPublished),
    updatedAt: serverTimestamp(),
  };

  if (id) {
    await updateDoc(doc(db, "interviewQnA", id), payload);
    return id;
  }

  const ref = await addDoc(collection(db, "interviewQnA"), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function recordInterviewQuestionViewed({
  email,
  questionId,
  categoryId,
}) {
  if (!email || !questionId) return;

  const safeEmail = String(email).trim().toLowerCase();
  const progressId = `${safeEmail}_${questionId}`;

  await setDoc(
    doc(db, "interviewQnAProgress", progressId),
    {
      email: safeEmail,
      questionId,
      categoryId: categoryId || "",
      lastViewedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function loadInterviewProgress(email) {
  if (!email) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnAProgress"),
      where("email", "==", String(email).trim().toLowerCase())
    )
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function loadAllInterviewQuestions(categoryId) {
  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnA"),
      where("categoryId", "==", categoryId)
    )
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (a, b) =>
        Number(a.order || 0) - Number(b.order || 0)
    );
}

export async function loadInterviewMaterials(
  categoryId,
  { publishedOnly = false } = {}
) {
  if (!categoryId) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnAMaterials"),
      where("categoryId", "==", categoryId)
    )
  );

  const materials = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter((item) => !publishedOnly || item.isPublished === true)
    .sort(
      (a, b) =>
        Number(a.order || 0) - Number(b.order || 0) ||
        String(a.title || "").localeCompare(String(b.title || ""))
    );

  return materials;
}

export async function uploadInterviewMaterial({
  title,
  categoryId,
  categoryName,
  difficulty = "Medium",
  order = 1,
  isPublished = false,
  file,
}) {
  if (!categoryId) {
    throw new Error("Please select an interview category.");
  }

  if (!String(title || "").trim()) {
    throw new Error("Please enter a material title.");
  }

  if (!file) {
    throw new Error("Please select a file.");
  }

  const extension = getExtension(file.name);

  if (!INTERVIEW_MATERIAL_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported file type .${extension || "unknown"}. Supported files: ${INTERVIEW_MATERIAL_EXTENSIONS.join(", ")}.`
    );
  }

  if (file.size > INTERVIEW_MATERIAL_MAX_SIZE) {
    throw new Error("File size cannot exceed 50 MB.");
  }

  const storagePath =
    `interview-qna/${slugify(categoryName)}/${Date.now()}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(INTERVIEW_MATERIAL_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "File upload failed.");
  }

  const { data: publicUrlData } = supabase.storage
    .from(INTERVIEW_MATERIAL_BUCKET)
    .getPublicUrl(storagePath);

  const fileUrl = publicUrlData?.publicUrl || "";

  try {
    const ref = await addDoc(
      collection(db, "interviewQnAMaterials"),
      {
        title: String(title).trim(),
        categoryId,
        categoryName: String(categoryName || "").trim(),
        difficulty,
        order: Number(order) || 1,
        isPublished: Boolean(isPublished),
        fileName: file.name,
        fileType: extension,
        mimeType: file.type || "application/octet-stream",
        fileSize: Number(file.size || 0),
        fileUrl,
        storagePath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    return {
      id: ref.id,
      title: String(title).trim(),
      categoryId,
      categoryName,
      difficulty,
      order: Number(order) || 1,
      isPublished: Boolean(isPublished),
      fileName: file.name,
      fileType: extension,
      mimeType: file.type || "application/octet-stream",
      fileSize: Number(file.size || 0),
      fileUrl,
      storagePath,
    };
  } catch (error) {
    await supabase.storage
      .from(INTERVIEW_MATERIAL_BUCKET)
      .remove([storagePath]);
    throw error;
  }
}

export async function updateInterviewMaterial({
  id,
  title,
  difficulty,
  order,
  isPublished,
}) {
  if (!id) throw new Error("Material ID is required.");

  await updateDoc(doc(db, "interviewQnAMaterials", id), {
    title: String(title || "").trim(),
    difficulty,
    order: Number(order) || 1,
    isPublished: Boolean(isPublished),
    updatedAt: serverTimestamp(),
  });

  return id;
}

export async function deleteInterviewMaterial(material) {
  if (!material?.id) throw new Error("Material ID is required.");

  if (material.storagePath) {
    const { error } = await supabase.storage
      .from(INTERVIEW_MATERIAL_BUCKET)
      .remove([material.storagePath]);

    if (error) {
      throw new Error(error.message || "Unable to delete the stored file.");
    }
  }

  await deleteDoc(doc(db, "interviewQnAMaterials", material.id));
}

export async function recordInterviewMaterialViewed({
  email,
  materialId,
  categoryId,
}) {
  if (!email || !materialId) return;

  const safeEmail = String(email).trim().toLowerCase();
  const progressId = `${safeEmail}_${materialId}`;

  await setDoc(
    doc(db, "interviewQnAMaterialProgress", progressId),
    {
      email: safeEmail,
      materialId,
      categoryId: categoryId || "",
      lastViewedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function loadInterviewMaterialProgress(email) {
  if (!email) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "interviewQnAMaterialProgress"),
      where("email", "==", String(email).trim().toLowerCase())
    )
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
