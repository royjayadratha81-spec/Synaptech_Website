import DashboardStats from "../components/learninghub/DashboardStats";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../firebase/firebaseConfig";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from "firebase/firestore";

import UpcomingClassCard from "../components/learninghub/UpcomingClassCard";
import AssignmentCard from "../components/learninghub/AssignmentCard";
import AchievementCard from "../components/learninghub/AchievementCard";
import DashboardChart from "../components/dashboard/DashboardChart";
import CourseHero from "../components/learninghub/CourseHero";
import {
    getResolvedAttendanceRecord,
    getStudentAttendanceStats,
} from "../utils/attendanceUtils";
import {
    loadAssessmentTable,
} from "../services/assessmentAnalyticsService";
import { getBatchRank } from "../services/batchRankService";

const getAnalyticsModuleKey = (moduleName) => {
    const name = String(moduleName || "")
        .trim()
        .toLowerCase();

    const keyMap = {
        "r language": "rlanguage",
        "statistics & mathematics": "statistics",
        "generative ai": "generativeai",
        "agentic ai": "agenticai",
        "machine learning": "machinelearning",
        "deep learning": "deeplearning",
        "data visualization": "datavisualization",
        "power bi": "powerbi",
        "mlops": "mlops",
        "python": "python",
        "numpy": "numpy",
        "pandas": "pandas",
        "eda": "eda",
        "tableau": "tableau",
        "sql": "sql",
        "excel": "excel",
    };

    return keyMap[name] || name.replace(/\s+/g, "");
};
const toJsDate = (value) => {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
};

