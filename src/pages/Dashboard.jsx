import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
    doc,
    getDoc,
    collection,
    getDocs,
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import WelcomeCard from "../components/WelcomeCard";
import StatsCard from "../components/StatsCard";

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState({

    course: "Loading...",

    attendance: 0,

    assignments: 0,

    averageScore: 0

});
useEffect(() => {

    const fetchDashboard = async () => {

        if (!auth.currentUser) return;

        const docRef = doc(db, "students", auth.currentUser.uid);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {

            const student = docSnap.data();

            setDashboardData((prev) => ({

                ...prev,

                course: student.course

            }));
            const submissionSnapshot = await getDocs(
    collection(db, "submissions")
);

let assignmentCount = 0;
let totalMarks = 0;
let evaluatedAssignments = 0;

submissionSnapshot.forEach((docItem) => {

    const submission = docItem.data();

    console.log("Document ID:", docItem.id);
    console.log(submission);

    if (submission.studentEmail === auth.currentUser.email) {

        assignmentCount++;

if (
    submission.evaluated === true &&
    submission.marks
) {

    totalMarks += Number(submission.marks);

    evaluatedAssignments++;

}

    }

});
console.log("Final Assignment Count:", assignmentCount);

setDashboardData((prev) => ({

    ...prev,

    assignments: assignmentCount,

}));
const averageScore =
    evaluatedAssignments === 0
        ? 0
        : ((totalMarks / evaluatedAssignments) * 10);

setDashboardData((prev) => ({

    ...prev,

    averageScore: averageScore.toFixed(1),

}));

        }
        const attendanceSnapshot = await getDocs(
    collection(db, "attendance")
);

let total = 0;
let present = 0;

attendanceSnapshot.forEach((docItem) => {

    const attendance = docItem.data();

    if (
        attendance.studentEmail === auth.currentUser.email
    ) {

        total++;

        if (attendance.status === "Present") {

            present++;

        }

    }

});

const attendancePercentage =
    total === 0
        ? 0
        : Math.round((present / total) * 100);

setDashboardData((prev) => ({

    ...prev,

    attendance: attendancePercentage,

}));

    };

    fetchDashboard();

}, []);

  return (

    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="flex">

        <Sidebar />

        <main className="flex-1 p-8">

          <WelcomeCard />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">

    <StatsCard

    title="My Course"

    value={dashboardData.course}

    color="text-blue-600"

    icon="📚"

    borderColor="border-blue-600"

    badge="🟢 Active"

/>
<StatsCard

    title="Attendance"

    value={`${dashboardData.attendance}%`}

    color="text-green-600"

    icon="📅"

    borderColor="border-green-600"

    badge="Updated Today"

/>
<StatsCard

    title="Assignments"

    value={dashboardData.assignments}

    color="text-orange-600"

    icon="📝"

    borderColor="border-orange-500"

    badge={`${dashboardData.assignments} Submitted`}

/>
<StatsCard

    title="Average Score"

    value={`${dashboardData.averageScore}%`}

    color="text-purple-600"

    icon="🏆"

    borderColor="border-purple-600"

    badge="Excellent"

/>

</div>



</main>

      </div>

    </div>

  );

}