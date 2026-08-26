import { supabase }
from "../supabase/supabase";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import MiniTestSection from "../components/assessment/MiniTestSection";
import { recordAndUpdateLearningStreak } from "../services/learningStreakService";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  setDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ModuleDetails() {

  const { moduleId } = useParams();
  const [moduleName, setModuleName] = useState("");
  const [materials, setMaterials] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [recordedSessions, setRecordedSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [testQuestions, setTestQuestions] =
  useState([]);

const [showTest, setShowTest] =
  useState(false);

// Controls the compact Mini Test card/modal presentation.
const [showMiniTestPanel, setShowMiniTestPanel] = useState(false);

const [answers, setAnswers] =
  useState({});
  const [testScore, setTestScore] =
  useState(null);
  const [attemptCount, setAttemptCount] =
  useState(0);

const [bestScore, setBestScore] =
  useState(0);
  const [testHistory, setTestHistory] =
  useState([]);
  const [moduleCompleted, setModuleCompleted] =
useState(false);
const [readingProgress, setReadingProgress] = useState({});
const [practiceProgress, setPracticeProgress] = useState({});
const [practiceCompleted, setPracticeCompleted] = useState(false);
const [interviewCompleted, setInterviewCompleted] = useState(false);

  const [totalQuestions, setTotalQuestions] =
  useState(0);
  const auth = getAuth();

  // Single authoritative student context used by the entire module.
  // We resolve this from Firebase Auth + Firestore before loading
  // assignments, projects, submissions and mini-tests.
  const [resolvedStudent, setResolvedStudent] = useState(null);

  const cachedStudentData = JSON.parse(
    localStorage.getItem("studentData") || "null"
  );

  const currentEmail =
    resolvedStudent?.email ||
    cachedStudentData?.email ||
    auth.currentUser?.email ||
    "";

  const resolvedEmail = resolvedStudent?.email || currentEmail;

  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const getAuthoritativeStudent = async (authUser = auth.currentUser) => {
    const cachedStudent = JSON.parse(
      localStorage.getItem("studentData") || "null"
    );

    let firestoreStudent = null;

    try {
      // Preferred route: students/{Firebase UID}
      if (authUser?.uid) {
        const studentRef = doc(db, "students", authUser.uid);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          firestoreStudent = studentSnap.data();
        }
      }

      // Fallback route: find the student by email.
      // This handles students whose document ID does not equal Firebase UID.
      const email =
        authUser?.email ||
        firestoreStudent?.email ||
        cachedStudent?.email ||
        "";

      if (!firestoreStudent && email) {
        const studentQuery = query(
          collection(db, "students"),
          where("email", "==", email)
        );

        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
          firestoreStudent = studentSnapshot.docs[0].data();
        }
      }

      const authoritativeStudent = {
        ...(cachedStudent || {}),
        ...(firestoreStudent || {}),
        ...(authUser?.email ? { email: authUser.email } : {}),
      };

      if (authoritativeStudent?.email) {
        localStorage.setItem(
          "studentData",
          JSON.stringify(authoritativeStudent)
        );
      }

      console.group("===== AUTHORITATIVE STUDENT CONTEXT =====");
      console.log("Firebase UID:", authUser?.uid || "(not available)");
      console.log("Firebase Email:", authUser?.email || "(not available)");
      console.log("Student:", authoritativeStudent);
      console.log("Student Email:", authoritativeStudent?.email || "(missing)");
      console.log("Student Batch ID:", authoritativeStudent?.batchId || "(missing)");
      console.log("Student Batch Name:", authoritativeStudent?.batchName || "(missing)");
      console.groupEnd();

      setResolvedStudent(authoritativeStudent);

      return authoritativeStudent;
    } catch (error) {
      console.error("Unable to resolve authoritative student:", error);

      const fallbackStudent = {
        ...(cachedStudent || {}),
        ...(authUser?.email ? { email: authUser.email } : {}),
      };

      setResolvedStudent(fallbackStudent);

      return fallbackStudent;
    }
  };
const ensureStudentAnalytics = async (student) => {
    try {
        if (!student?.email) {
            console.warn(
                "ANALYTICS: Student email not available."
            );
            return null;
        }

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap =
            await getDoc(analyticsRef);

        if (analyticsSnap.exists()) {
            return analyticsSnap.data();
        }

        console.warn(
            "ANALYTICS: Creating missing studentAnalytics document:",
            student.email
        );

        const defaultAnalytics = {
            studentEmail: student.email,

            studentName:
                student.name ||
                student.studentName ||
                "",

            batchId:
                student.batchId ||
                "",

            batchName:
                student.batchName ||
                "",

            modules: {},

            modulesCompleted: 0,

            totalModules: 0,

            overallProgress: 0,

            materialProgress: {},

            createdAt: new Date(),
        };

        await setDoc(
            analyticsRef,
            defaultAnalytics
        );

        console.log(
            "ANALYTICS: studentAnalytics document created:",
            student.email
        );

        return defaultAnalytics;

    } catch (error) {

        console.error(
            "ANALYTICS: Unable to create/read studentAnalytics:",
            error
        );

        return null;
    }
};
  const [testExtensions, setTestExtensions] = useState([]);
  const handleTestSubmit = async () => {

const snapshot =
  await getDocs(
    collection(db, "mcqResults")
  );

let attempts = 0;

snapshot.forEach((docItem) => {

  const data = docItem.data();

  if (
    normalize(data.studentEmail) === normalize(resolvedEmail) &&
    normalize(data.moduleId) === normalize(moduleId)
  ) {
    attempts++;
  }

});

if (attempts >= 3) {

  alert(
    "Maximum 3 attempts already used. Test Locked."
  );

  return;

}

  let score = 0;

  testQuestions.forEach((question) => {

    if (
      answers[question.id] ===
      question.correctAnswer
    ) {
      score++;
    }

  });

  setTestScore(score);


  await addDoc(
    collection(db, "mcqResults"),
    {
      studentEmail:
        resolvedEmail,

      testId:
        mcqTests[0]?.id,

      moduleId,

      score,

      totalQuestions:
        testQuestions.length,

      attemptNumber:
        attemptCount + 1,
    }
  );

  alert(
    `You scored ${score} out of ${testQuestions.length}`
  );

  setAttemptCount(
    attemptCount + 1
  );

};
  const [mcqTests, setMcqTests] = useState([]);
  console.log("MCQ TESTS:", mcqTests);
  console.log("SUBMISSIONS:", submissions);
  const [submissionFiles, setSubmissionFiles] = useState({});
  console.log("Live Sessions:", liveSessions);
  const readingMaterials =
  materials.filter(
    item => item.materialType === "reading"
  );

const practiceMaterials =
  materials.filter(
    item => item.materialType === "practice"
  );

const interviewMaterials =
  materials.filter(
    item => item.materialType === "interview"
  );
  const regularAssignments = assignments.filter(
  (assignment) =>
    normalize(assignment.type) === "assignment"
);

const projects = assignments.filter(
  (assignment) =>
    normalize(assignment.type) === "project"
);

