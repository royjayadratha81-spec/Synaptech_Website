import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const DEFAULT_DURATION = 25;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_AVAILABILITY_DAYS = 7;
const DEFAULT_POSITIVE_MARKS = 1;
const DEFAULT_NEGATIVE_MARKS = 0;

const emptyQuestion = () => ({
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctAnswer: "",
  topic: "",
  difficulty: "Medium",
  explanation: "",
  positiveMarks: DEFAULT_POSITIVE_MARKS,
  negativeMarks: DEFAULT_NEGATIVE_MARKS,
});

function toLocalDateTimeInput(date) {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeInput(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CreateMcqTest() {
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);

  const [startAtInput, setStartAtInput] = useState(
    toLocalDateTimeInput(new Date())
  );
  const [availabilityDays, setAvailabilityDays] = useState(
    DEFAULT_AVAILABILITY_DAYS
  );
  const [durationMinutes, setDurationMinutes] =
    useState(DEFAULT_DURATION);
  const [maxAttempts, setMaxAttempts] =
    useState(DEFAULT_ATTEMPTS);

  const [questions, setQuestions] = useState([
    emptyQuestion(),
  ]);

  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const browserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      setLoading(true);

      const [batchSnapshot, moduleSnapshot] =
        await Promise.all([
          getDocs(collection(db, "batches")),
          getDocs(collection(db, "modules")),
        ]);

      const batchList = batchSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) =>
          String(a.batchName || "").localeCompare(
            String(b.batchName || "")
          )
        );

      const moduleList = moduleSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort(
          (a, b) =>
            Number(a.moduleOrder || 999) -
            Number(b.moduleOrder || 999)
        );

      setBatches(batchList);
      setModules(moduleList);
    } catch (error) {
      console.error("REFERENCE DATA ERROR:", error);
      alert(
        "Unable to load batches and modules. Please check Firebase."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addQuestion = () => {
    setQuestions((previous) => [
      ...previous,
      emptyQuestion(),
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const toggleBatch = (batchId) => {
    setSelectedBatchIds((previous) =>
      previous.includes(batchId)
        ? previous.filter((id) => id !== batchId)
        : [...previous, batchId]
    );
  };

  const selectAllBatches = () => {
    setSelectedBatchIds(batches.map((batch) => batch.id));
  };

  const clearAllBatches = () => {
    setSelectedBatchIds([]);
  };

  const validate = () => {
    if (!title.trim()) {
      alert("Please enter a Mini-Test title.");
      return false;
    }

    if (!moduleId) {
      alert("Please select a module.");
      return false;
    }

    if (selectedBatchIds.length === 0) {
      alert("Please select at least one batch.");
      return false;
    }

    if (!fromDateTimeInput(startAtInput)) {
      alert("Please select a valid start date and time.");
      return false;
    }

    if (
      !Number.isInteger(Number(availabilityDays)) ||
      Number(availabilityDays) < 1
    ) {
      alert("Availability must be at least 1 day.");
      return false;
    }

    if (
      !Number.isInteger(Number(durationMinutes)) ||
      Number(durationMinutes) < 1
    ) {
      alert("Duration must be at least 1 minute.");
      return false;
    }

    if (
      !Number.isInteger(Number(maxAttempts)) ||
      Number(maxAttempts) < 1
    ) {
      alert("Maximum attempts must be at least 1.");
      return false;
    }

    if (questions.length === 0) {
      alert("Please add at least one question.");
      return false;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];

      if (!q.question.trim()) {
        alert(`Please enter Question ${i + 1}.`);
        return false;
      }

      if (
        !q.option1.trim() ||
        !q.option2.trim() ||
        !q.option3.trim() ||
        !q.option4.trim()
      ) {
        alert(
          `Please complete all four options for Question ${
            i + 1
          }.`
        );
        return false;
      }

      if (!q.correctAnswer.trim()) {
        alert(
          `Please enter the correct answer for Question ${
            i + 1
          }.`
        );
        return false;
      }

      const validAnswers = [
        q.option1.trim(),
        q.option2.trim(),
        q.option3.trim(),
        q.option4.trim(),
      ];

      if (!validAnswers.includes(q.correctAnswer.trim())) {
        alert(
          `The correct answer for Question ${
            i + 1
          } must exactly match one of its four options.`
        );
        return false;
      }

      const positive = Number(q.positiveMarks);
      const negative = Number(q.negativeMarks);

      if (!Number.isFinite(positive) || positive <= 0) {
        alert(
          `Positive marks for Question ${i + 1} must be greater than 0.`
        );
        return false;
      }

      if (!Number.isFinite(negative) || negative < 0) {
        alert(
          `Negative marks for Question ${i + 1} cannot be negative.`
        );
        return false;
      }
    }

    return true;
  };

  const createTestForBatch = async ({
    batch,
    module,
    startDate,
    endDate,
    templateId,
  }) => {
    const testRef = doc(collection(db, "mcqTests"));

    const testData = {
      title: title.trim(),
      moduleId,
      moduleName:
        module.moduleName ||
        module.name ||
        module.title ||
        module.id,

      batchId: batch.id,
      batchName: batch.batchName || batch.name || batch.id,

      active: true,
      assessmentType: "Mini-Test",
      testType: "MCQ",

      startAt: Timestamp.fromDate(startDate),
      endAt: Timestamp.fromDate(endDate),
      availabilityDays: Number(availabilityDays),

      questionCount: questions.length,
      durationMinutes: Number(durationMinutes),
      maxAttempts: Number(maxAttempts),

      timezone: browserTimezone,

      templateId: templateId || null,
      source: templateId ? "assessment-template" : "manual",
      version: 1,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batchWriter = writeBatch(db);

    batchWriter.set(testRef, testData);

    questions.forEach((question, index) => {
      const questionRef = doc(
        collection(
          db,
          "mcqTests",
          testRef.id,
          "questions"
        )
      );

      batchWriter.set(questionRef, {
        question: question.question.trim(),
        option1: question.option1.trim(),
        option2: question.option2.trim(),
        option3: question.option3.trim(),
        option4: question.option4.trim(),

        correctAnswer:
          question.correctAnswer.trim(),

        topic:
          question.topic.trim() || "General",

        difficulty:
          question.difficulty || "Medium",

        explanation:
          question.explanation.trim(),

        positiveMarks: Number(
          question.positiveMarks
        ),

        negativeMarks: Number(
          question.negativeMarks
        ),

        questionOrder: index + 1,

        createdAt: serverTimestamp(),
      });
    });

    await batchWriter.commit();

    return testRef.id;
  };

  const saveTest = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const module = modules.find(
        (item) => item.id === moduleId
      );

      if (!module) {
        throw new Error("Selected module was not found.");
      }

      const selectedBatches = batches.filter((batch) =>
        selectedBatchIds.includes(batch.id)
      );

      if (selectedBatches.length === 0) {
        throw new Error(
          "No valid batches were selected."
        );
      }

      const startDate =
        fromDateTimeInput(startAtInput);

      const endDate = new Date(startDate);
      endDate.setDate(
        endDate.getDate() +
          Number(availabilityDays)
      );

      /*
       * A single reusable template represents the
       * assessment definition. Each selected batch still
       * receives its own mcqTests document and its own
       * questions subcollection.
       *
       * This is the foundation for automatic future-batch
       * provisioning.
       */
      let templateId = null;

      if (saveAsTemplate) {
        const templateRef = await addDoc(
          collection(db, "assessmentTemplates"),
          {
            templateType: "Mini-Test",
            assessmentType: "Mini-Test",
            testType: "MCQ",

            title: title.trim(),

            moduleId,
            moduleName:
              module.moduleName ||
              module.name ||
              module.title ||
              module.id,

            questionCount: questions.length,
            durationMinutes:
              Number(durationMinutes),
            maxAttempts: Number(maxAttempts),

            availabilityDays:
              Number(availabilityDays),

            timezone: browserTimezone,

            questions: questions.map(
              (question, index) => ({
                question:
                  question.question.trim(),
                option1:
                  question.option1.trim(),
                option2:
                  question.option2.trim(),
                option3:
                  question.option3.trim(),
                option4:
                  question.option4.trim(),

                correctAnswer:
                  question.correctAnswer.trim(),

                topic:
                  question.topic.trim() ||
                  "General",

                difficulty:
                  question.difficulty ||
                  "Medium",

                explanation:
                  question.explanation.trim(),

                positiveMarks:
                  Number(question.positiveMarks),

                negativeMarks:
                  Number(question.negativeMarks),

                questionOrder: index + 1,
              })
            ),

            active: true,
            autoProvisionForNewBatches: true,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        templateId = templateRef.id;
      }

      const createdTestIds = [];

      for (const batch of selectedBatches) {
        const testId = await createTestForBatch({
          batch,
          module,
          startDate,
          endDate,
          templateId,
        });

        createdTestIds.push({
          batchName:
            batch.batchName ||
            batch.name ||
            batch.id,
          testId,
        });
      }

      alert(
        `Mini-Test created successfully for ${
          selectedBatches.length
        } batch${
          selectedBatches.length > 1 ? "es" : ""
        }.\n\n` +
          createdTestIds
            .map(
              (item) =>
                `${item.batchName} → ${item.testId}`
            )
            .join("\n") +
          (saveAsTemplate
            ? "\n\nA reusable assessment template was also created. The next step will connect this template to automatic new-batch provisioning."
            : "")
      );

      setTitle("");
      setModuleId("");
      setSelectedBatchIds([]);
      setQuestions([emptyQuestion()]);
      setStartAtInput(
        toLocalDateTimeInput(new Date())
      );
    } catch (error) {
      console.error(
        "CREATE MINI-TEST ERROR:",
        error
      );

      alert(
        error?.message ||
          "Error creating Mini-Test. Please check the console."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedModule = modules.find(
    (item) => item.id === moduleId
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-6">
          <p className="text-gray-700 font-semibold">
            Loading batches and modules...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-800 text-white px-8 py-8">
            <h1 className="text-3xl md:text-4xl font-bold">
              Create Mini-Test
            </h1>

            <p className="text-blue-100 mt-2">
              Create one Mini-Test definition and
              automatically provision separate
              batch-specific test documents.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* BASIC INFORMATION */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                1. Test Information
              </h2>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-2">
                    Mini-Test Title
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    placeholder="e.g. NumPy Mini-Test"
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Module
                  </label>

                  <select
                    value={moduleId}
                    onChange={(e) =>
                      setModuleId(e.target.value)
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  >
                    <option value="">
                      Select Module
                    </option>

                    {modules.map((module) => (
                      <option
                        key={module.id}
                        value={module.id}
                      >
                        {module.moduleName ||
                          module.name ||
                          module.title ||
                          module.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Duration (minutes)
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Maximum Attempts
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={maxAttempts}
                    onChange={(e) =>
                      setMaxAttempts(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Availability (days)
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={availabilityDays}
                    onChange={(e) =>
                      setAvailabilityDays(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={startAtInput}
                    onChange={(e) =>
                      setStartAtInput(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl"
                  />

                  <p className="text-xs text-gray-500 mt-2">
                    Current browser timezone:{" "}
                    {browserTimezone}
                  </p>
                </div>
              </div>

              {selectedModule && (
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                  Selected module:{" "}
                  <strong>
                    {selectedModule.moduleName ||
                      selectedModule.name ||
                      selectedModule.title}
                  </strong>
                </div>
              )}
            </section>

            {/* BATCHES */}
            <section>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    2. Batches
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Each selected batch receives its own
                    mcqTests document and questions.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllBatches}
                    className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={clearAllBatches}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {batches.length === 0 ? (
                <div className="border border-yellow-300 bg-yellow-50 rounded-xl p-4 text-yellow-800">
                  No batches found. Create a batch first.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {batches.map((batch) => {
                    const checked =
                      selectedBatchIds.includes(
                        batch.id
                      );

                    return (
                      <label
                        key={batch.id}
                        className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition ${
                          checked
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleBatch(batch.id)
                          }
                          className="w-5 h-5"
                        />

                        <div>
                          <div className="font-semibold text-gray-800">
                            {batch.batchName ||
                              batch.name ||
                              batch.id}
                          </div>

                          {batch.course && (
                            <div className="text-xs text-gray-500">
                              {batch.course}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <p className="text-sm text-gray-600 mt-3">
                Selected batches:{" "}
                <strong>
                  {selectedBatchIds.length}
                </strong>
              </p>
            </section>

            {/* AUTOMATION */}
            <section className="border border-indigo-200 bg-indigo-50 rounded-2xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) =>
                    setSaveAsTemplate(
                      e.target.checked
                    )
                  }
                  className="w-5 h-5 mt-1"
                />

                <span>
                  <span className="block font-bold text-indigo-900">
                    Save as reusable Mini-Test template
                  </span>

                  <span className="block text-sm text-indigo-800 mt-1">
                    This stores the assessment definition
                    so future batches can receive their own
                    Mini-Test automatically. The batch-creation
                    hook will be connected in the next step.
                  </span>
                </span>
              </label>
            </section>

            {/* QUESTIONS */}
            <section>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    3. Questions
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Question data is copied into every
                    batch-specific Mini-Test.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-5">
                {questions.map(
                  (question, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">
                          Question {index + 1}
                        </h3>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeQuestion(index)
                            }
                            className="text-red-600 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <textarea
                        value={question.question}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            "question",
                            e.target.value
                          )
                        }
                        placeholder="Enter question"
                        rows={3}
                        className="w-full border border-gray-300 p-3 rounded-xl mb-4 bg-white"
                      />

                      <div className="grid md:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(
                          (optionNumber) => {
                            const field = `option${optionNumber}`;

                            return (
                              <input
                                key={field}
                                type="text"
                                value={
                                  question[field]
                                }
                                onChange={(e) =>
                                  updateQuestion(
                                    index,
                                    field,
                                    e.target.value
                                  )
                                }
                                placeholder={`Option ${optionNumber}`}
                                className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                              />
                            );
                          }
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <input
                          type="text"
                          value={
                            question.correctAnswer
                          }
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "correctAnswer",
                              e.target.value
                            )
                          }
                          placeholder="Correct answer — must exactly match one option"
                          className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                        />

                        <input
                          type="text"
                          value={question.topic}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "topic",
                              e.target.value
                            )
                          }
                          placeholder="Topic (optional)"
                          className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                        />

                        <select
                          value={
                            question.difficulty
                          }
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "difficulty",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                        >
                          <option value="Easy">
                            Easy
                          </option>
                          <option value="Medium">
                            Medium
                          </option>
                          <option value="Hard">
                            Hard
                          </option>
                        </select>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              question.positiveMarks
                            }
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "positiveMarks",
                                e.target.value
                              )
                            }
                            placeholder="Positive marks"
                            className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              question.negativeMarks
                            }
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "negativeMarks",
                                e.target.value
                              )
                            }
                            placeholder="Negative marks"
                            className="w-full border border-gray-300 p-3 rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <textarea
                        value={
                          question.explanation
                        }
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            "explanation",
                            e.target.value
                          )
                        }
                        placeholder="Explanation shown in the result (optional)"
                        rows={2}
                        className="w-full border border-gray-300 p-3 rounded-xl mt-3 bg-white"
                      />
                    </div>
                  )
                )}
              </div>
            </section>

            {/* SUMMARY */}
            <section className="rounded-2xl bg-gray-900 text-white p-6">
              <h2 className="text-lg font-bold mb-4">
                Creation Summary
              </h2>

              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">
                    Module
                  </div>
                  <div className="font-semibold">
                    {selectedModule?.moduleName ||
                      selectedModule?.name ||
                      "—"}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400">
                    Batches
                  </div>
                  <div className="font-semibold">
                    {selectedBatchIds.length}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400">
                    Questions
                  </div>
                  <div className="font-semibold">
                    {questions.length}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400">
                    Availability
                  </div>
                  <div className="font-semibold">
                    {availabilityDays} days
                  </div>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={saveTest}
              disabled={saving}
              className={`w-full py-4 rounded-2xl text-white text-lg font-bold ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800"
              }`}
            >
              {saving
                ? "Creating Mini-Test..."
                : `Create Mini-Test${
                    selectedBatchIds.length > 1
                      ? "s"
                      : ""
                  }`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
