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

export default function LearningHub() {

    const [analytics, setAnalytics] = useState(null);
const [student, setStudent] = useState(null);
const [latestAssignment, setLatestAssignment] = useState(null);
const [nextLiveClass, setNextLiveClass] = useState(null);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (user) => {

            if (!user) return;

            const ref = doc(db, "studentAnalytics", user.email);

            const snap = await getDoc(ref);

            if (snap.exists()) {

                setAnalytics(snap.data());

            }
            // Load student profile

const studentRef = doc(db, "students", user.uid);

const studentSnap = await getDoc(studentRef);


if (studentSnap.exists()) {

    const studentData = studentSnap.data();

    setStudent(studentData);


    // Student not yet assigned to a batch
if (!studentData.batchId) {


    return;
}

    // -------------------------
    // Load latest assignment
    // -------------------------

    const assignmentQuery = query(
        collection(db, "assignments"),
        where("batchId", "==", studentData.batchId),
        orderBy("createdAt", "desc"),
        limit(1)
    );

    const assignmentSnapshot = await getDocs(assignmentQuery);

    if (!assignmentSnapshot.empty) {

        setLatestAssignment({
            id: assignmentSnapshot.docs[0].id,
            ...assignmentSnapshot.docs[0].data(),
        });

    }
const liveQuery = query(
    collection(db, "liveSessions"),
    where("batchId", "==", studentData.batchId),
    orderBy("date", "asc"),
    limit(1)
);

const liveSnapshot = await getDocs(liveQuery);

liveSnapshot.forEach((doc) => {
});


if (!liveSnapshot.empty) {

    const liveData = {
        id: liveSnapshot.docs[0].id,
        ...liveSnapshot.docs[0].data(),
    };

   
    setNextLiveClass(liveData);

}
}

        });

        return () => unsubscribe();

    }, []);

    return (

        <div className="flex min-h-screen bg-gray-100">

    <Sidebar student={student} />

    <div className="flex-1 p-8">

        <CourseHero
    student={student}
    analytics={analytics}
/>

        <div className="grid lg:grid-cols-3 gap-8 mt-10">

            <div className="lg:col-span-2">

                <DashboardChart analytics={analytics} />

            </div>

            <div className="space-y-8">

                <UpcomingClassCard
    analytics={analytics}
    liveClass={nextLiveClass}
/>

                <AssignmentCard

    analytics={analytics}

    assignment={latestAssignment}

/>

                <AchievementCard analytics={analytics} />

            </div>

        </div>

    </div>

</div>

    );

}