const assessmentGroups = [
  {
    key: "assignments",
    title: "Assignments",
    subtitle: "Complete your assigned coursework and practical exercises.",
    items: regularAssignments,
    icon: "📝",
    badgeClass: "bg-blue-100 text-blue-700",
    headingClass: "text-blue-700",
  },
  {
    key: "projects",
    title: "Projects",
    subtitle: "Apply your learning through practical, real-world projects.",
    items: projects,
    icon: "🚀",
    badgeClass: "bg-purple-100 text-purple-700",
    headingClass: "text-purple-700",
  },
];
  

const fetchModule = async () => {

  const docRef = doc(
    db,
    "modules",
    moduleId
  );

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {

    const loadedModuleName =
      docSnap.data().moduleName || "";

    setModuleName(loadedModuleName);

    return loadedModuleName;

  }

  return "";
};
const fetchMaterials = async () => {

  const snapshot = await getDocs(
    collection(db, "courseMaterials")
  );

  const materialList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (data.moduleId === moduleId) {

      materialList.push({
        id: docItem.id,
        ...data,
      });

    }

  });

  setMaterials(materialList);

};
const fetchLiveSessions = async () => {

  const snapshot = await getDocs(
    collection(db, "liveSessions")
  );

  const sessionList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (data.moduleId === moduleId) {

      sessionList.push({
        id: docItem.id,
        ...data,
      });

    }

  });

  setLiveSessions(sessionList);

};
const fetchRecordedSessions = async () => {

  const snapshot = await getDocs(
    collection(db, "recordedSessions")
  );

  const recordingList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (data.moduleId === moduleId) {

      recordingList.push({
        id: docItem.id,
        ...data,
      });

    }

  });

  setRecordedSessions(recordingList);

};
const fetchAssignments = async (student) => {

  try {

    if (!student?.batchId) {
      console.warn(
        "ASSESSMENT DEBUG: Student has no batchId. No module assignments/projects can be shown."
      );
      setAssignments([]);
      return;
    }

    const snapshot = await getDocs(
      collection(db, "assignments")
    );

    const allAssignments = [];

    snapshot.forEach((docItem) => {
      allAssignments.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    // Diagnostic output: this lets us see the actual Firestore values
    // instead of guessing why a student's assignment is being filtered.
    console.group("===== MODULE ASSESSMENT DEBUG =====");
    console.log("URL moduleId:", moduleId);
    console.log("Resolved student email:", student.email);
    console.log("Resolved student batchId:", student.batchId);
    console.log("Resolved student batchName:", student.batchName);
    console.log("Total assignment documents in Firestore:", allAssignments.length);

    console.table(
      allAssignments.map((item) => ({
        id: item.id,
        title: item.title || "",
        type: item.type || "",
        moduleId: item.moduleId || "",
        batchId: item.batchId || "",
        batchName: item.batchName || "",
        active: item.active,
      }))
    );

    const moduleCandidates = allAssignments.filter(
      (item) =>
        normalize(item.moduleId) === normalize(moduleId)
    );

    console.log(
      "Documents matching this module:",
      moduleCandidates
    );

    console.table(
      moduleCandidates.map((item) => ({
        id: item.id,
        title: item.title || "",
        type: item.type || "",
        moduleId: item.moduleId || "",
        assignmentBatchId: item.batchId || "",
        studentBatchId: student.batchId || "",
        batchMatch:
          normalize(item.batchId) === normalize(student.batchId),
        active: item.active,
      }))
    );

    const assignmentList = allAssignments.filter((item) => {

      const moduleMatch =
        normalize(item.moduleId) === normalize(moduleId);

      const batchMatch =
        normalize(item.batchId) === normalize(student.batchId);

      const activeMatch =
        item.active !== false;

      const typeMatch =
        normalize(item.type) === "assignment" ||
        normalize(item.type) === "project";

      return (
        moduleMatch &&
        batchMatch &&
        activeMatch &&
        typeMatch
      );
    });

    // Capstone is intentionally excluded from course modules.
    const moduleAssignments = assignmentList.filter(
      (item) =>
        normalize(item.type) !== "capstone" &&
        normalize(item.type) !== "capstone project"
    );

    console.log(
      "FINAL MODULE ASSIGNMENTS + PROJECTS:",
      moduleAssignments
    );
    console.log(
      "Assignments count:",
      moduleAssignments.filter(
        (item) => normalize(item.type) === "assignment"
      ).length
    );
    console.log(
      "Projects count:",
      moduleAssignments.filter(
        (item) => normalize(item.type) === "project"
      ).length
    );
    console.groupEnd();

    setAssignments(moduleAssignments);

  } catch (error) {

    console.error(
      "Error fetching module assessments:",
      error
    );

    setAssignments([]);

  }

};

const fetchSubmissions = async (student) => {

  try {

    if (!student?.email) {
      setSubmissions([]);
      return;
    }

    const snapshot = await getDocs(
      collection(db, "submissions")
    );

    const submissionList = [];

    snapshot.forEach((docItem) => {

      const data = docItem.data();

      if (
        normalize(data.studentEmail) === normalize(student.email) &&
        normalize(data.moduleId) === normalize(moduleId)
      ) {
        submissionList.push({
          id: docItem.id,
          ...data,
        });
      }

    });

    console.log(
      "CURRENT STUDENT MODULE SUBMISSIONS:",
      submissionList
    );

    setSubmissions(submissionList);

  } catch (error) {

    console.error(
      "Error fetching submissions:",
      error
    );

    setSubmissions([]);

  }

};

const fetchTestExtensions = async (email) => {

  try {

    if (!email) {
      setTestExtensions([]);
      return [];
    }

    const snapshot = await getDocs(
      query(
        collection(db, "mcqExtensions"),
        where("studentEmail", "==", email)
      )
    );

    const extensions = [];

    snapshot.forEach((docItem) => {
      extensions.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    setTestExtensions(extensions);

    console.log("TEST EXTENSIONS:", extensions);

    return extensions;

  } catch (error) {

    console.error(
      "Error fetching test extensions:",
      error
    );

    setTestExtensions([]);

    return [];

  }

};

const fetchMcqTests = async (student, extensions = []) => {

  try {

    const snapshot = await getDocs(
      collection(db, "mcqTests")
    );

    const testList = [];

    snapshot.forEach((docItem) => {

      const data = docItem.data();

      const moduleMatch =
        normalize(data.moduleId) === normalize(moduleId);

      const batchMatch =
        !data.batchId ||
        normalize(data.batchId) === normalize(student?.batchId);

      const activeMatch =
        data.active !== false;

      if (
        moduleMatch &&
        batchMatch &&
        activeMatch
      ) {

        const extension = extensions.find(
          (item) => item.testId === docItem.id
        );

        testList.push({
          id: docItem.id,
          ...data,
          extensionEndAt:
            extension?.extensionEndAt || null,
          extensionDays:
            extension?.extensionDays || 0,
        });

      }

    });

    console.log(
      "FINAL MCQ TESTS FOR STUDENT:",
      testList
    );

    setMcqTests(testList);

    if (testList.length > 0) {

      const questionSnapshot =
        await getDocs(
          collection(
            db,
            "mcqTests",
            testList[0].id,
            "questions"
          )
        );

      setTotalQuestions(
        questionSnapshot.size
      );

    } else {

      setTotalQuestions(0);

    }

    return testList;

  } catch (error) {

    console.error(
      "Error fetching MCQ tests:",
      error
    );

    setMcqTests([]);
    setTotalQuestions(0);

    return [];

  }

};

const fetchMcqHistory = async (email) => {


  const snapshot = await getDocs(
    collection(db, "mcqResults")
  );

  const history = [];

  let best = 0;

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (
      normalize(data.studentEmail) === normalize(email) &&
      normalize(data.moduleId) === normalize(moduleId)
    ) {

      history.push({
  id: docItem.id,
  ...data,
});

      if (data.score > best) {
        best = data.score;
      }

    }

  });

  history.sort(
    (a, b) =>
      a.attemptNumber -
      b.attemptNumber
  );

  setTestHistory(history);

  setBestScore(best);

};
const fetchTestAttempts = async (email) => {


  const snapshot = await getDocs(
    collection(db, "mcqResults")
  );

  let attempts = 0;
  let highestScore = 0;

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (
      normalize(data.studentEmail) === normalize(email) &&
      normalize(data.moduleId) === normalize(moduleId)
    ) {

      attempts++;

      if (
        data.score > highestScore
      ) {
        highestScore =
          data.score;
      }

    }

  });

  setAttemptCount(attempts);
  setBestScore(highestScore);

};
const fetchQuestions =
async (testId) => {

  const snapshot =
    await getDocs(
      collection(
        db,
        "mcqTests",
        testId,
        "questions"
      )
    );

  const questionList = [];

  snapshot.forEach((docItem) => {

    questionList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  console.log(
    "QUESTIONS:",
    questionList
  );

  setTestQuestions(
  questionList
);
setTotalQuestions(
  questionList.length
);


const resultSnapshot =
  await getDocs(
    query(
      collection(db, "mcqResults"),
      where(
        "studentEmail",
        "==",
        resolvedEmail
      ),
      where(
        "testId",
        "==",
        testId
      )
    )
  );

const attempts =
  resultSnapshot.docs.length;

setAttemptCount(attempts);

if (attempts >= 3) {

  alert(
    "Maximum 3 attempts already used"
  );

  return;

}

setShowTest(true);

};
const getAssessmentSubmission = (assignmentId) => {
  const matchingSubmissions = submissions
    .filter(
      (submission) =>
        submission.assignmentId === assignmentId &&
        normalize(submission.studentEmail) === normalize(resolvedEmail)
    )
    .sort((a, b) => {
      const getTime = (value) => {
        if (!value) return 0;

        if (typeof value?.toMillis === "function") {
          return value.toMillis();
        }

        if (value?.seconds) {
          return value.seconds * 1000;
        }

        const parsed = new Date(value).getTime();

        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return (
        getTime(b.submittedAt) -
        getTime(a.submittedAt)
      );
    });

  return matchingSubmissions[0] || null;
};
const handleAssignmentSubmit = async (assignmentId) => {
  console.log("SUBMIT BUTTON CLICKED:", assignmentId);

  try {
    const studentData =
      resolvedStudent ||
      JSON.parse(
        localStorage.getItem("studentData") || "null"
      );

    if (!studentData?.email || !studentData?.batchId) {
      alert(
        "Your student profile or batch could not be resolved. Please log in again."
      );
      return;
    }

    const assignment = assignments.find(
      (item) => item.id === assignmentId
    );

    if (!assignment) {
      alert(
        "This assessment could not be found. Please refresh the page."
      );
      return;
    }

    // --------------------------------------------------
    // IMPORTANT:
    // Re-read submissions before allowing upload.
    // This prevents duplicate submissions even if the
    // page has stale React state.
    // --------------------------------------------------

    const latestSubmissionSnapshot = await getDocs(
      collection(db, "submissions")
    );

    const existingSubmission =
      latestSubmissionSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter(
          (submission) =>
            submission.assignmentId === assignmentId &&
            normalize(submission.studentEmail) ===
              normalize(studentData.email)
        )
        .sort((a, b) => {
          const getTime = (value) => {
            if (!value) return 0;

            if (typeof value?.toMillis === "function") {
              return value.toMillis();
            }

            if (value?.seconds) {
              return value.seconds * 1000;
            }

            const parsed =
              new Date(value).getTime();

            return Number.isNaN(parsed)
              ? 0
              : parsed;
          };

          return (
            getTime(b.submittedAt) -
            getTime(a.submittedAt)
          );
        })[0];

    if (existingSubmission) {
      alert(
        assignment.type === "Project"
          ? "This project has already been submitted. Further submissions are locked."
          : "This assignment has already been submitted. Further submissions are locked."
      );

      await fetchSubmissions(studentData);

      return;
    }

    // --------------------------------------------------
    // Get the file selected specifically for this card
    // --------------------------------------------------

    const selectedFile =
      submissionFiles[assignmentId];

    if (!selectedFile) {
      alert(
        assignment.type === "Project"
          ? "Please select your project file first."
          : "Please select your assignment file first."
      );
      return;
    }

    // --------------------------------------------------
    // Upload
    // --------------------------------------------------

    const fileName =
      `${Date.now()}-${selectedFile.name}`;

    const { error } =
      await supabase.storage
        .from("assignment-submissions")
        .upload(
          fileName,
          selectedFile
        );

    if (error) {
      console.error(
        "Submission upload error:",
        error
      );

      alert(error.message);
      return;
    }

    const {
      data: publicUrlData
    } = supabase.storage
      .from("assignment-submissions")
      .getPublicUrl(fileName);

    // --------------------------------------------------
    // Create ONE submission record
    // --------------------------------------------------

    await addDoc(
      collection(db, "submissions"),
      {
        assignmentId:
          assignment.id,

        assignmentTitle:
          assignment.title,

        assignmentType:
          assignment.type,

        moduleId:
          assignment.moduleId,

        batchId:
          studentData.batchId,

        batchName:
          studentData.batchName,

        studentName:
          studentData.name,

        studentEmail:
          studentData.email,

        fileName:
          selectedFile.name,

        fileUrl:
          publicUrlData.publicUrl,

        submittedAt:
          new Date(),

        status:
          "Submitted",

        evaluated:
          false,

        marks:
          0,

        remarks:
          "",
      }
    );

    // =====================================================
// LEARNING STREAK
// Record the successful assignment/project submission
// only AFTER the existing submission is saved.
// =====================================================
try {
    await recordAndUpdateLearningStreak({
        studentEmail: studentData.email,
        activityType:
            String(assignment.type).trim().toLowerCase() === "project"
                ? "project_submitted"
                : "assignment_submitted",
        activityDate: new Date(),
        moduleId: assignment.moduleId || moduleId,
        moduleName: moduleName,
        sourceId: assignment.id,
        batchId: studentData.batchId || null,
    });
} catch (streakError) {
    console.error(
        "STREAK: Submission was saved, but streak activity could not be recorded:",
        streakError
    );
}

    // --------------------------------------------------
    // Clear only this assessment's file
    // --------------------------------------------------

    setSubmissionFiles(
      (previous) => {
        const updated = {
          ...previous,
        };

        delete updated[assignmentId];

        return updated;
      }
    );

    // --------------------------------------------------
    // VERY IMPORTANT:
    // Reload Firebase submissions immediately.
    // This updates the card + KPI without refresh.
    // --------------------------------------------------

    await fetchSubmissions(studentData);

    alert(
      assignment.type === "Project"
        ? "Project submitted successfully."
        : "Assignment submitted successfully."
    );

  } catch (error) {
    console.error(
      "Error submitting assessment:",
      error
    );

    alert(
      "Error submitting assessment. Please try again."
    );
  }
};
const handleModuleComplete = async () => {

    try {

        // =====================================================
        // 1. RESOLVE CURRENT STUDENT
        // =====================================================

        const student =
            resolvedStudent ||
            JSON.parse(
                localStorage.getItem("studentData") || "null"
            );

        if (!student?.email) {

            alert(
                "Your student profile could not be resolved. Please log in again."
            );

            return;
        }


        // =====================================================
        // 2. GET STUDENT ANALYTICS
        // =====================================================

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap =
            await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) {

            alert(
                "Your learning progress record is not available yet. Please refresh the page and try again."
            );

            return;
        }

        const analytics =
            analyticsSnap.data();

        const materialProgress =
            analytics.materialProgress || {};

        const moduleProgress =
            materialProgress[moduleName] || {};

        const pendingItems = [];


        // =====================================================
        // 3. READING MATERIALS
        // =====================================================

        if (readingMaterials.length > 0) {

            const readingData =
                moduleProgress.reading || {};

            const completedReading =
                readingMaterials.filter(
                    (material) =>
                        readingData[material.id]?.completed === true
                ).length;

            if (
                completedReading !==
                readingMaterials.length
            ) {

                pendingItems.push(
                    `Reading Materials (${completedReading}/${readingMaterials.length})`
                );

            }
        }


        // =====================================================
        // 4. PRACTICE MATERIALS
        // =====================================================

        if (practiceMaterials.length > 0) {

            const practiceData =
                moduleProgress.practice || {};

            const completedPractice =
                practiceMaterials.filter(
                    (material) =>
                        practiceData[material.id]?.completed === true
                ).length;

            if (
                completedPractice !==
                practiceMaterials.length
            ) {

                pendingItems.push(
                    `Practice Materials (${completedPractice}/${practiceMaterials.length})`
                );

            }
        }



        // =====================================================
        // 6. ASSIGNMENTS
        // =====================================================

        if (regularAssignments.length > 0) {

            const submittedAssignments =
                regularAssignments.filter(
                    (assignment) =>
                        submissions.some(
                            (submission) =>
                                submission.assignmentId ===
                                    assignment.id &&
                                normalize(
                                    submission.studentEmail
                                ) ===
                                    normalize(student.email)
                        )
                ).length;

            if (
                submittedAssignments !==
                regularAssignments.length
            ) {

                pendingItems.push(
                    `Assignments (${submittedAssignments}/${regularAssignments.length})`
                );

            }
        }


        // =====================================================
        // 7. PROJECTS
        // =====================================================

        if (projects.length > 0) {

            const submittedProjects =
                projects.filter(
                    (project) =>
                        submissions.some(
                            (submission) =>
                                submission.assignmentId ===
                                    project.id &&
                                normalize(
                                    submission.studentEmail
                                ) ===
                                    normalize(student.email)
                        )
                ).length;

            if (
                submittedProjects !==
                projects.length
            ) {

                pendingItems.push(
                    `Projects (${submittedProjects}/${projects.length})`
                );

            }
        }


        // =====================================================
        // 8. MINI TEST
        // =====================================================

        if (mcqTests.length > 0) {

            if (attemptCount === 0) {

                pendingItems.push(
                    "Mini Test"
                );

            }
        }


        // =====================================================
        // 9. STOP IF ANYTHING IS PENDING
        // =====================================================

        if (pendingItems.length > 0) {

            alert(
                `You cannot complete this module yet.

Please complete:

• ${pendingItems.join("\n• ")}`
            );

            return;
        }


        // =====================================================
        // 10. EVERYTHING IS COMPLETE
        // =====================================================

        const moduleKey =
            moduleName
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace("&", "");


        const updatedModules = {

            ...(analytics.modules || {}),

            [moduleKey]: 100,

        };


        const completedModules =
            Object.values(updatedModules)
                .filter(
                    (value) =>
                        value === 100
                ).length;


        const totalModules = 16;


        const overallProgress =
            totalModules > 0
                ? Math.round(
                    (completedModules /
                        totalModules) *
                    100
                )
                : 0;


        await updateDoc(
            analyticsRef,
            {
                modules:
                    updatedModules,

                modulesCompleted:
                    completedModules,

                overallProgress,
            }
        );

        // Record this as a learning activity for the streak.
        // This happens only after module completion has successfully
        // been saved to studentAnalytics.
        try {
            await recordAndUpdateLearningStreak({
                studentEmail: student.email,
                activityType: "module_completed",
                activityDate: new Date(),
                moduleId,
                moduleName,
                sourceId: moduleId,
                batchId: student.batchId || null,
            });
        } catch (streakError) {
            console.error(
                "STREAK: Module completion was saved, but streak activity could not be recorded:",
                streakError
            );
        }
        setModuleCompleted(true);


        alert(
            "🎉 Module Completed Successfully!"
        );

    } catch (error) {

        console.error(
            "ERROR COMPLETING MODULE:",
            error
        );

        alert(
            "Unable to complete the module. Please try again."
        );

    }

};

    
const loadStudentProgress = async (moduleNameOverride = null) => {

    try {

        const student = JSON.parse(
            localStorage.getItem("studentData") || "null"
        );

        if (!student?.email) {
            console.warn(
                "PROGRESS: No student email found."
            );
            return;
        }

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap =
            await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) {

            console.warn(
                "PROGRESS: studentAnalytics document does not exist:",
                student.email
            );

            setReadingProgress({});
            setPracticeProgress({});

            return;
        }

        const analytics =
    analyticsSnap.data();

const activeModuleName =
    moduleNameOverride || moduleName;

console.log(
    "===== LOADING STUDENT PROGRESS ====="
);

console.log(
    "Student email:",
    student.email
);

console.log(
    "Current moduleName state:",
    moduleName
);

console.log(
    "Module name override:",
    moduleNameOverride
);

console.log(
    "Active module name:",
    activeModuleName
);

const moduleKey =
    activeModuleName
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace("&", "");

const savedModuleCompleted =
    analytics.modules?.[moduleKey] === 100;

setModuleCompleted(
    savedModuleCompleted
);

        console.log(
            "Active module name:",
            activeModuleName
        );

        const materialProgress =
            analytics.materialProgress || {};

        const moduleMaterial =
            materialProgress[activeModuleName] || {};

        // =====================================================
        // READING PROGRESS
        // =====================================================

        let readingData =
            moduleMaterial.reading || {};

        // Convert legacy boolean structure:
        // reading: true
        // into the new per-material structure.
        if (
            typeof readingData !== "object" ||
            readingData === null ||
            Array.isArray(readingData)
        ) {
            readingData = {};
        }

        console.log(
            "READING PROGRESS LOADED:",
            readingData
        );

        setReadingProgress(readingData);


        // =====================================================
        // PRACTICE PROGRESS
        // =====================================================

        let practiceData =
            moduleMaterial.practice || {};

        if (
            typeof practiceData !== "object" ||
            practiceData === null ||
            Array.isArray(practiceData)
        ) {
            practiceData = {};
        }

        console.log(
            "PRACTICE PROGRESS LOADED:",
            practiceData
        );

        setPracticeProgress(practiceData);


        // =====================================================
        // INTERVIEW PROGRESS
        // =====================================================

        let interviewData =
            moduleMaterial.interview || {};

        if (
            typeof interviewData !== "object" ||
            interviewData === null ||
            Array.isArray(interviewData)
        ) {
            interviewData = {};
        }

        setPracticeCompleted(
            practiceData
        );

        setInterviewCompleted(
            interviewData
        );

        console.log(
            "===== PROGRESS LOAD COMPLETE ====="
        );

    } catch (error) {

        console.error(
            "ERROR LOADING STUDENT PROGRESS:",
            error
        );

    }

};
const isMaterialOpened = (materialId) => {
    return readingProgress[materialId]?.opened || false;
};
const isPracticeOpened = (materialId) => {
    return practiceProgress[materialId]?.opened || false;
};

const isPracticeCompleted = (materialId) => {
    return practiceProgress[materialId]?.completed || false;
};

const isMaterialCompleted = (materialId) => {
    return readingProgress[materialId]?.completed || false;
};
const trackMaterial = async (materialId) => {

    try {

        const student = JSON.parse(
            localStorage.getItem("studentData")
        );

        if (!student) return;

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap = await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) return;

        const analytics = analyticsSnap.data();

        const materialProgress =
            analytics.materialProgress || {};

        if (!materialProgress[moduleName]) {
            materialProgress[moduleName] = {};
        }

        // Convert old boolean structure to new object structure
if (
    typeof materialProgress[moduleName].reading !== "object" ||
    materialProgress[moduleName].reading === null
) {
    materialProgress[moduleName].reading = {};
}

        const existing =
            materialProgress[moduleName]
                .reading[materialId] || {};

        materialProgress[moduleName]
            .reading[materialId] = {

            ...existing,

            opened: true,

            completed: true,

        };

        await updateDoc(
            analyticsRef,
            {
                materialProgress,
            }
        );
        console.log("Firestore updated successfully");
console.log(materialProgress);

        await loadStudentProgress();

    } catch (error) {

        console.log(error);

    }

};
const trackPracticeMaterial = async (material) => {

    const student = JSON.parse(
        localStorage.getItem("studentData")
    );

    if (!student) return;

    const analyticsRef = doc(
        db,
        "studentAnalytics",
        student.email
    );

    const analyticsSnap =
        await getDoc(analyticsRef);

    if (!analyticsSnap.exists()) return;

    const analytics =
        analyticsSnap.data();

    const materialProgress =
        analytics.materialProgress || {};

    if (!materialProgress[moduleName]) {
        materialProgress[moduleName] = {};
    }

    if (!materialProgress[moduleName].practice) {
        materialProgress[moduleName].practice = {};
    }

    const existing =
        materialProgress[moduleName]
            .practice[material.id] || {};

    materialProgress[moduleName]
        .practice[material.id] = {

        ...existing,

        opened: true,

    };

    await updateDoc(analyticsRef, {

        materialProgress,

    });

    setPracticeProgress(
        materialProgress[moduleName]
            .practice
    );


};
const completePracticeMaterial = async (materialId) => {

    const student = JSON.parse(
        localStorage.getItem("studentData")
    );

    if (!student) return;

    const analyticsRef = doc(
        db,
        "studentAnalytics",
        student.email
    );

    const analyticsSnap = await getDoc(analyticsRef);

    if (!analyticsSnap.exists()) return;

    const analytics = analyticsSnap.data();

    const materialProgress =
        analytics.materialProgress || {};

    if (!materialProgress[moduleName])
        materialProgress[moduleName] = {};

    if (!materialProgress[moduleName].practice)
        materialProgress[moduleName].practice = {};

    materialProgress[moduleName].practice[materialId] = {

        ...(materialProgress[moduleName].practice[materialId] || {}),

        opened: true,

        completed: true,

    };

    await updateDoc(analyticsRef, {

    materialProgress,

});

setPracticeProgress(
    materialProgress[moduleName].practice
);

await loadStudentProgress(
    moduleName
);

};

