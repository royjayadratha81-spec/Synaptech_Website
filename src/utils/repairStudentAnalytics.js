import {
    doc,
    updateDoc
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
export async function repairStudentAnalytics(student) {

    try {

        const analyticsRef = doc(
            db,
            "studentAnalytics",
            student.email
        );

        await updateDoc(analyticsRef, {

            totalModules: 17,

            modulesCompleted: 0,

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
                rlanguage: 0

            },

            materialProgress: {}

        });

        console.log(
            `Analytics repaired successfully for ${student.email}`
        );

    } catch (error) {

        console.error(
            "Error repairing student analytics:",
            error
        );

        throw error;

    }

}