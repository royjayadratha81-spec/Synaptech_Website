import React, { useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

import { createStudentAnalytics } from "../utils/createStudentAnalytics";
import { repairStudentAnalytics } from "../utils/repairStudentAnalytics";

const InitializeAnalytics = () => {
    const [loading, setLoading] = useState(false);

const [created, setCreated] = useState(0);

const [repaired, setRepaired] = useState(0);

const [skipped, setSkipped] = useState(0);
const handleInitialize = async () => {

    const confirmed = window.confirm(
        "This will initialize missing analytics and repair incomplete analytics for all eligible students.\n\nDo you want to continue?"
    );

    if (!confirmed) {
        return;
    }


    setLoading(true);

    setCreated(0);
    setRepaired(0);
    setSkipped(0);

    try {

        const studentsSnapshot = await getDocs(
            collection(db, "students")
        );

        console.log(
            "Total Students:",
            studentsSnapshot.size
        );

        for (const studentDoc of studentsSnapshot.docs) {

    const student = studentDoc.data();

    // Ignore students who are not approved
    if (!student.approved) {

        console.log(
            `${student.name} → Skipped (Not Approved)`
        );

        continue;
    }

    // Ignore students who have no batch
    if (!student.batchId) {

        console.log(
            `${student.name} → Skipped (No Batch Assigned)`
        );

        continue;
    }

    const analyticsRef = doc(
        db,
        "studentAnalytics",
        student.email
    );

    const analyticsSnap = await getDoc(
        analyticsRef
    );

    if (!analyticsSnap.exists()) {

    console.log(
        `${student.name} → Creating Analytics`
    );

    await createStudentAnalytics(student);

    setCreated(prev => prev + 1);

    continue;

}

    const analytics = analyticsSnap.data();

    if (
    !analytics.modules ||
    Object.keys(analytics.modules).length === 0
) {

    console.log(
        `${student.name} → Repairing Analytics`
    );

    await repairStudentAnalytics(student);

    setRepaired(prev => prev + 1);

} else {

    console.log(
        `${student.name} → Analytics OK`
    );

    setSkipped(prev => prev + 1);


    }

}

    } catch (error) {

        console.error(
            "Initialization Error:",
            error
        );

    }
alert(
    `Analytics Initialization Completed.\n\nCreated : ${created}\nRepaired : ${repaired}\nSkipped : ${skipped}`
);
    setLoading(false);

};
  return (
    <div className="min-h-screen p-8 bg-gray-100">

      <h1 className="text-4xl font-bold mb-6">
        Initialize Student Analytics
      </h1>

      <p className="mb-6 text-gray-600">
        This utility will create missing analytics and repair
        incomplete analytics for existing students.
      </p>

      <button
    onClick={handleInitialize}
    disabled={loading}
    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
>
    {loading ? "Initializing..." : "Initialize Analytics"}
</button>
<div className="mt-8 space-y-2">

    <p>
        Created : {created}
    </p>

    <p>
        Repaired : {repaired}
    </p>

    <p>
        Skipped : {skipped}
    </p>

</div>

    </div>
  );
};

export default InitializeAnalytics;