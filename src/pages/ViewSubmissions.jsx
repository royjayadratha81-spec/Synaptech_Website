import { updateStudentAnalytics } from "../utils/updateStudentAnalytics";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewSubmissions() {
  const [submissions, setSubmissions] = useState([]);
const [assessments, setAssessments] = useState([]);
const [evaluations, setEvaluations] = useState({});
  const [savingEvaluations, setSavingEvaluations] = useState({});
const [activeSection, setActiveSection] =
  useState("assignments");
const [expandedBatches, setExpandedBatches] =
  useState({});
const [expandedAssessments, setExpandedAssessments] =
  useState({});
  const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
  try {
    setLoading(true);

    const [
      submissionsSnapshot,
      assessmentsSnapshot,
      studentsSnapshot
    ] = await Promise.all([
      getDocs(
        collection(db, "submissions")
      ),

      getDocs(
        collection(db, "assignments")
      ),

      getDocs(
        collection(db, "students")
      )
    ]);

    const submissionData =
      submissionsSnapshot.docs.map(
        (docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })
      );

    const assessmentData =
      assessmentsSnapshot.docs.map(
        (docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })
      );

    const studentData =
      studentsSnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter(
          (student) =>
            student.approved === true &&
            student.batchId
        );

    setSubmissions(submissionData);
    setAssessments(assessmentData);
    setStudents(studentData);

  } catch (error) {
    console.error(
      "Error loading assessment submissions:",
      error
    );
  } finally {
    setLoading(false);
  }
};
const normalizeType = (type) =>
  String(type || "")
    .trim()
    .toLowerCase();

const getAssessmentType = (assessment) => {
  const type =
    normalizeType(
      assessment?.type ||
      assessment?.assignmentType
    );

  if (type === "project") {
    return "projects";
  }

  if (
    type === "capstone" ||
    type === "capstone project"
  ) {
    return "capstone";
  }

  return "assignments";
};
const getMaximumMarks = (assessment) => {
  if (!assessment) return null;

  const storedMaximumMarks =
    assessment.maximumMarks ??
    assessment.maxMarks ??
    assessment.totalMarks;

  if (storedMaximumMarks !== undefined && storedMaximumMarks !== null) {
    return Number(storedMaximumMarks);
  }

  const type = normalizeType(
    assessment.type || assessment.assignmentType
  );

  if (
    type === "capstone" ||
    type === "capstone project" ||
    type === "capstoneproject"
  ) {
    return 50;
  }

  return 20;
};

