import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export async function updateStudentAnalytics(studentEmail) {

  try {

    // Get all evaluated submissions of this student

    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentEmail", "==", studentEmail),
      where("evaluated", "==", true)
    );
    console.log("Updating analytics for:", studentEmail);

    const snapshot = await getDocs(submissionsQuery);

    let assignmentMarks = 0;
let assignmentCount = 0;

let projectMarks = 0;
let projectCount = 0;

let capstoneMarks = 0;
let capstoneCount = 0;

snapshot.forEach((document) => {

  const data = document.data();

  const marks = Number(data.marks || 0);

  switch (data.assignmentType) {

    case "Assignment":

      assignmentMarks += marks;
      assignmentCount++;
      break;

    case "Project":

      projectMarks += marks;
      projectCount++;
      break;

    case "Capstone":

      capstoneMarks += marks;
      capstoneCount++;
      break;

    default:

      break;

  }

});

const assignmentAverage =
  assignmentCount === 0
    ? 0
    : Number(
        (
          assignmentMarks /
          assignmentCount
        ).toFixed(2)
      );

const projectAverage =
  projectCount === 0
    ? 0
    : Number(
        (
          projectMarks /
          projectCount
        ).toFixed(2)
      );

const capstoneAverage =
  capstoneCount === 0
    ? 0
    : Number(
        (
          capstoneMarks /
          capstoneCount
        ).toFixed(2)
      );

    // Update studentAnalytics

    await updateDoc(
  doc(db, "studentAnalytics", studentEmail),
  {

    assignmentAverage,

    projectAverage,

    capstoneAverage,

  }
);

    console.log(
      "Assignment Average Updated:",
      assignmentAverage
    );

  } catch (error) {

    console.error(
      "Analytics Update Failed",
      error
    );

  }

}