const getAssessmentType = (assessment) => {
    const type = String(
        assessment?.type ||
        assessment?.assignmentType ||
        ""
    )
        .trim()
        .toLowerCase();

    if (type.includes("capstone")) {
        return "capstone";
    }

    if (type.includes("project")) {
        return "project";
    }

    if (type.includes("assignment")) {
        return "assignment";
    }

    return "assignment";
};
export default function LearningHub() {

    const [analytics, setAnalytics] = useState(null);
const [student, setStudent] = useState(null);
const [latestAssignment, setLatestAssignment] = useState(null);
const [nextLiveClass, setNextLiveClass] = useState(null);
const [modules, setModules] = useState([]);
const [currentModule, setCurrentModule] = useState(null);
const [moduleProgress, setModuleProgress] = useState(0);
const [learningGoalModules, setLearningGoalModules] = useState([]);
const [latestAchievement, setLatestAchievement] = useState(null);
const [assessmentRows, setAssessmentRows] = useState([]);

const [dashboardStats, setDashboardStats] = useState({
    totalModules: 0,
    completedModules: 0,

    completedAssignments: 0,
    completedProjects: 0,
    completedMiniTests: 0,

    pendingAssignments: 0,
    pendingProjects: 0,
    pendingMiniTests: 0,

    attendance: 0,
    overallProgress: 0,
});


    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (user) => {

            if (!user) return;

            const ref = doc(db, "studentAnalytics", user.email);

            const snap = await getDoc(ref);

            let analyticsData = {};

if (snap.exists()) {
    analyticsData = snap.data();
    setAnalytics(analyticsData);
}
            // Load student profile

const studentRef = doc(db, "students", user.uid);

const studentSnap = await getDoc(studentRef);


if (studentSnap.exists()) {

    const studentData = studentSnap.data();

console.log("Firebase UID:", user.uid);
console.log("Student Data:", studentData);

const financeQuery = query(
    collection(db, "finance"),
    where(
        "studentEmail",
        "==",
        studentData.email || user.email
    ),
    limit(1)
);

const financeSnapshot = await getDocs(financeQuery);

let paymentStatus = "Pending";

if (!financeSnapshot.empty) {
    const financeData = financeSnapshot.docs[0].data();

    paymentStatus =
        Number(financeData.balanceAmount || 0) <= 0
            ? "Paid"
            : financeData.paymentStatus || "Pending";
}

const studentWithPayment = {
    ...studentData,
    paymentStatus,
};

setStudent(studentWithPayment);
setStudent(studentWithPayment);


    // Student not yet assigned to a batch
if (!studentData.batchId) {


    return;
}

// -------------------------
// TEST BATCH RANK
// -------------------------
try {
    const currentBatchRank = await getBatchRank(
        studentData.email || user.email,
        studentData.batchId
    );

    console.log("=================================");
    console.log("LEARNING HUB BATCH RANK TEST");
    console.log("Student:", studentData.email || user.email);
    console.log("Batch:", studentData.batchId);
    console.log("Batch Rank:", currentBatchRank);
    setAnalytics((previous) => ({
    ...(previous || analyticsData || {}),
    batchRank: currentBatchRank,
}));
    console.log("=================================");
} catch (rankError) {
    console.error(
        "LEARNING HUB BATCH RANK TEST FAILED:",
        rankError
    );
}

    // -------------------------
// LOAD ALL BATCH ASSESSMENTS
// -------------------------

const assignmentSnapshot = await getDocs(
    query(
        collection(db, "assignments"),
        where("batchId", "==", studentData.batchId)
    )
);

const assignmentDefinitions =
    assignmentSnapshot.docs.map((assignmentDoc) => ({
        id: assignmentDoc.id,
        ...assignmentDoc.data(),
    }));

console.log(
    "LEARNING HUB ASSESSMENT DEFINITIONS:",
    assignmentDefinitions
);
// -------------------------
// LOAD BATCH LIVE SESSIONS
// -------------------------

const liveQuery = query(
    collection(db, "liveSessions"),
    where("batchId", "==", studentData.batchId)
);

const liveSnapshot = await getDocs(liveQuery);

const liveSessions = liveSnapshot.docs.map((sessionDoc) => ({
    id: sessionDoc.id,
    ...sessionDoc.data(),
}));

// Convert Firestore / Date / string values into JS Date
const getSessionStartDate = (session) => {
    if (session?.scheduledStartAt) {
        if (typeof session.scheduledStartAt?.toDate === "function") {
            return session.scheduledStartAt.toDate();
        }

        const parsed = new Date(session.scheduledStartAt);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    if (session?.startAt) {
        if (typeof session.startAt?.toDate === "function") {
            return session.startAt.toDate();
        }

        const parsed = new Date(session.startAt);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    if (session?.date && session?.time) {
        const parsed = new Date(
            `${session.date}T${session.time}`
        );

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
};

// -------------------------
// FIND NEXT UPCOMING SESSION
// -------------------------

const now = new Date();

const upcomingSessions = liveSessions
    .filter(
        (session) =>
            session.status === "scheduled" &&
            getSessionStartDate(session)
    )
    .sort(
        (a, b) =>
            getSessionStartDate(a).getTime() -
            getSessionStartDate(b).getTime()
    );

if (upcomingSessions.length > 0) {
    setNextLiveClass(upcomingSessions[0]);
} else {
    setNextLiveClass(null);
}

// -------------------------
// FIND FACULTY'S CURRENT
// COURSE PROGRESS
// -------------------------

const facultyProgressSessions = liveSessions
    .filter(
        (session) =>
            session.status === "live" ||
            session.status === "ended"
    )
    .filter(
        (session) =>
            session.moduleId
    )
    .sort((a, b) => {
        const aDate =
            getSessionStartDate(a)?.getTime() || 0;

        const bDate =
            getSessionStartDate(b)?.getTime() || 0;

        return bDate - aDate;
    });

const latestFacultySession =
    facultyProgressSessions[0] || null;
    console.log(
    "LEARNING HUB NEXT LIVE SESSION:",
    upcomingSessions[0] || null
);

console.log(
    "LEARNING HUB LATEST FACULTY SESSION:",
    latestFacultySession
);
// -------------------------
// Load modules
// -------------------------

const moduleQuery = query(
    collection(db, "modules"),
    orderBy("moduleOrder", "asc")
);

const moduleSnapshot = await getDocs(moduleQuery);

const moduleList = moduleSnapshot.docs
    .map(doc => ({
        id: doc.id,
        ...doc.data(),
    }))
    .filter(
        (module) =>
            String(module.moduleName || "")
                .trim()
                .toLowerCase() !==
            "interview questions & answers"
    );

setModules(moduleList);
console.log(
    "LEARNING HUB COURSE MODULES (INTERVIEW EXCLUDED):",
    moduleList.map((module) => module.moduleName)
);
const completedModuleCount = moduleList.filter((module) => {
    const key = getAnalyticsModuleKey(module.moduleName);

    return Number(
        analyticsData?.modules?.[key] ?? 0
    ) >= 100;
}).length;
console.log(
    "LEARNING HUB MODULE ANALYTICS:",
    JSON.stringify(analyticsData?.modules || {}, null, 2)
);

console.log(
    "LEARNING HUB MODULE LIST:",
    moduleList.map((module) => module.moduleName)
);
const moduleProgressValues = moduleList.map((module) => {
    const key = getAnalyticsModuleKey(module.moduleName);

    return Number(
        analyticsData?.modules?.[key] ?? 0
    );
});

const overallProgress =
    moduleProgressValues.length > 0
        ? Math.round(
              moduleProgressValues.reduce(
                  (sum, progress) => sum + progress,
                  0
              ) / moduleProgressValues.length
          )
        : 0;
// -------------------------
// LOAD REAL ASSESSMENT DATA
// -------------------------

const loadedAssessmentRows =
    await loadAssessmentTable(
        studentData.email || user.email,
        studentData.batchId
    );

setAssessmentRows(loadedAssessmentRows);

console.log(
    "LEARNING HUB ASSESSMENT DATA:",
    loadedAssessmentRows
);
// ----------------------------------------------------
// SELECT THE MOST RELEVANT ASSIGNMENT / PROJECT CARD
// ----------------------------------------------------

const dashboardAssessmentCandidates =
    assignmentDefinitions
        .map((definition) => {

            const type = getAssessmentType(definition);

            // Capstone is NOT part of the module dashboard card
            if (type === "capstone") {
                return null;
            }

            const row = assessmentRows.find(
                (item) =>
                    item.moduleId === definition.moduleId
            );

            if (!row) {
                return null;
            }

            const completed =
                type === "project"
                    ? Boolean(row.projectCompleted)
                    : Boolean(row.assignmentCompleted);

            const dueDate =
                toJsDate(
                    definition.dueDate ||
                    definition.endAt ||
                    definition.endDate
                );

            const createdDate =
                toJsDate(
                    definition.createdAt ||
                    definition.startAt ||
                    definition.startDate
                );

            return {
                ...definition,

                dashboardType: type,

                completed,

                dueDate,

                createdDate,

                moduleName:
                    row.module ||
                    definition.moduleName ||
                    definition.module ||
                    definition.moduleId,
            };
        })
        .filter(Boolean);

// Prefer pending work.
// If several are pending, show the one with the nearest due date.
// If everything is completed, show the most recently created item.

const pendingAssessments =
    dashboardAssessmentCandidates.filter(
        (item) => !item.completed
    );

const sortByDueDate = (a, b) => {

    const aTime =
        a.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER;

    const bTime =
        b.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER;

    return aTime - bTime;
};

const sortByCreatedDate = (a, b) => {

    const aTime =
        a.createdDate?.getTime() ??
        0;

    const bTime =
        b.createdDate?.getTime() ??
        0;

    return bTime - aTime;
};

let selectedDashboardAssessment = null;

if (pendingAssessments.length > 0) {

    selectedDashboardAssessment =
        [...pendingAssessments]
            .sort(sortByDueDate)[0];

} else {

    selectedDashboardAssessment =
        [...dashboardAssessmentCandidates]
            .sort(sortByCreatedDate)[0] ||
        null;
}

console.log(
    "LEARNING HUB SELECTED ASSESSMENT CARD:",
    selectedDashboardAssessment
);

setLatestAssignment(
    selectedDashboardAssessment
);

const completedAssignments =
    loadedAssessmentRows.filter(
        (row) =>
            row.assignmentExists &&
            row.assignmentCompleted
    ).length;

const completedProjects =
    loadedAssessmentRows.filter(
        (row) =>
            row.projectExists &&
            row.projectCompleted
    ).length;

const completedMiniTests =
    loadedAssessmentRows.filter(
        (row) =>
            row.mcqExists &&
            row.mcqCompleted
    ).length;

const pendingAssignments =
    loadedAssessmentRows.filter(
        (row) =>
            row.assignmentExists &&
            !row.assignmentCompleted
    ).length;

const pendingProjects =
    loadedAssessmentRows.filter(
        (row) =>
            row.projectExists &&
            !row.projectCompleted
    ).length;

const pendingMiniTests =
    loadedAssessmentRows.filter(
        (row) =>
            row.mcqExists &&
            !row.mcqCompleted
    ).length;

// -------------------------
// CALCULATE REAL ATTENDANCE
// -------------------------

const attendanceSnapshot = await getDocs(
    query(
        collection(db, "attendance"),
        where(
            "studentEmail",
            "==",
            studentData.email || user.email
        )
    )
);

const attendanceRecords = attendanceSnapshot.docs.map(
    (attendanceDoc) => ({
        id: attendanceDoc.id,
        ...attendanceDoc.data(),
    })
);

const completedSessions = (
    await getDocs(
        query(
            collection(db, "liveSessions"),
            where(
                "batchId",
                "==",
                studentData.batchId
            )
        )
    )
).docs
    .map((sessionDoc) => ({
        id: sessionDoc.id,
        ...sessionDoc.data(),
    }))
    .filter(
        (session) =>
            session.status === "ended"
    );

const attendanceStats =
    getStudentAttendanceStats({
        sessions: completedSessions,
        attendanceRecords,
        studentEmail:
            studentData.email || user.email,
    });

const realAttendance =
    Number(attendanceStats.percentage || 0);


// -------------------------
// DASHBOARD STATS
// -------------------------

// -------------------------
// DASHBOARD STATS
// -------------------------

setDashboardStats({
    totalModules: moduleList.length,
    completedModules: completedModuleCount,

    completedAssignments,
    completedProjects,
    completedMiniTests,

    pendingAssignments,
    pendingProjects,
    pendingMiniTests,

    attendance: realAttendance,
    overallProgress,
});
// -------------------------------
// Find student's current module
// -------------------------------

let activeModule = null;

for (const module of moduleList) {

    const key = getAnalyticsModuleKey(module.moduleName);

    const progress = Number(
        analyticsData?.modules?.[key] ?? 0
    );

    if (progress < 100) {

        activeModule = {
            ...module,
            progress,
        };

        break;
    }
}

// All modules completed
if (!activeModule && moduleList.length > 0) {

    const last = moduleList[moduleList.length - 1];

    activeModule = {
        ...last,
        progress: 100,
    };
}

setCurrentModule(activeModule);
// -------------------------
// CALCULATE TODAY'S LEARNING GOAL
// Based on course sequence + faculty progress
// -------------------------

let facultyReachedIndex = -1;

// -----------------------------------------
// FACULTY PROGRESS IS BASED ON THE
// LATEST ACTUAL LIVE / ENDED SESSION
// -----------------------------------------

if (latestFacultySession?.moduleId) {

    const facultyModuleId =
        String(latestFacultySession.moduleId)
            .trim()
            .toUpperCase();

    const reachedIndex = moduleList.findIndex(
        (module) => {

            const moduleId =
                String(module.id || "")
                    .trim()
                    .toUpperCase();

            const moduleName =
                String(module.moduleName || "")
                    .trim()
                    .toUpperCase();

            return (
                moduleId === facultyModuleId ||
                moduleName === facultyModuleId
            );
        }
    );

    if (reachedIndex >= 0) {
        facultyReachedIndex = reachedIndex;
    }

    console.log(
        "LEARNING HUB FACULTY REACHED MODULE:",
        latestFacultySession.moduleId
    );

    console.log(
        "LEARNING HUB FACULTY REACHED INDEX:",
        facultyReachedIndex
    );
}

// -----------------------------------------
// STUDENT'S UNFINISHED MODULES UP TO THE
// MODULE FACULTY HAS ACTUALLY REACHED
// -----------------------------------------

const goalModules = moduleList
    .map((module, index) => {

        const key =
            getAnalyticsModuleKey(
                module.moduleName
            );

        const progress = Number(
            analyticsData?.modules?.[key] ?? 0
        );

        return {
            ...module,
            progress,
            moduleIndex: index,
        };
    })
    .filter(
        (module) =>
            module.moduleIndex <= facultyReachedIndex &&
            module.progress < 100
    );

// -----------------------------------------
// FALLBACK
// -----------------------------------------

const finalLearningGoals =
    goalModules.length > 0
        ? goalModules
        : activeModule
        ? [activeModule]
        : [];

setLearningGoalModules(finalLearningGoals);

// -------------------------
// Find latest completed module
// -------------------------

const completedModules = moduleList.filter(
    module =>
        Number(
            analyticsData?.modules?.[
                getAnalyticsModuleKey(module.moduleName)
            ] ?? 0
        ) >= 100
);

let latestAchievement = null;

if (completedModules.length > 0) {
    latestAchievement =
        completedModules[completedModules.length - 1];
}

setLatestAchievement(latestAchievement);

}   // closes if (studentSnap.exists())

}); // closes onAuthStateChanged callback

return () => unsubscribe();

}, []);


    return (

        <div className="flex min-h-screen bg-gray-100">

    <Sidebar student={student} />

    <div className="flex-1 p-8">

        <CourseHero
    student={student}
    analytics={analytics}
    dashboardStats={dashboardStats}
    latestAssignment={latestAssignment}
    nextLiveClass={nextLiveClass}
    currentModule={currentModule}
    moduleProgress={currentModule?.progress || 0}
    learningGoalModules={learningGoalModules}
    latestAchievement={latestAchievement}
/>
<DashboardStats
    totalCourses={1}
    completedModules={dashboardStats.completedModules}
    completedAssignments={dashboardStats.completedAssignments}
    completedProjects={dashboardStats.completedProjects}
    completedMiniTests={dashboardStats.completedMiniTests}
    attendance={dashboardStats.attendance}
/>

        <div className="grid lg:grid-cols-3 gap-8 mt-10">

            <div className="lg:col-span-2">

                <DashboardChart
    analytics={analytics}
    modules={modules}
/>

            </div>

            <div className="space-y-8">

                <UpcomingClassCard
    analytics={analytics}
    liveClass={nextLiveClass}
/>

                <AssignmentCard
    analytics={analytics}
    assignment={latestAssignment}
    assessmentRow={
        assessmentRows.find(
            (row) =>
                row.moduleId === latestAssignment?.moduleId
        )
    }
/>

                <AchievementCard
    analytics={analytics}
    latestAchievement={latestAchievement}
/>

            </div>

        </div>

    </div>

</div>

    );

}