const formatDate = (value) => {
  if (!value) return "—";

  if (
    typeof value?.toDate === "function"
  ) {
    return value
      .toDate()
      .toLocaleString();
  }

  if (value?.seconds) {
    return new Date(
      value.seconds * 1000
    ).toLocaleString();
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
};

const getAssessmentDefinition = (
  submission
) => {
  return assessments.find(
    (assessment) =>
      assessment.id ===
      submission.assignmentId
  );
};

const getEvaluationStatus = (
  submission
) => {
  if (!submission) {
    return "Not Submitted";
  }

  if (submission.evaluated === true) {
    return "Evaluated";
  }

  return "Evaluation Awaited";
};
const getStudentsForBatch = (batchId) => {
  return students.filter(
    (student) =>
      student.batchId === batchId
  );
};

const getSubmissionForStudent = (
  assessmentId,
  studentEmail
) => {
  const matches = submissions
    .filter(
      (submission) =>
        submission.assignmentId ===
          assessmentId &&
        String(
          submission.studentEmail || ""
        )
          .trim()
          .toLowerCase() ===
          String(
            studentEmail || ""
          )
            .trim()
            .toLowerCase()
    )
    .sort((a, b) => {
      const getTime = (value) => {
        if (!value) return 0;

        if (
          typeof value?.toMillis ===
          "function"
        ) {
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
    });

  return matches[0] || null;
};

const getBatchName = (batchId) => {
  const student =
    students.find(
      (item) =>
        item.batchId === batchId
    );

  return (
    student?.batchName ||
    batchId ||
    "Unknown Batch"
  );
};
const getGroupedAssessments = () => {
  const grouped = {
    assignments: {},
    projects: {},
    capstone: {},
  };

  assessments.forEach((assessment) => {
    const section =
      getAssessmentType(
        assessment
      );

    const batchId =
      assessment.batchId;

    if (!batchId) return;

    if (!grouped[section][batchId]) {
      grouped[section][batchId] = [];
    }

    grouped[section][batchId].push(
      assessment
    );
  });

  return grouped;
};
const getAssessmentStats = (
  assessment
) => {
  const batchStudents =
    getStudentsForBatch(
      assessment.batchId
    );

  let submitted = 0;
  let evaluated = 0;
  let awaitingEvaluation = 0;

  batchStudents.forEach(
    (student) => {
      const submission =
        getSubmissionForStudent(
          assessment.id,
          student.email
        );

      if (submission) {
        submitted++;

        if (
          submission.evaluated === true
        ) {
          evaluated++;
        } else {
          awaitingEvaluation++;
        }
      }
    }
  );

  return {
    total: batchStudents.length,
    submitted,
    notSubmitted:
      batchStudents.length -
      submitted,
    evaluated,
    awaitingEvaluation,
  };
};

  const saveEvaluation = async (id) => {

  try {

    await updateDoc(
      doc(db, "submissions", id),
      {
        marks: Number(evaluations[id]?.marks || 0),
        remarks: evaluations[id]?.remarks || "",
        evaluated: true,
        evaluatedBy: "Faculty/Admin",
        evaluationDate: serverTimestamp(),
      }
    );

    // Find this submission
    const submission =
      submissions.find(
        (item) => item.id === id
      );

    // Update analytics automatically
    await updateStudentAnalytics(
      submission.studentEmail
    );

    alert("Evaluation Saved");

    fetchSubmissions();

  } catch (error) {

    console.error(error);

    alert("Failed to Save Evaluation");

  }

};
  return (
  <div className="min-h-screen bg-slate-50">

    {/* =====================================================
        PREMIUM HEADER
    ====================================================== */}

    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">

      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-10">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>
            <div className="flex items-center gap-3 mb-3">

              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="text-xl">📊</span>
              </div>

              <span className="text-blue-200 text-sm font-bold uppercase tracking-widest">
                Academic Operations
              </span>

            </div>

            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
              Assessment Submissions
            </h1>

            <p className="mt-2 text-slate-300 max-w-2xl">
              Manage submissions, evaluations, scores and faculty remarks
              across all batches and assessments.
            </p>
          </div>

          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className={`
              inline-flex items-center justify-center gap-2
              px-5 py-3
              rounded-xl
              bg-white/10
              hover:bg-white/20
              border border-white/20
              text-white
              font-bold
              backdrop-blur-sm
              transition
              disabled:opacity-50
            `}
          >
            {loading ? "Refreshing..." : "↻ Refresh Data"}
          </button>

        </div>

      </div>
    </div>


    {/* =====================================================
        MAIN CONTENT
    ====================================================== */}

    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

      {/* -----------------------------------------------------
          SECTION TABS
      ------------------------------------------------------ */}

      <div className={`
        bg-white
        rounded-2xl
        border border-slate-200
        shadow-sm
        p-2
        flex flex-col sm:flex-row
        gap-2
        mb-8
      `}> 

        {[
          {
            key: "assignments",
            label: "Assignments",
            icon: "📝",
          },
          {
            key: "projects",
            label: "Projects",
            icon: "🚀",
          },
          {
            key: "capstone",
            label: "Capstone Projects",
            icon: "🏆",
          },
        ].map((section) => {

          const active =
            activeSection === section.key;

          return (
            <button
              key={section.key}
              onClick={() =>
                setActiveSection(
                  section.key
                )
              }
              className={`
                flex-1
                px-5 py-3
                rounded-xl
                font-bold
                text-sm
                transition-all
                flex items-center
                justify-center
                gap-2
                ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-slate-600 hover:bg-slate-50"
                }
              `}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          );

        })}

      </div>


      {/* -----------------------------------------------------
          LOADING STATE
      ------------------------------------------------------ */}

      {loading ? (

        <div className={`
          bg-white
          border border-slate-200
          rounded-3xl
          shadow-sm
          p-12
          text-center
        `}> 

          <div className={`
            w-12 h-12
            mx-auto mb-4
            rounded-full
            border-4
            border-blue-100
            border-t-blue-600
            animate-spin
          `}/>

          <p className="font-bold text-slate-700">
            Loading assessment data...
          </p>

          <p className="text-sm text-slate-400 mt-1">
            Fetching batches, assessments and submissions
          </p>

        </div>

      ) : (

        <div className="space-y-6">

          {Object.entries(
            getGroupedAssessments()[
              activeSection
            ] || {}
          ).length === 0 ? (

            <div className={`
              bg-white
              border border-slate-200
              rounded-3xl
              shadow-sm
              p-12
              text-center
            `}> 

              <div className="text-5xl mb-4">
                📂
              </div>

              <h3 className={`
                text-xl
                font-black
                text-slate-800
              `}> 
                No assessments found
              </h3>

              <p className={`
                text-sm
                text-slate-500
                mt-2
              `}> 
                There are currently no assessments
                in this category.
              </p>

            </div>

          ) : (

            Object.entries(
              getGroupedAssessments()[
                activeSection
              ] || {}
            ).map(
              ([batchId, batchAssessments]) => {

                const batchExpanded =
                  expandedBatches[
                    `${activeSection}-${batchId}`
                  ] === true;

                const batchStudents =
                  getStudentsForBatch(
                    batchId
                  );

                const totalSubmitted =
                  batchAssessments.reduce(
                    (total, assessment) =>
                      total +
                      getAssessmentStats(
                        assessment
                      ).submitted,
                    0
                  );

                const totalEvaluated =
                  batchAssessments.reduce(
                    (total, assessment) =>
                      total +
                      getAssessmentStats(
                        assessment
                      ).evaluated,
                    0
                  );

                return (

                  <div
                    key={batchId}
                    className={`
                      bg-white
                      rounded-3xl
                      border border-slate-200
                      shadow-sm
                      overflow-hidden
                    `}
                  >

                    {/* ================================
                        BATCH HEADER
                    ================================= */}

                    <button
                      onClick={() =>
                        setExpandedBatches(
                          (previous) => ({
                            ...previous,
                            [`${activeSection}-${batchId}`]:
                              !batchExpanded,
                        }))
                      }
                      className={`
                        w-full
                        px-6 py-5
                        text-left
                        hover:bg-slate-50
                        transition
                      `}
                    >

                      <div className={`
                        flex
                        flex-col
                        xl:flex-row
                        xl:items-center
                        xl:justify-between
                        gap-5
                      `}> 

                        <div className="flex items-start gap-4">

                          <div className={`
                            w-12 h-12
                            rounded-2xl
                            bg-blue-50
                            text-blue-600
                            flex items-center justify-center
                            text-xl
                          `}> 
                            🎓
                          </div>

                          <div>

                            <div className={`
                              flex items-center
                              gap-3
                              flex-wrap
                            `}> 

                              <h2 className={`
                                text-lg
                                font-black
                                text-slate-800
                              `}> 
                                {getBatchName(
                                  batchId
                                )}
                              </h2>

                              <span className={`
                                px-2.5 py-1
                                rounded-full
                                bg-slate-100
                                text-slate-600
                                text-xs
                                font-bold
                              `}> 
                                {batchStudents.length} Students
                              </span>

                            </div>

                            <p className={`
                              text-sm
                              text-slate-500
                              mt-1
                            `}> 
                              {batchAssessments.length}{" "}
                              {activeSection === "capstone"
                                ? "capstone project"
                                : activeSection === "projects"
                                ? "projects"
                                : "assignments"}
                            </p>

                          </div>

                        </div>


                        <div className={`
                          flex
                          flex-wrap
                          items-center
                          gap-3
                        `}> 

                          <span className={`
                            px-3 py-1.5
                            rounded-full
                            bg-blue-50
                            text-blue-700
                            text-xs
                            font-bold
                          `}> 
                            {totalSubmitted} Submitted
                          </span>

                          <span className={`
                            px-3 py-1.5
                            rounded-full
                            bg-emerald-50
                            text-emerald-700
                            text-xs
                            font-bold
                          `}> 
                            {totalEvaluated} Evaluated
                          </span>

                          <span className={`
                            text-slate-400
                            text-xl
                          `}> 
                            {batchExpanded
                              ? "⌃"
                              : "⌄"}
                          </span>

                        </div>

                      </div>

                    </button>


                    {/* ================================
                        ASSESSMENTS IN BATCH
                    ================================= */}

                    {batchExpanded && (

                      <div className={`
                        border-t
                        border-slate-100
                        p-5
                        space-y-4
                      `}> 

                        {batchAssessments
                          .sort(
                            (a, b) =>
                              String(
                                a.title || ""
                              ).localeCompare(
                                String(
                                  b.title || ""
                                )
                              )
                          )
                          .map(
                            (assessment) => {

                              const assessmentKey =
                                `${activeSection}-${batchId}-${assessment.id}`;

                              const assessmentExpanded =
                                expandedAssessments[
                                  assessmentKey
                                ] === true;

                              const stats =
                                getAssessmentStats(
                                  assessment
                                );

                              return (

                                <div
                                  key={assessment.id}
                                  className={`
                                    border
                                    border-slate-200
                                    rounded-2xl
                                    overflow-hidden
                                  `}
                                >

                                  {/* --------------------------------
                                      ASSESSMENT HEADER
                                  --------------------------------- */}

                                  <button
                                    onClick={() =>
                                      setExpandedAssessments(
                                        (previous) => ({
                                          ...previous,
                                          [assessmentKey]:
                                            !assessmentExpanded,
                                        })
                                      )
                                    }
                                    className={`
                                      w-full
                                      px-5 py-4
                                      text-left
                                      bg-slate-50
                                      hover:bg-slate-100
                                      transition
                                    `}
                                  >

                                    <div className={`
                                      flex
                                      flex-col
                                      lg:flex-row
                                      lg:items-center
                                      lg:justify-between
                                      gap-4
                                    `}> 

                                      <div>

                                        <div className={`
                                          flex
                                          items-center
                                          gap-3
                                          flex-wrap
                                        `}> 

                                          <h3 className={`
                                            font-black
                                            text-slate-800
                                          `}> 
                                            {assessment.title ||
                                              "Untitled Assessment"}
                                          </h3>

                                          <span className={`
                                            px-2.5 py-1
                                            rounded-full
                                            bg-blue-100
                                            text-blue-700
                                            text-[11px]
                                            font-black
                                            uppercase
                                          `}> 
                                            {activeSection === "capstone"
                                              ? "Capstone"
                                              : activeSection === "projects"
                                              ? "Project"
                                              : "Assignment"}
                                          </span>

                                        </div>

                                        <div className={`
                                          flex
                                          flex-wrap
                                          gap-x-5
                                          gap-y-1
                                          mt-2
                                          text-xs
                                          text-slate-500
                                        `}> 

                                          <span>
                                            Published:{" "}
                                            <strong className="text-slate-700">
                                              {formatDate(
                                                assessment.createdAt
                                              )}
                                            </strong>
                                          </span>

                                          <span>
                                            Due:{" "}
                                            <strong className="text-slate-700">
                                              {formatDate(
                                                assessment.dueDate
                                              )}
                                            </strong>
                                          </span>

                                          <span>
  Maximum Marks:{" "}
  <strong className="text-slate-700">
    {getMaximumMarks(assessment) ?? "—"}
  </strong>
</span>

                                        </div>

                                      </div>


                                      <div className={`
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-2
                                      `}> 

                                        <span className={`
                                          px-3 py-1.5
                                          rounded-full
                                          bg-white
                                          border border-slate-200
                                          text-slate-600
                                          text-xs
                                          font-bold
                                        `}> 
                                          {stats.total} Students
                                        </span>

                                        <span className={`
                                          px-3 py-1.5
                                          rounded-full
                                          bg-blue-50
                                          text-blue-700
                                          text-xs
                                          font-bold
                                        `}> 
                                          {stats.submitted} Submitted
                                        </span>

                                        <span className={`
                                          px-3 py-1.5
                                          rounded-full
                                          bg-emerald-50
                                          text-emerald-700
                                          text-xs
                                          font-bold
                                        `}> 
                                          {stats.evaluated} Evaluated
                                        </span>

                                        <span className={`
                                          px-3 py-1.5
                                          rounded-full
                                          bg-amber-50
                                          text-amber-700
                                          text-xs
                                          font-bold
                                        `}> 
                                          {stats.awaitingEvaluation} Awaiting
                                        </span>

                                        <span className={`
                                          text-slate-400
                                          ml-1
                                        `}> 
                                          {assessmentExpanded
                                            ? "⌃"
                                            : "⌄"}
                                        </span>

                                      </div>

                                    </div>

                                  </button>


                                  {/* --------------------------------
                                      STUDENT TABLE
                                  --------------------------------- */}

                                  {assessmentExpanded && (

                                    <div className={`
                                      overflow-x-auto
                                    `}> 

                                      <table className={`
                                        w-full
                                        min-w-[1100px]
                                        text-sm
                                      `}> 

                                        <thead>
                                          <tr className={`
                                            bg-white
                                            border-b
                                            border-slate-200
                                          `}> 

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Candidate
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Submission
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Submitted On
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Evaluation
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Score
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-left
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Remarks
                                            </th>

                                            <th className={`
                                              px-5 py-4
                                              text-right
                                              font-black
                                              text-slate-500
                                              uppercase
                                              tracking-wider
                                              text-[11px]
                                            `}> 
                                              Action
                                            </th>

                                          </tr>
                                        </thead>


                                        <tbody>

                                          {getStudentsForBatch(
                                            batchId
                                          ).map(
                                            (student) => {

                                              const submission =
                                                getSubmissionForStudent(
                                                  assessment.id,
                                                  student.email
                                                );

                                              const status =
                                                getEvaluationStatus(
                                                  submission
                                                );

                                              const isEvaluated =
                                                submission?.evaluated ===
                                                true;

                                              return (

                                                <> 
                                                <tr
                                                  key={
                                                    `${assessment.id}-${student.email}`
                                                  }
                                                  className={`
                                                    border-b
                                                    border-slate-100
                                                    last:border-b-0
                                                    hover:bg-slate-50
                                                    transition
                                                  `}
                                                >

                                                  {/* Candidate */}

                                                  <td className={`
                                                    px-5 py-4
                                                  `}> 

                                                    <div className={`
                                                      flex
                                                      items-center
                                                      gap-3
                                                    `}> 

                                                      <div className={`
                                                        w-9 h-9
                                                        rounded-xl
                                                        bg-blue-50
                                                        text-blue-700
                                                        flex
                                                        items-center
                                                        justify-center
                                                        font-black
                                                        text-sm
                                                      `}> 
                                                        {(
                                                          student.name ||
                                                          student.fullName ||
                                                          "S"
                                                        )
                                                          .charAt(0)
                                                          .toUpperCase()}
                                                      </div>

                                                      <div>

                                                        <p className={`
                                                          font-bold
                                                          text-slate-800
                                                        `}> 
                                                          {student.name ||
                                                            student.fullName ||
                                                            "Unknown Student"}
                                                        </p>

                                                        <p className={`
                                                          text-xs
                                                          text-slate-400
                                                          mt-0.5
                                                        `}> 
                                                          {student.email ||
                                                            "No email"}
                                                        </p>

                                                      </div>

                                                    </div>

                                                  </td>


                                                  {/* Submission */}

                                                  <td className={`
                                                    px-5 py-4
                                                  `}> 

                                                    {submission ? (

                                                      submission.fileUrl ? (

                                                        <a
                                                          href={
                                                            submission.fileUrl
                                                          }
                                                          target="_blank"
                                                          rel="noreferrer"
                                                          className={`
                                                            inline-flex
                                                            items-center
                                                            gap-2
                                                            px-3 py-2
                                                            rounded-lg
                                                            bg-blue-50
                                                            text-blue-700
                                                            hover:bg-blue-100
                                                            font-bold
                                                            text-xs
                                                          `}
                                                        >
                                                          📥 Download
                                                        </a>

                                                      ) : (

                                                        <span className={`
                                                          text-xs
                                                          text-slate-400
                                                        `}> 
                                                          File unavailable
                                                        </span>

                                                      )

                                                    ) : (

                                                      <span className={`
                                                        inline-flex
                                                        px-3 py-1.5
                                                        rounded-full
                                                        bg-slate-100
                                                        text-slate-500
                                                        text-xs
                                                        font-bold
                                                      `}> 
                                                        Not Submitted
                                                      </span>

                                                    )}

                                                  </td>


                                                  {/* Submission Date */}

                                                  <td className={`
                                                    px-5 py-4
                                                    text-slate-600
                                                  `}> 

                                                    {submission
                                                      ? formatDate(
                                                          submission.submittedAt
                                                        )
                                                      : "—"}

                                                  </td>


                                                  {/* Evaluation */}

                                                  <td className={`
                                                    px-5 py-4
                                                  `}> 

                                                    <span
                                                      className={`
                                                        inline-flex
                                                        px-3 py-1.5
                                                        rounded-full
                                                        text-xs
                                                        font-black
                                                        ${
                                                          status ===
                                                          "Evaluated"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : status ===
                                                              "Evaluation Awaited"
                                                            ? "bg-amber-50 text-amber-700"
                                                            : "bg-slate-100 text-slate-500"
                                                        }
                                                      `}
                                                    >
                                                      {status}
                                                    </span>

                                                    {isEvaluated &&
                                                      submission?.evaluationDate && (

                                                        <p className={`
                                                          text-[11px]
                                                          text-slate-400
                                                          mt-2
                                                        `}> 
                                                          {formatDate(
                                                            submission.evaluationDate
                                                          )}
                                                        </p>

                                                      )}

                                                  </td>


                                                  {/* Score */}

                                                  <td className={`
                                                    px-5 py-4
                                                  `}> 

                                                    {isEvaluated ? (

                                                      <span
  className={`
    inline-flex
    px-3 py-1.5
    rounded-lg
    bg-blue-50
    text-blue-700
    font-black
  `}
>
  {submission.marks ?? 0}/{getMaximumMarks(assessment) ?? "—"}
</span>

                                                    ) : (

                                                      <span className={`
                                                        text-slate-400
                                                      `}> 
                                                        —
                                                      </span>

                                                    )}

                                                  </td>


                                                  {/* Remarks */}

                                                  <td className={`
                                                    px-5 py-4
                                                    max-w-[260px]
                                                  `}> 

                                                    {isEvaluated &&
                                                    submission.remarks ? (

                                                      <p className={`
                                                        text-xs
                                                        text-slate-600
                                                        leading-relaxed
                                                      `}> 
                                                        {submission.remarks}
                                                      </p>

                                                    ) : (

                                                      <span className={`
                                                        text-slate-400
                                                      `}> 
                                                        —
                                                      </span>

                                                    )}

                                                  </td>


                                                  {/* Action */}

                                                  <td className={`
                                                    px-5 py-4
                                                    text-right
                                                  `}> 

                                                    {submission ? (

                                                      <button
                                                        onClick={() => {

                                                          const currentMarks =
                                                            submission.marks ??
                                                            "";

                                                          const currentRemarks =
                                                            submission.remarks ??
                                                            "";

                                                          setEvaluations(
                                                            (previous) => ({
                                                              ...previous,
                                                              [submission.id]: {
                                                                marks:
                                                                  currentMarks,
                                                                remarks:
                                                                  currentRemarks,
                                                              },
                                                            })
                                                          );

                                                          document
                                                            .getElementById(
                                                              `evaluation-${submission.id}`
                                                            )
                                                            ?.scrollIntoView({
                                                              behavior:
                                                                "smooth",
                                                              block:
                                                                "center",
                                                            });

                                                        }}
                                                        className={`
                                                          inline-flex
                                                          items-center
                                                          gap-2
                                                          px-4 py-2
                                                          rounded-xl
                                                          bg-slate-900
                                                          hover:bg-slate-800
                                                          text-white
                                                          text-xs
                                                          font-black
                                                          transition
                                                        `}
                                                      >
                                                        {isEvaluated
                                                          ? "Edit Evaluation"
                                                          : "Evaluate"}
                                                      </button>

                                                    ) : (

                                                      <span className={`
                                                        text-xs
                                                        text-slate-400
                                                      `}> 
                                                        Awaiting submission
                                                      </span>

                                                    )}

                                                  </td>

                                                </tr>

                                                {submission &&
                                                  Object.prototype.hasOwnProperty.call(
                                                    evaluations,
                                                    submission.id
                                                  ) && (
                                                    <tr
                                                      key={`${assessment.id}-${student.email}-evaluation`}
                                                      id={`evaluation-${submission.id}`}
                                                      className="bg-slate-50 border-b border-slate-200"
                                                    >
                                                      <td
                                                        colSpan={7}
                                                        className="px-5 py-5"
                                                      >
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                            <div>
                                                              <p className="text-sm font-black text-slate-800">
                                                                {isEvaluated
                                                                  ? "Edit Evaluation"
                                                                  : "Evaluate Submission"}
                                                              </p>
                                                              <p className="text-xs text-slate-500 mt-1">
                                                                Enter the student's score and faculty remarks.
                                                              </p>
                                                            </div>

                                                            <span className="text-xs font-bold text-slate-500">
                                                              Maximum Marks:{" "}
                                                              {getMaximumMarks(assessment) ?? "—"}
                                                            </span>
                                                          </div>

                                                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
                                                            <div>
                                                              <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-2">
                                                                Score
                                                              </label>

                                                              <input
                                                                type="number"
                                                                min="0"
                                                                max={getMaximumMarks(assessment) ?? 20}
                                                                step="0.01"
                                                                value={
                                                                  evaluations[submission.id]?.marks ?? ""
                                                                }
                                                                onChange={(event) =>
                                                                  setEvaluations((previous) => ({
                                                                    ...previous,
                                                                    [submission.id]: {
                                                                      ...previous[submission.id],
                                                                      marks: event.target.value,
                                                                    },
                                                                  }))
                                                                }
                                                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                                placeholder={`0 - ${getMaximumMarks(assessment) ?? 20}`}
                                                              />
                                                            </div>

                                                            <div className="lg:col-span-2">
                                                              <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-2">
                                                                Faculty Remarks
                                                              </label>

                                                              <textarea
                                                                rows={3}
                                                                value={
                                                                  evaluations[submission.id]?.remarks ?? ""
                                                                }
                                                                onChange={(event) =>
                                                                  setEvaluations((previous) => ({
                                                                    ...previous,
                                                                    [submission.id]: {
                                                                      ...previous[submission.id],
                                                                      remarks: event.target.value,
                                                                    },
                                                                  }))
                                                                }
                                                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none resize-y focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                                placeholder="Add feedback or remarks for the student..."
                                                              />
                                                            </div>
                                                          </div>

                                                          <div className="flex justify-end gap-3 mt-5">
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                setEvaluations((previous) => {
                                                                  const next = { ...previous };
                                                                  delete next[submission.id];
                                                                  return next;
                                                                })
                                                              }
                                                              disabled={
                                                                savingEvaluations[submission.id] === true
                                                              }
                                                              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-50"
                                                            >
                                                              Cancel
                                                            </button>

                                                            <button
                                                              type="button"
                                                              onClick={async () => {
                                                                try {
                                                                  setSavingEvaluations((previous) => ({
                                                                    ...previous,
                                                                    [submission.id]: true,
                                                                  }));

                                                                  await saveEvaluation(
                                                                    submission.id
                                                                  );
                                                                } finally {
                                                                  setSavingEvaluations((previous) => {
                                                                    const next = { ...previous };
                                                                    delete next[submission.id];
                                                                    return next;
                                                                  });
                                                                }
                                                              }}
                                                              disabled={
                                                                savingEvaluations[submission.id] === true
                                                              }
                                                              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition disabled:opacity-50"
                                                            >
                                                              {savingEvaluations[submission.id]
                                                                ? "Saving..."
                                                                : isEvaluated
                                                                ? "Save Changes"
                                                                : "Save Evaluation"}
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}

                                                </>

                                              );

                                            }
                                          )}

                                        </tbody>

                                      </table>

                                    </div>

                                  )}

                                </div>

                              );

                            }
                          )}

                      </div>

                    )}

                  </div>

                );

              }
            )

          )}

        </div>

      )}

    </div>

  </div>
);
}