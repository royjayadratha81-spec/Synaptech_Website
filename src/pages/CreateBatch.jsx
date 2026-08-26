import { useState } from "react";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const DEFAULT_AVAILABILITY_DAYS = 7;
const DEFAULT_DURATION_MINUTES = 25;
const DEFAULT_MAX_ATTEMPTS = 3;

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function shiftDate(date, milliseconds) {
  if (!date) return null;
  return new Date(date.getTime() + milliseconds);
}

function createdTime(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function normalizeQuestion(question, index) {
  return {
    question: String(question.question || "").trim(),
    option1: String(question.option1 || "").trim(),
    option2: String(question.option2 || "").trim(),
    option3: String(question.option3 || "").trim(),
    option4: String(question.option4 || "").trim(),
    correctAnswer: String(question.correctAnswer || "").trim(),
    topic: String(question.topic || "General").trim(),
    difficulty: question.difficulty || "Medium",
    explanation: String(question.explanation || "").trim(),
    positiveMarks:
      Number.isFinite(Number(question.positiveMarks))
        ? Number(question.positiveMarks)
        : 1,
    negativeMarks:
      Number.isFinite(Number(question.negativeMarks))
        ? Number(question.negativeMarks)
        : 0,
    questionOrder: Number(question.questionOrder) || index + 1,
  };
}

export default function CreateBatch() {
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [course, setCourse] = useState("");
  const [trainer, setTrainer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [creating, setCreating] = useState(false);

  /*
    Find the latest reusable Mini-Test template for every module.

    Newer templates are preferred. This is the primary source because
    assessmentTemplates already contain the complete question set.
  */
  const getLatestTemplatesByModule = async () => {
    const snapshot = await getDocs(
      collection(db, "assessmentTemplates")
    );

    const templates = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .filter(
        (item) =>
          item.active !== false &&
          item.templateType === "Mini-Test" &&
          item.assessmentType === "Mini-Test" &&
          item.moduleId
      );

    const latest = {};

    templates.forEach((template) => {
      const existing = latest[template.moduleId];

      if (
        !existing ||
        createdTime(template.updatedAt || template.createdAt) >
          createdTime(existing.updatedAt || existing.createdAt)
      ) {
        latest[template.moduleId] = template;
      }
    });

    return latest;
  };

  /*
    Fallback for older Mini-Tests that were created before the
    assessmentTemplates structure existed.

    This lets us transition the existing system without losing
    old Python/other-module questions.
  */
  const getLatestTestsByModule = async () => {
    const snapshot = await getDocs(
      collection(db, "mcqTests")
    );

    const tests = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .filter(
        (item) =>
          item.active !== false &&
          item.moduleId
      );

    const latest = {};

    tests.forEach((test) => {
      const existing = latest[test.moduleId];

      if (
        !existing ||
        createdTime(test.updatedAt || test.createdAt) >
          createdTime(existing.updatedAt || existing.createdAt)
      ) {
        latest[test.moduleId] = test;
      }
    });

    return latest;
  };

  /*
    Promote an older Mini-Test into the canonical reusable
    assessmentTemplates collection.

    This is the migration bridge for tests such as the original
    Python June test that were created before assessmentTemplates
    existed.

    Once promoted, future batches use the template automatically.
  */
  const createTemplateFromLegacyTest = async ({
    sourceTest,
    questions,
  }) => {
    const templateRef = doc(
      collection(db, "assessmentTemplates")
    );

    const normalizedQuestions = questions.map(
      (question, index) =>
        normalizeQuestion(question, index)
    );

    const templateData = {
      title:
        String(
          sourceTest.title ||
            `${sourceTest.moduleName || sourceTest.moduleId} Mini Test`
        ).trim(),

      moduleId: sourceTest.moduleId,

      moduleName:
        sourceTest.moduleName ||
        sourceTest.moduleId,

      active: true,

      assessmentType: "Mini-Test",
      templateType: "Mini-Test",
      testType: "MCQ",

      autoProvisionForNewBatches: true,

      availabilityDays:
        Number(sourceTest.availabilityDays) ||
        DEFAULT_AVAILABILITY_DAYS,

      durationMinutes:
        Number(sourceTest.durationMinutes) ||
        DEFAULT_DURATION_MINUTES,

      maxAttempts:
        Number(sourceTest.maxAttempts) ||
        DEFAULT_MAX_ATTEMPTS,

      questionCount: normalizedQuestions.length,

      questions: normalizedQuestions,

      timezone:
        sourceTest.timezone ||
        "Asia/Calcutta",

      version:
        Number(sourceTest.version) || 1,

      source: "legacy-test-migration",
      sourceTestId: sourceTest.id || null,
      sourceBatchId: sourceTest.batchId || null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      templateRef,
      templateData
    );

    return templateRef.id;
  };

  const getQuestionsFromTest = async (testId) => {
    const snapshot = await getDocs(
      collection(
        db,
        "mcqTests",
        testId,
        "questions"
      )
    );

    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .sort(
        (a, b) =>
          Number(a.questionOrder || 9999) -
          Number(b.questionOrder || 9999)
      );
  };

  const provisionMiniTestsForBatch = async ({
    newBatchId,
    newBatchName,
    newBatchStartDate,
  }) => {
    const latestTemplates =
      await getLatestTemplatesByModule();

    const latestTests =
      await getLatestTestsByModule();

    /*
      Build the complete module list from both sources.
      Templates are preferred; old tests are used only where a
      template does not yet exist.
    */
    const moduleIds = Array.from(
      new Set([
        ...Object.keys(latestTemplates),
        ...Object.keys(latestTests),
      ])
    );

    let created = 0;
    let skipped = 0;
    let templatesCreated = 0;

    const targetStart = new Date(
      `${newBatchStartDate}T00:00:00`
    );

    for (const moduleId of moduleIds) {
      let template = latestTemplates[moduleId];
      const sourceTest = latestTests[moduleId];

      let sourceData = null;
      let sourceTestId = null;
      let sourceBatchId = null;
      let sourceBatchStart = null;

      let questions = [];

      if (template) {
        /*
          Preferred source: reusable assessment template.
        */
        sourceData = template;
        sourceTestId = null;

        questions = Array.isArray(template.questions)
          ? template.questions.map(normalizeQuestion)
          : [];
      } else if (sourceTest) {
        /*
          Backward-compatible fallback for old tests.
        */
        sourceData = sourceTest;
        sourceTestId = sourceTest.id;
        sourceBatchId = sourceTest.batchId || null;

        questions = await getQuestionsFromTest(
          sourceTest.id
        );

        /*
          AUTOMATIC LEGACY MIGRATION

          If this module has an old Mini-Test but no reusable
          assessment template yet, create the template now.

          Example:
            old Python June test
                  ↓
            assessmentTemplates/Python template
                  ↓
            future batches (August, September, ...)
        */
        if (questions.length > 0) {
          const migratedTemplateId =
            await createTemplateFromLegacyTest({
              sourceTest,
              questions,
            });

          const migratedTemplateSnap =
            await getDoc(
              doc(
                db,
                "assessmentTemplates",
                migratedTemplateId
              )
            );

          if (migratedTemplateSnap.exists()) {
            template = {
              id: migratedTemplateId,
              ...migratedTemplateSnap.data(),
            };

            templatesCreated += 1;
          }
        }

        if (sourceBatchId) {
          const sourceBatchSnap = await getDoc(
            doc(db, "batches", sourceBatchId)
          );

          if (sourceBatchSnap.exists()) {
            sourceBatchStart =
              sourceBatchSnap.data()?.startDate || null;
          }
        }
      }

      if (!sourceData || questions.length === 0) {
        skipped += 1;
        continue;
      }

      /*
        Work out the relative position of the assessment inside
        the source batch.

        Example:
          source batch starts 01-Jun
          test starts 14-Jun

          new batch starts 01-Aug

          new test starts 14-Aug.
      */
      let startAt = null;

      const sourceStartAt = toDate(
        sourceData.startAt
      );

      if (sourceStartAt && sourceBatchStart) {
        const sourceBatchDate = new Date(
          `${sourceBatchStart}T00:00:00`
        );

        if (!Number.isNaN(sourceBatchDate.getTime())) {
          const relativeOffset =
            sourceStartAt.getTime() -
            sourceBatchDate.getTime();

          startAt = new Date(
            targetStart.getTime() +
              relativeOffset
          );
        }
      }

      /*
        If the source test does not have a valid relative
        date, start on the new batch's start date.
      */
      if (!startAt) {
        startAt = new Date(targetStart);
      }

      const availabilityDays =
        Number(
          sourceData.availabilityDays
        ) || DEFAULT_AVAILABILITY_DAYS;

      const endAt = new Date(startAt);
      endAt.setDate(
        endAt.getDate() + availabilityDays
      );

      const testRef = doc(
        collection(db, "mcqTests")
      );

      /*
        CANONICAL MINI-TEST SCHEMA

        Every newly created batch test receives exactly this
        standard set of top-level fields.

        This prevents the NumPy/Python field mismatch we found
        in the existing Firestore documents.
      */
      const newTestData = {
        title:
          String(
            sourceData.title ||
              `${sourceData.moduleName || moduleId} Mini Test`
          ).trim(),

        moduleId,

        moduleName:
          sourceData.moduleName ||
          sourceData.moduleName ||
          moduleId,

        batchId: newBatchId,
        batchName: newBatchName,

        active: true,

        assessmentType: "Mini-Test",
        testType: "MCQ",

        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),

        availabilityDays,

        questionCount: questions.length,

        durationMinutes:
          Number(sourceData.durationMinutes) ||
          DEFAULT_DURATION_MINUTES,

        maxAttempts:
          Number(sourceData.maxAttempts) ||
          DEFAULT_MAX_ATTEMPTS,

        timezone:
          sourceData.timezone ||
          "Asia/Calcutta",

        templateId:
          template?.id ||
          sourceData.templateId ||
          null,

        source:
          template
            ? "assessment-template"
            : "legacy-test-migration",

        version:
          Number(sourceData.version) || 1,

        /*
          These fields are useful for auditability and
          white-label administration.
        */
        autoProvisioned: true,
        provisionedFromBatch:
          sourceBatchId || null,
        provisionedFromTestId:
          sourceTestId || null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        testRef,
        newTestData
      );

      /*
        Copy questions into the new test.

        IMPORTANT:
        We intentionally create NEW question documents.
        Therefore August has its own questions and future
        changes to another batch cannot alter August's copy.
      */
      for (
        let index = 0;
        index < questions.length;
        index += 1
      ) {
        const question = normalizeQuestion(
          questions[index],
          index
        );

        const questionRef = doc(
          collection(
            db,
            "mcqTests",
            testRef.id,
            "questions"
          )
        );

        await setDoc(
          questionRef,
          {
            ...question,

            sourceQuestionId:
              questions[index].id || null,

            sourceTestId:
              sourceTestId || null,

            sourceTemplateId:
              template?.id ||
              sourceData.templateId ||
              null,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      created += 1;
    }

    return {
      created,
      skipped,
      templatesCreated,
      modulesConsidered: moduleIds.length,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (creating) return;

    if (!batchId.trim()) {
      alert("Please enter a Batch ID.");
      return;
    }

    if (!batchName.trim()) {
      alert("Please enter a Batch Name.");
      return;
    }

    if (!course.trim()) {
      alert("Please enter the Course.");
      return;
    }

    if (!trainer.trim()) {
      alert("Please enter the Trainer.");
      return;
    }

    if (!startDate) {
      alert("Please select the Start Date.");
      return;
    }

    if (!endDate) {
      alert("Please select the End Date.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End Date cannot be before Start Date.");
      return;
    }

    try {
      setCreating(true);

      const cleanBatchId =
        batchId.trim();

      const cleanBatchName =
        batchName.trim();

      const existingBatchSnap =
        await getDoc(
          doc(
            db,
            "batches",
            cleanBatchId
          )
        );

      if (existingBatchSnap.exists()) {
        alert(
          `Batch "${cleanBatchId}" already exists. Please use a different Batch ID.`
        );
        return;
      }

      /*
        STEP 1 — CREATE BATCH
      */
      await setDoc(
        doc(
          db,
          "batches",
          cleanBatchId
        ),
        {
          batchName: cleanBatchName,
          course: course.trim(),
          trainer: trainer.trim(),
          startDate,
          endDate,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      /*
        STEP 2 — AUTOMATIC MINI-TEST PROVISIONING
      */
      const result =
        await provisionMiniTestsForBatch({
          newBatchId: cleanBatchId,
          newBatchName: cleanBatchName,
          newBatchStartDate: startDate,
        });

      alert(
        `Batch Created Successfully!\n\n` +
        `Mini-Tests created: ${result.created}\n` +
        `Reusable templates created: ${result.templatesCreated}\n` +
        `Modules considered: ${result.modulesConsidered}\n` +
        `Skipped: ${result.skipped}\n\n` +
        (
          result.created > 0
            ? "Each Mini-Test has its own batchId, dates, fields and copied questions."
            : "No reusable Mini-Test source was available."
        )
      );

      setBatchId("");
      setBatchName("");
      setCourse("");
      setTrainer("");
      setStartDate("");
      setEndDate("");
    } catch (error) {
      console.error(
        "CREATE BATCH / MINI-TEST PROVISIONING ERROR:",
        error
      );

      alert(
        error?.message ||
          "Error creating batch or provisioning Mini-Tests."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-8">
          Create Batch
        </h1>

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>Automatic Assessment Provisioning:</strong>{" "}
          New batches automatically receive the latest reusable
          Mini-Test for every module, with separate batch-specific
          test documents and question copies.
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Batch ID"
            value={batchId}
            onChange={(e) =>
              setBatchId(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="text"
            placeholder="Batch Name"
            value={batchName}
            onChange={(e) =>
              setBatchName(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="text"
            placeholder="Course"
            value={course}
            onChange={(e) =>
              setCourse(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="text"
            placeholder="Trainer"
            value={trainer}
            onChange={(e) =>
              setTrainer(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
            className="w-full border p-3 rounded"
            required
          />

          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded"
          >
            {creating
              ? "Creating Batch & Mini-Tests..."
              : "Create Batch"}
          </button>
        </form>
      </div>
    </div>
  );
}