const handleOpenMaterial = async (material) => {

    try {

        // =====================================================
        // OPEN THE FILE IMMEDIATELY
        // =====================================================

        if (material?.fileUrl) {

            window.open(
                material.fileUrl,
                "_blank",
                "noopener,noreferrer"
            );

        } else {

            console.warn(
                "No fileUrl found for material:",
                material
            );

        }


        // =====================================================
        // GET CURRENT STUDENT
        // =====================================================

        const student = JSON.parse(
            localStorage.getItem("studentData") || "null"
        );

        if (!student?.email) {

            console.warn(
                "OPEN MATERIAL: Student email not found."
            );

            return;
        }


        // =====================================================
        // FIRESTORE ANALYTICS DOCUMENT
        // =====================================================

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap =
            await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) {

            console.error(
                "OPEN MATERIAL: studentAnalytics document not found:",
                student.email
            );

            alert(
                "Your learning progress record could not be found."
            );

            return;
        }


        const analytics =
            analyticsSnap.data();

        const materialProgress =
            analytics.materialProgress || {};


        // =====================================================
        // MODULE
        // =====================================================

        if (!materialProgress[moduleName]) {

            materialProgress[moduleName] = {};

        }


        // =====================================================
        // READING OBJECT
        // =====================================================

        if (
            typeof materialProgress[moduleName].reading !== "object" ||
            materialProgress[moduleName].reading === null ||
            Array.isArray(
                materialProgress[moduleName].reading
            )
        ) {

            materialProgress[moduleName].reading = {};

        }


        // =====================================================
        // EXISTING MATERIAL PROGRESS
        // =====================================================

        const existing =
            materialProgress[moduleName]
                .reading[material.id] || {};


        // =====================================================
        // MARK MATERIAL AS OPENED
        // =====================================================

        materialProgress[moduleName]
            .reading[material.id] = {

                ...existing,

                opened: true,

                completed:
                    existing.completed === true
                        ? true
                        : false,

            };


        console.log(
            "===== OPEN MATERIAL PROGRESS ====="
        );

        console.log(
            "Module:",
            moduleName
        );

        console.log(
            "Material ID:",
            material.id
        );

        console.log(
            "Material title:",
            material.title
        );

        console.log(
            "Updated reading progress:",
            materialProgress[moduleName].reading
        );


        // =====================================================
        // SAVE TO FIRESTORE
        // =====================================================

        await updateDoc(
            analyticsRef,
            {
                materialProgress,
            }
        );


        console.log(
            "OPENED STATUS SAVED TO FIRESTORE"
        );


        // =====================================================
        // UPDATE REACT STATE IMMEDIATELY
        // =====================================================

        setReadingProgress(
            materialProgress[moduleName].reading
        );


    } catch (error) {

        console.error(
            "ERROR TRACKING OPEN MATERIAL:",
            error
        );

    }

};

