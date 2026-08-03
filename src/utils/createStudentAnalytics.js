import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

    export async function createStudentAnalytics(student) {

  try {

    const analyticsRef = doc(
      db,
      "studentAnalytics",
      student.email
    );

    const analyticsSnap = await getDoc(analyticsRef);

    // Do not overwrite existing analytics
    if (analyticsSnap.exists()) {
      console.log(
        `Analytics already exists for ${student.email}`
      );
      return;
    }

    await setDoc(analyticsRef, {

      email: student.email,
      name: student.name,

      courseName: student.course || "",

      batchId: student.batchId || "",
      batchName: student.batchName || "",

      startDate: student.startDate || "",
      endDate: student.endDate || "",

      attendance: 0,

      assignmentAverage: 0,
      miniTestAverage: 0,
      projectAverage: 0,
      capstoneAverage: 0,
      capstoneScore: 0,

      averageScore: 0,
      overallProgress: 0,

      totalModules: 17,
      modulesCompleted: 0,

      certificateIssued: false,
      certificateUrl: "",

      modules: {

        python: 0,
        numpy: 0,
        pandas: 0,
        datavisualization: 0,
        eda: 0,
        sql: 0,
        excel: 0,
        tableau: 0,
        powerbi: 0,
        statistics: 0,
        machinelearning: 0,
        deeplearning: 0,
        generativeai: 0,
        agenticai: 0,
        mlops: 0,
        interview: 0,
        rlanguage: 0,

      },

      materialProgress: {}

    });

    console.log(
      `Analytics created successfully for ${student.email}`
    );

  } catch (error) {

    console.error(
      "Error creating student analytics:",
      error
    );

    throw error;

  }

}