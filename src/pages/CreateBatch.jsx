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
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] md:px-9 md:py-10">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-300">
                  Academic Management • Batch Operations
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Create Batch</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  Create a production-ready learning cohort with its academic timeline, trainer and automatic assessment provisioning.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Provisioning</div>
                  <div className="mt-2 text-lg font-black">Automatic</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workflow</div>
                  <div className="mt-2 text-lg font-black">6 fields</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-8">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-lg font-black text-white shadow-lg shadow-violet-200">01</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Batch identity</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Define the learning cohort</h2>
                <p className="mt-1 text-sm text-slate-500">These fields feed the existing batch creation workflow.</p>
              </div>
            </div>

            <div className="mb-7 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 p-5">
              <div className="flex gap-3">
                <div className="mt-0.5 text-xl">✦</div>
                <div>
                  <p className="text-sm font-black text-slate-900">Automatic Assessment Provisioning</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">New batches automatically receive the latest reusable Mini-Test for every module, with separate batch-specific test documents and copied questions.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                {[
                  ['Batch ID', batchId, setBatchId, 'e.g. DS-2026-09'],
                  ['Batch Name', batchName, setBatchName, 'e.g. Data Science — September 2026'],
                  ['Course', course, setCourse, 'e.g. Data Science with Gen AI'],
                  ['Trainer', trainer, setTrainer, 'Lead trainer name'],
                ].map(([label, value, setter, placeholder]) => (
                  <label key={label} className="block">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
                    <input type="text" placeholder={placeholder} value={value} onChange={(e) => setter(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50" required />
                  </label>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Start date</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">End date</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50" required />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">Creating the batch continues to use the existing Firestore and Mini-Test provisioning logic.</p>
                <button type="submit" disabled={creating} className="rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
                  {creating ? 'Creating Batch & Mini-Tests...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Launch checklist</p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Ready for operations</h3>
              <div className="mt-5 space-y-3">
                {['Cohort identity defined', 'Trainer attached', 'Learning window configured', 'Mini-Test provisioning enabled'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                    <span className="text-xs font-bold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-[0_20px_60px_rgba(99,102,241,0.20)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">Operational note</div>
              <p className="mt-3 text-sm font-bold leading-6">Each new cohort remains connected to the existing assessment ecosystem without changing its underlying data contracts.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

}