const handleMarkRead = async (material) => {

    try {

        const student = JSON.parse(
            localStorage.getItem("studentData")
        );

        if (!student) return;

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        const analyticsSnap = await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) return;

        const analytics = analyticsSnap.data();

        const materialProgress =
            analytics.materialProgress || {};

        if (!materialProgress[moduleName]) {
            materialProgress[moduleName] = {};
        }

        if (!materialProgress[moduleName].reading) {
            materialProgress[moduleName].reading = {};
        }

        const existing =
            materialProgress[moduleName].reading[
                material.id
            ] || {};

        materialProgress[moduleName].reading[
            material.id
        ] = {
            ...existing,
            opened: true,
            completed: true,
        };

        await updateDoc(
    analyticsRef,
    {
        materialProgress,
    }
);

setReadingProgress(
    materialProgress[moduleName].reading
);

await loadStudentProgress(
    moduleName
);

    } catch (error) {

        console.log(error);

    }

};
useEffect(() => {

    let cancelled = false;

    const loadEverything = async (authUser) => {

        const student =
    await getAuthoritativeStudent(authUser);

if (cancelled) return;

await ensureStudentAnalytics(student);

const loadedModuleName =
    await fetchModule();

await fetchMaterials();

await fetchAssignments(student);

await fetchSubmissions(student);

const extensions =
    await fetchTestExtensions(student?.email);

await fetchMcqTests(
    student,
    extensions
);

await fetchTestAttempts(
    student?.email
);

await fetchMcqHistory(
    student?.email
);

await loadStudentProgress(
    loadedModuleName
);

    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        loadEverything(user);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };

}, [moduleId]);


        const readingCompletedCount = readingMaterials.filter(
    (material) => isMaterialCompleted(material.id)
  ).length;

  const practiceCompletedCount = practiceMaterials.filter(
    (material) => isPracticeCompleted(material.id)
  ).length;

  const interviewCompletedCount = interviewMaterials.filter(
    (material) =>
      readingProgress[material.id]?.completed === true ||
      practiceProgress[material.id]?.completed === true
  ).length;

  const submittedAssignmentCount =
  regularAssignments.filter((assignment) =>
    submissions.some(
      (submission) =>
        submission.assignmentId === assignment.id &&
        normalize(submission.studentEmail) ===
          normalize(resolvedEmail)
    )
  ).length;
  const submittedProjectCount = projects.filter((project) =>
  submissions.some(
    (submission) =>
      submission.assignmentId === project.id &&
      normalize(submission.studentEmail) === normalize(resolvedEmail)
  )
).length;

  const assessmentTotal =
  regularAssignments.length +
  projects.length;

