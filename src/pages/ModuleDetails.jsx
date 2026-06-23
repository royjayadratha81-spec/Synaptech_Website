import { supabase }
from "../supabase/supabase";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
  const [totalQuestions, setTotalQuestions] =
  useState(0);
  const auth = getAuth();
  const studentData = JSON.parse(
  localStorage.getItem("studentData")
);

const currentEmail =
  studentData?.email;
  const handleTestSubmit = async () => {

const snapshot =
  await getDocs(
    collection(db, "mcqResults")
  );

let attempts = 0;

snapshot.forEach((docItem) => {

  const data = docItem.data();

  if (
    data.studentEmail === currentEmail &&
    data.moduleId === moduleId
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
        currentEmail,

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
  const [submissionFile, setSubmissionFile] =
  useState(null);
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
  

const fetchModule = async () => {

  const docRef = doc(
    db,
    "modules",
    moduleId
  );

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {

    setModuleName(
      docSnap.data().moduleName
    );

  }

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
const fetchAssignments = async () => {

  const snapshot = await getDocs(
    collection(db, "assignments")
  );

  const assignmentList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (data.moduleId === moduleId) {

      assignmentList.push({
        id: docItem.id,
        ...data,
      });

    }
    

  });

  setAssignments(assignmentList);

};
const fetchSubmissions = async () => {

  const snapshot = await getDocs(
    collection(db, "submissions")
  );

  const submissionList = [];

  snapshot.forEach((docItem) => {

    submissionList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  setSubmissions(submissionList);

};
const fetchMcqTests = async () => {

  const snapshot = await getDocs(
    collection(db, "mcqTests")
  );

  const testList = [];

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (
      data.moduleId === moduleId &&
      data.active
    ) {

      testList.push({
        id: docItem.id,
        ...data,
      });

    }
    

  });

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

}

};
const fetchMcqHistory = async () => {


  const snapshot = await getDocs(
    collection(db, "mcqResults")
  );

  const history = [];

  let best = 0;

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (
      data.studentEmail === currentEmail &&
      data.moduleId === moduleId
    ) {

      history.push(data);

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
const fetchTestAttempts = async () => {


  const snapshot = await getDocs(
    collection(db, "mcqResults")
  );

  let attempts = 0;
  let highestScore = 0;

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    if (
      data.studentEmail === currentEmail &&
      data.moduleId === moduleId
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
        currentEmail
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
const handleAssignmentSubmit =
  async (assignmentId) => {
    console.log("SUBMIT BUTTON CLICKED");

  try {

    if (!submissionFile) {

      alert(
        "Please select a file first"
      );

      return;

    }

    const fileName =
      `${Date.now()}-${submissionFile.name}`;

    const { error } =
      await supabase.storage
        .from(
          "assignment-submissions"
        )
        .upload(
          fileName,
          submissionFile
        );

    if (error) {

      alert(error.message);
      return;

    }

    const {
      data: publicUrlData
    } = supabase.storage
      .from(
        "assignment-submissions"
      )
      .getPublicUrl(fileName);

    await addDoc(
      collection(
        db,
        "submissions"
      ),
      {
        assignmentId,
        fileUrl:
          publicUrlData.publicUrl,
        submittedAt:
          new Date(),
        status:
          "Submitted",
      }
    );

    alert(
      "Assignment Submitted Successfully"
    );

    setSubmissionFile(null);

  } catch (error) {

    console.error(error);

    alert(
      "Error Submitting Assignment"
    );

  }

};
useEffect(() => {

  fetchModule();
  fetchMaterials();
  fetchLiveSessions();
  fetchRecordedSessions();
  fetchAssignments();
  fetchSubmissions();
  fetchMcqTests();
  fetchTestAttempts();
  fetchMcqHistory();

}, []);

  return (

  <div className="min-h-screen bg-gray-100 p-10">

    <h1 className="text-4xl font-bold text-blue-900 mb-10">
      {moduleName}
    </h1>

    {/* Reading Materials */}

<div className="bg-white p-6 rounded-2xl shadow-lg mb-8">

  <h2 className="text-2xl font-bold text-blue-700 mb-4">
    📖 Reading Materials
  </h2>

  {readingMaterials.length === 0 ? (

    <p className="text-gray-500">
      No reading materials available.
    </p>

  ) : (

    readingMaterials.map((material) => (

      <div
        key={material.id}
        className="border-b py-3"
      >

        <p className="font-semibold">
          {material.title}
        </p>

        <a
          href={material.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Open Material
        </a>

      </div>

    ))

  )}

</div>

{/* Practice Materials */}

<div className="bg-white p-6 rounded-2xl shadow-lg mb-8">

  <h2 className="text-2xl font-bold text-green-700 mb-4">
    💻 Practice Materials
  </h2>

  {practiceMaterials.length === 0 ? (

    <p className="text-gray-500">
      No practice materials available.
    </p>

  ) : (

    practiceMaterials.map((material) => (

      <div
        key={material.id}
        className="border-b py-3"
      >

        <p className="font-semibold">
          {material.title}
        </p>

        <a
          href={material.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:underline"
        >
          Open Material
        </a>

      </div>

    ))

  )}

</div>

{/* Interview Questions */}

<div className="bg-white p-6 rounded-2xl shadow-lg mb-8">

  <h2 className="text-2xl font-bold text-purple-700 mb-4">
    🎯 Interview Questions & Answers
  </h2>

  {interviewMaterials.length === 0 ? (

    <p className="text-gray-500">
      No interview materials available.
    </p>

  ) : (

    interviewMaterials.map((material) => (

      <div
        key={material.id}
        className="border-b py-3"
      >

        <p className="font-semibold">
          {material.title}
        </p>

        <a
          href={material.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline"
        >
          Open Material
        </a>

      </div>

    ))

  )}

</div>

    {/* Live Sessions */}

<div className="bg-white p-6 rounded-2xl shadow-lg mb-8">

  <h2 className="text-2xl font-bold text-green-700 mb-4">
    🎥 Live Sessions
  </h2>

  {liveSessions.length === 0 ? (

    <p className="text-gray-500">
      No live sessions available.
    </p>

  ) : (

    liveSessions.map((session) => (

      <div
        key={session.id}
        className="border-b py-3"
      >

        <p className="font-semibold text-lg">
          {session.title}
        </p>

        <p>
          Date: {session.date}
        </p>

        <p>
          Time: {session.time}
        </p>

        <a
          href={session.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          Join Live Session
        </a>

      </div>

    ))

  )}

</div>

    {/* Recorded Sessions */}

<div className="bg-white p-6 rounded-2xl shadow-lg mb-8">

  <h2 className="text-2xl font-bold text-purple-700 mb-4">
    📹 Recorded Sessions
  </h2>

  {recordedSessions.length === 0 ? (

    <p className="text-gray-500">
      No recordings available.
    </p>

  ) : (

    recordedSessions.map((video) => (

      <div
        key={video.id}
        className="border-b py-3"
      >

        <p className="font-semibold text-lg">
          {video.title}
        </p>

        <p>
          Platform: {video.platform}
        </p>

        <p>
          Duration: {video.duration}
        </p>

        <a
          href={video.videoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          Watch Recording
        </a>

      </div>

    ))

  )}

</div>

    {/* Assignments */}

<div className="bg-white p-6 rounded-2xl shadow-lg">

  <h2 className="text-2xl font-bold text-orange-700 mb-4">
    📝 Assignments
  </h2>

  {assignments.length === 0 ? (

    <p className="text-gray-500">
      No assignments available.
    </p>

  ) : (

    assignments.map((assignment) => {

  const evaluation =
    submissions.find(
      (sub) =>
        sub.assignmentId === assignment.id
    );

  return (

      <div
        key={assignment.id}
        className="border-b py-3"
      >

        <p className="font-semibold text-lg">
          {assignment.title}
        </p>

        <p>
          Due Date: {assignment.dueDate}
        </p>

        <p className="mb-2">
          {assignment.description}
        </p>

        {assignment.assignmentFileUrl && (

          <a
            href={assignment.assignmentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg mr-3"
          >
            Download Assignment
          </a>

        )}
        <div className="mt-4">

  <input
    type="file"
    onChange={(e) =>
      setSubmissionFile(
        e.target.files[0]
      )
    }
    className="mb-3"
  />

  <button
    onClick={() =>
      handleAssignmentSubmit(
        assignment.id
      )
    }
    className="
      bg-blue-600
      hover:bg-blue-700
      text-white
      px-4
      py-2
      rounded-lg
    "
  >
    Submit Assignment
  </button>
  {evaluation?.evaluated && (

  <div className="mt-4 p-4 bg-green-50 rounded-lg">

    <p className="font-semibold text-green-700">
      Status: Evaluated
    </p>

    <p className="mt-2">
      <strong>Marks:</strong>{" "}
      {evaluation.marks}
    </p>

    <p className="mt-2">
      <strong>Remarks:</strong>{" "}
      {evaluation.remarks}
    </p>

  </div>

)}

</div>

      </div>

    );

})

  )}

</div>

{/* MCQ Tests */}

<div className="bg-white p-6 rounded-2xl shadow-lg mt-6">

  <h2 className="text-2xl font-bold text-blue-700 mb-4">
    🧠 Mini Tests
  </h2>
  <div className="mb-4 p-4 bg-gray-100 rounded-lg">

  <p>
    <strong>Attempts Used:</strong>
    {" "}
    {attemptCount}/3
  </p>

  <p>
  <strong>Best Score:</strong>
  {" "}
  {bestScore}/{totalQuestions}
</p>

</div>
{testHistory.length > 0 && (

  <div className="mb-4 p-4 bg-blue-50 rounded-lg">

    <h3 className="font-semibold mb-2">
      Previous Attempts
    </h3>

    {testHistory.map((attempt) => (

      <p key={attempt.attemptNumber}>

        Attempt {attempt.attemptNumber}
        {" : "}
        {attempt.score}
        /
        {attempt.totalQuestions}

      </p>

    ))}

  </div>

)}

  {mcqTests.length === 0 ? (

    <p>No tests available.</p>

  ) : (

    mcqTests.map((test) => (

      <div
        key={test.id}
        className="border-b py-4"
      >

        <h3 className="font-semibold text-lg">
          {test.title}
        </h3>

        {attemptCount >= 3 ? (

  <button
    disabled
    className="
      mt-3
      bg-red-500
      text-white
      px-4
      py-2
      rounded-lg
      cursor-not-allowed
    "
  >
    Test Locked
  </button>

) : (

  <button
    onClick={() =>
      fetchQuestions(test.id)
    }
    className="
      mt-3
      bg-blue-600
      hover:bg-blue-700
      text-white
      px-4
      py-2
      rounded-lg
    "
  >
    Start Test
  </button>

)}
{attemptCount >= 3 && (

  <p className="text-red-600 font-semibold mt-2">
    Maximum attempts reached.
    Test is locked.
  </p>

)}

      </div>

    ))

  )}
  {showTest && (

  <div className="mt-6">

    {testQuestions.map((question, index) => (

      <div
        key={question.id}
        className="border rounded-lg p-4 mb-4"
      >

        <h3 className="font-semibold mb-3">
          Q{index + 1}. {question.question}
        </h3>

        <div className="space-y-2">

          <label className="block">
            <input
              type="radio"
              name={question.id}
              value={question.option1}
              onChange={(e) => {

  const newAnswers = {
    ...answers,
    [question.id]:
      e.target.value,
  };

  console.log(
    "ANSWER SELECTED:",
    newAnswers
  );

  setAnswers(newAnswers);

}}
            />
            {" "}
            {question.option1}
          </label>

          <label className="block">
            <input
  type="radio"
  name={question.id}
  value={question.option2}
  onChange={(e) => {

  const newAnswers = {
    ...answers,
    [question.id]:
      e.target.value,
  };

  console.log(
    "ANSWER SELECTED:",
    newAnswers
  );

  setAnswers(newAnswers);

}}
/>
            {" "}
            {question.option2}
          </label>

          <label className="block">
            <input
  type="radio"
  name={question.id}
  value={question.option3}
  onChange={(e) => {

  const newAnswers = {
    ...answers,
    [question.id]:
      e.target.value,
  };

  console.log(
    "ANSWER SELECTED:",
    newAnswers
  );

  setAnswers(newAnswers);

}}
/>
            {" "}
            {question.option3}
          </label>

          <label className="block">
            <input
  type="radio"
  name={question.id}
  value={question.option4}
  onChange={(e) => {

  const newAnswers = {
    ...answers,
    [question.id]:
      e.target.value,
  };

  console.log(
    "ANSWER SELECTED:",
    newAnswers
  );

  setAnswers(newAnswers);

}}
/>
            {" "}
            {question.option4}
          </label>

        </div>

      </div>

    ))}
    <button
  onClick={handleTestSubmit}
  className="
    mt-4
    bg-green-600
    hover:bg-green-700
    text-white
    px-6
    py-3
    rounded-lg
  "
>
  Submit Test
</button>

{testScore !== null && (

  <div className="mt-4 p-4 bg-green-50 rounded-lg">

    <p className="font-semibold text-green-700">
      Score: {testScore} / {testQuestions.length}
    </p>

  </div>

)}

  </div>

)}

</div>

</div>

);

}