const assessmentCompleted =
  submittedAssignmentCount +
  submittedProjectCount;

const learningItemsTotal =
    readingMaterials.length +
    practiceMaterials.length +
    assessmentTotal +
    (mcqTests.length > 0 ? 1 : 0);

const learningItemsCompleted =
    readingCompletedCount +
    practiceCompletedCount +
    assessmentCompleted +
    (mcqTests.length > 0 && attemptCount > 0 ? 1 : 0);

  const moduleProgressPercent = learningItemsTotal
    ? Math.min(
        100,
        Math.round((learningItemsCompleted / learningItemsTotal) * 100)
      )
    : moduleCompleted
      ? 100
      : 0;

  const moduleIcon =
    moduleName === "Python"
      ? "🐍"
      : moduleName === "NumPy"
        ? "📊"
        : moduleName === "Pandas"
          ? "🐼"
          : moduleName === "Data Visualization"
            ? "📈"
            : moduleName === "EDA"
              ? "🔍"
              : moduleName === "Tableau"
                ? "📊"
                : moduleName === "Power BI"
                  ? "📉"
                  : moduleName === "SQL"
                    ? "🗄️"
                    : moduleName === "Excel"
                      ? "📗"
                      : moduleName === "R Language"
                        ? "📐"
                        : moduleName === "Statistics & Mathematics"
                          ? "📚"
                          : moduleName === "Machine Learning"
                            ? "🤖"
                            : moduleName === "Deep Learning"
                              ? "🧠"
                              : moduleName === "Generative AI"
                                ? "✨"
                                : moduleName === "Agentic AI"
                                  ? "⚡"
                                  : moduleName === "MLOps"
                                    ? "🚀"
                                    : "🎯";

  console.log("MODULE RENDER STATE:", {
    moduleId,
    assignmentsCount: assignments.length,
    regularAssignmentsCount: regularAssignments.length,
    projectsCount: projects.length,
    assessmentTotal,
    assessmentCompleted,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-[1500px] mx-auto px-4 py-6 md:px-8 md:py-8">

        {/* =========================================================
            PREMIUM MODULE HERO
        ========================================================== */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white shadow-2xl mb-8">
          <div className="absolute -top-28 -right-20 h-72 w-72 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_35%)]" />

          <div className="relative z-10 p-7 md:p-10 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center text-3xl shadow-lg">
                    {moduleIcon}
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs md:text-sm font-bold uppercase tracking-[0.2em]">
                      Course Module
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Synaptech Learning Hub
                    </p>
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  {moduleName}
                </h1>

                <p className="text-blue-100/90 text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
                  Build your understanding, practise your skills, attend sessions,
                  complete assessments and track your progress — all in one place.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {moduleCompleted ? "Module Completed" : "Learning in Progress"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                    📚 {learningItemsTotal} Learning Items
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                    📝 {assessmentTotal} Assessments
                  </span>
                </div>
              </div>

              <div className="w-full lg:w-[330px] rounded-3xl bg-white/10 border border-white/10 backdrop-blur-md p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-blue-200 font-bold">
                      Module Progress
                    </p>
                    <p className="text-3xl font-black mt-1">
                      {moduleCompleted ? 100 : moduleProgressPercent}%
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">
                    {moduleCompleted ? "✓" : `${moduleProgressPercent}%`}
                  </div>
                </div>

                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 transition-all duration-700"
                    style={{
                      width: `${moduleCompleted ? 100 : moduleProgressPercent}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-3 text-xs text-blue-100/70">
                  <span>{learningItemsCompleted} completed</span>
                  <span>{learningItemsTotal} total</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            MODULE OVERVIEW
        ========================================================== */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[
  {
    label: "Reading",
    value: `${readingCompletedCount}/${readingMaterials.length}`,
    icon: "📖",
    tone: "blue",
    bgClass: "bg-blue-50 border-blue-100",
    iconClass: "bg-blue-100",
  },
  {
    label: "Practice",
    value: `${practiceCompletedCount}/${practiceMaterials.length}`,
    icon: "💻",
    tone: "emerald",
    bgClass: "bg-emerald-50 border-emerald-100",
    iconClass: "bg-emerald-100",
  },
  {
    label: "Assignments",
    value: `${submittedAssignmentCount}/${regularAssignments.length}`,
    icon: "📝",
    tone: "amber",
    bgClass: "bg-amber-50 border-amber-100",
    iconClass: "bg-amber-100",
  },
  {
    label: "Projects",
    value: `${submittedProjectCount}/${projects.length}`,
    icon: "🚀",
    tone: "purple",
    bgClass: "bg-purple-50 border-purple-100",
    iconClass: "bg-purple-100",
  },
  {
    label: "Mini Test",
    value: mcqTests.length
      ? `${attemptCount > 0 ? 1 : 0}/1`
      : "N/A",
    icon: "🧠",
    tone: "rose",
    bgClass: "bg-rose-50 border-rose-100",
    iconClass: "bg-rose-100",
  },
].map((item) => (
            <div
  key={item.label}
  className={`${item.bgClass} rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all duration-300`}
>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-slate-800 mt-2">
                    {item.value}
                  </p>
                </div>
                <div
  className={`${item.iconClass} h-11 w-11 rounded-xl flex items-center justify-center text-xl`}
>
  {item.icon}
</div>
              </div>
            </div>
          ))}
        </section>

        {/* =========================================================
            READING MATERIALS
        ========================================================== */}
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 md:px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Learn
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                  Reading Materials
                </h2>
                <p className="text-slate-500 mt-1">
                  Study the core material before moving on to practice and assessment.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-bold">
                {readingCompletedCount}/{readingMaterials.length} completed
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {readingMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                <div className="text-4xl mb-3">📚</div>
                <p className="font-semibold text-slate-600">No reading materials available.</p>
                <p className="text-sm text-slate-400 mt-1">Your trainer has not published material for this module yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {readingMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                        📘
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            PDF
                          </span>
                          {isMaterialCompleted(material.id) ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                              ✓ Completed
                            </span>
                          ) : isMaterialOpened(material.id) ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              Not Started
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mt-3 leading-snug">
                          {material.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2">Estimated reading time · 60 mins</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => handleOpenMaterial(material)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white py-3 text-sm font-bold transition-all cursor-pointer"
                      >
                        Open Material ↗
                      </button>

                      {isMaterialCompleted(material.id) ? (
                        <button
                          disabled
                          className="rounded-xl bg-emerald-100 text-emerald-700 py-3 text-sm font-bold cursor-not-allowed"
                        >
                          ✓ Completed
                        </button>
                      ) : (
                        <button
                          disabled={!isMaterialOpened(material.id)}
                          onClick={() => handleMarkRead(material)}
                          className={`rounded-xl py-3 text-sm font-bold transition-all ${
                            isMaterialOpened(material.id)
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isMaterialOpened(material.id) ? "Mark as Complete" : "Open First"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            PRACTICE MATERIALS
        ========================================================== */}
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 md:px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Practice</p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Practice Materials</h2>
                <p className="text-slate-500 mt-1">Apply what you have learned through hands-on exercises.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-bold">
                {practiceCompletedCount}/{practiceMaterials.length} completed
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {practiceMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                <div className="text-4xl mb-3">💻</div>
                <p className="font-semibold text-slate-600">No practice materials available.</p>
                <p className="text-sm text-slate-400 mt-1">Practice resources will appear here when published.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {practiceMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                        💻
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            Practice
                          </span>
                          {isPracticeCompleted(material.id) ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">✓ Completed</span>
                          ) : isPracticeOpened(material.id) ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">In Progress</span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Not Started</span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mt-3">{material.title}</h3>
                        <p className="text-sm text-slate-500 mt-2">Open the resource, practise the task and mark it completed.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (material.fileUrl) {
                          window.open(material.fileUrl, "_blank", "noopener,noreferrer");
                        }
                        trackPracticeMaterial(material);
                      }}
                      className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 text-sm font-bold transition-all cursor-pointer"
                    >
                      Open Practice Material ↗
                    </button>

                    {isPracticeOpened(material.id) && !isPracticeCompleted(material.id) && (
                      <button
                        onClick={() => completePracticeMaterial(material.id)}
                        className="mt-2 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-bold transition-all"
                      >
                        Mark Practice as Completed
                      </button>
                    )}

                    {isPracticeCompleted(material.id) && (
                      <button
                        disabled
                        className="mt-2 w-full rounded-xl bg-emerald-100 text-emerald-700 py-3 text-sm font-bold cursor-not-allowed"
                      >
                        ✓ Practice Completed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            ASSIGNMENTS
        ========================================================== */}
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm mb-8 overflow-hidden">

  {/* =========================================================
      ASSESSMENTS HEADER
  ========================================================== */}
  <div className="px-6 md:px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
          Assessments
        </p>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
          Assignments, Projects
        </h2>

        <p className="text-slate-500 mt-1">
          Complete your coursework, practical projects and final assessment.
        </p>
      </div>

      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-4 py-2 text-sm font-bold">
        {assessmentCompleted}/{assessmentTotal} submitted
      </span>

    </div>
  </div>

  <div className="p-6 md:p-8">

    <div className="grid lg:grid-cols-2 gap-6 items-start">
    {assessmentGroups.map((group) => (
      <div key={group.key} className="min-w-0">

        {/* =====================================================
            GROUP HEADER
        ====================================================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

          <div className="flex items-center gap-3">

            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${group.badgeClass}`}
            >
              {group.icon}
            </div>

            <div>
              <h3
                className={`text-xl md:text-2xl font-black ${group.headingClass}`}
              >
                {group.title}
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                {group.subtitle}
              </p>
            </div>

          </div>

          <span
            className={`self-start md:self-auto px-3 py-1.5 rounded-full text-xs font-bold ${group.badgeClass}`}
          >
            {group.items.length}{" "}
            {group.items.length === 1 ? "Item" : "Items"}
          </span>

        </div>

        {/* =====================================================
            GROUP CONTENT
        ====================================================== */}

        {group.items.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">

            <p className="font-semibold text-slate-500">
              No {group.title.toLowerCase()} available.
            </p>

            <p className="text-sm text-slate-400 mt-1">
              Your trainer has not published any yet.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-6">

            {group.items.map((assignment) => {
                  const evaluation =
  getAssessmentSubmission(
    assignment.id
  );

                  return (
                    <div
                      key={assignment.id}
                      className="group border border-slate-200 rounded-2xl overflow-hidden bg-white hover:shadow-xl hover:border-amber-200 transition-all duration-300"
                    >
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm shrink-0">📝</div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                                {assignment.type || "Assignment"}
                              </p>
                              <h3 className="text-lg md:text-xl font-black text-slate-800 mt-1">
                                {assignment.title}
                              </h3>
                            </div>
                          </div>

                          {evaluation?.evaluated ? (
                            <span className="whitespace-nowrap bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">✓ Evaluated</span>
                          ) : evaluation ? (
                            <span className="whitespace-nowrap bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Submitted</span>
                          ) : (
                            <span className="whitespace-nowrap bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Pending</span>
                          )}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-400 font-semibold">Due Date</p>
                            <p className="text-sm font-bold text-slate-700 mt-1">📅 {assignment.dueDate || "No due date"}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-400 font-semibold">Type</p>
                            <p className="text-sm font-bold text-slate-700 mt-1">{assignment.type || "Assignment"}</p>
                          </div>
                        </div>

                        {assignment.description && (
                          <div className="mb-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Instructions</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{assignment.description}</p>
                          </div>
                        )}

                        {assignment.assignmentFileUrl && (
                          <a
                            href={assignment.assignmentFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl font-bold transition-all mb-5"
                          >
                            📥 {normalize(assignment.type) === "project"
  ? "Download Project"
  : "Download Assignment"}
                          </a>
                        )}

                        <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50">

  {!evaluation ? (
    <>
      <p className="text-sm font-bold text-slate-700 mb-3">
        Submit Your Work
      </p>

      <input
        type="file"
        onChange={(e) => {
          const file =
            e.target.files?.[0] || null;

          setSubmissionFiles(
            (previous) => ({
              ...previous,
              [assignment.id]: file,
            })
          );
        }}
        className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 mb-3"
      />

      {submissionFiles[assignment.id] && (
        <div className="mb-3 rounded-xl bg-white border border-blue-100 px-3 py-2">
          <p className="text-xs font-semibold text-slate-500">
            Selected file
          </p>

          <p className="text-sm font-bold text-slate-700 truncate mt-1">
            {submissionFiles[assignment.id].name}
          </p>
        </div>
      )}

      <button
        onClick={() =>
          handleAssignmentSubmit(
            assignment.id
          )
        }
        disabled={
          !submissionFiles[assignment.id]
        }
        className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${
          submissionFiles[assignment.id]
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        📤{" "}
        {normalize(assignment.type) === "project"
          ? "Submit Project"
          : "Submit Assignment"}
      </button>
    </>
  ) : (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

      <div className="flex items-center justify-between gap-3 flex-wrap">

        <div>
          <p className="font-black text-emerald-700">
            ✓{" "}
            {normalize(assignment.type) === "project"
              ? "Project Submitted"
              : "Assignment Submitted"}
          </p>

          <p className="text-xs text-emerald-600 mt-1">
            Further submissions are locked.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs font-black">
          Submission Locked
        </span>

      </div>

      {evaluation.evaluated ? (
        <p className="mt-3 text-xs font-bold text-emerald-700">
          ✓ Evaluated by faculty
        </p>
      ) : (
        <p className="mt-3 text-xs font-bold text-amber-700">
          ⏳ Evaluation Awaited
        </p>
      )}

    </div>
  )}

</div>

                        {evaluation?.evaluated && (
                          <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <p className="font-black text-emerald-700">
  ✓{" "}
  {normalize(assignment.type) === "project"
    ? "Project Evaluated"
    : "Assignment Evaluated"}
</p>
                              <span className="bg-white text-emerald-700 px-3 py-1 rounded-full font-black text-sm shadow-sm">
                                {evaluation.marks} Marks
                              </span>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Trainer Remarks</p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {evaluation.remarks || "No remarks provided."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );

            })}

          </div>

        )}

      </div>

    ))}
    </div>

  </div>

</section>

        {/* =========================================================
            MINI TEST — COMPACT PREMIUM CARD
        ========================================================== */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-rose-50/40 to-violet-50/50 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="absolute -left-10 -bottom-16 h-32 w-32 rounded-full bg-rose-400/10 blur-3xl" />

            <div className="relative z-10 p-5 md:p-7">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-violet-200">
                    🧠
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">
                        Knowledge Check
                      </span>
                      {mcqTests.length > 0 && (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                          attemptCount >= 3
                            ? "bg-slate-900 text-white"
                            : attemptCount > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {attemptCount >= 3 ? "Locked" : attemptCount > 0 ? "Attempted" : "Not Started"}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                      Mini Test
                    </h2>
                    <p className="text-slate-500 mt-1">
                      Test your understanding of this module with a short auto-evaluated assessment.
                    </p>

                    {mcqTests.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                          📝 {totalQuestions || 10} Questions
                        </span>
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                          ⏱ {mcqTests[0]?.duration || "25 Minutes"}
                        </span>
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                          🔁 {attemptCount}/3 Attempts
                        </span>
                        <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
                          ⭐ Best: {totalQuestions ? Math.round((bestScore / totalQuestions) * 100) : 0}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400 mt-4">
                        No Mini Test has been published for this module yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-[250px] shrink-0">
                  {mcqTests.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowMiniTestPanel(true)}
                      className={`w-full py-4 px-5 rounded-2xl font-black text-base shadow-lg transition-all hover:-translate-y-0.5 ${
                        attemptCount >= 3
                          ? "bg-slate-900 hover:bg-slate-800 text-white"
                          : "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white"
                      }`}
                    >
                      {attemptCount >= 3 ? "View Test Result →" : attemptCount > 0 ? "Open Mini Test →" : "Start Mini Test →"}
                    </button>
                  ) : (
                    <div className="w-full rounded-2xl bg-slate-100 text-slate-400 py-4 px-5 text-center font-bold">
                      Test Unavailable
                    </div>
                  )}

                  <p className="text-center text-xs text-slate-400 mt-3">
                    Up to 3 attempts • Best score is retained
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            MINI TEST — FULL EXPERIENCE IN A MODAL
        ========================================================== */}
        {showMiniTestPanel && mcqTests.length > 0 && (
          <div
            className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm p-3 md:p-6 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Mini Test"
          >
            <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-[30px] bg-white shadow-2xl">
              <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 md:px-7 py-4 bg-white/95 backdrop-blur border-b border-slate-200">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
                    Knowledge Assessment
                  </p>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                    {mcqTests[0]?.title || "Mini Test"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMiniTestPanel(false)}
                  className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg transition-all"
                  aria-label="Close Mini Test"
                >
                  ×
                </button>
              </div>

              <div className="p-3 md:p-6">
                <MiniTestSection
                  tests={mcqTests}
                  history={testHistory}
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            INTERVIEW PREPARATION
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm mb-8 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-5 md:px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Career Preparation</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Interview Questions & Answers</h2>
            <p className="text-slate-500 mt-1">Prepare for technical interviews with module-specific questions.</p>
          </div>

          <div className="p-5 md:p-7">
            {interviewMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <p className="font-semibold text-slate-600">No interview materials available.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {interviewMaterials.map((material) => (
                  <a
                    key={material.id}
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackMaterial(material.id)}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-lg">🎯</div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{material.title}</p>
                        <p className="text-xs text-slate-500 mt-1">Interview preparation resource</p>
                      </div>
                    </div>
                    <span className="text-violet-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Open →</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            MODULE COMPLETION
        ========================================================== */}
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-2xl">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="relative z-10 p-7 md:p-9">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Final Step</p>
                <h2 className="text-2xl md:text-3xl font-black mt-2">Module Completion</h2>
                <p className="text-blue-100/75 mt-3 leading-relaxed">
                  Complete the required learning activities, submit your assessments and finish the Mini Test before marking this module as completed.
                </p>

                <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden max-w-xl">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-700"
                    style={{ width: `${moduleCompleted ? 100 : moduleProgressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-blue-200/70 mt-2">
                  Current learning progress: {moduleCompleted ? 100 : moduleProgressPercent}%
                </p>
              </div>

              <div className="w-full lg:w-[360px]">
                {moduleCompleted ? (
                  <button
                    disabled
                    className="w-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 py-4 rounded-2xl font-black text-lg cursor-not-allowed"
                  >
                    Module Completed ✓
                  </button>
                ) : (
                  <button
                    onClick={handleModuleComplete}
                    className="w-full bg-white text-blue-950 hover:bg-blue-50 py-4 rounded-2xl font-black text-lg shadow-xl transition-all hover:-translate-y-0.5"
                  >
                    Mark Module as Completed
                  </button>
                )}
                <p className="text-center text-xs text-blue-200/60 mt-3">
                  Your completion status will be saved to your learning progress.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );

}
