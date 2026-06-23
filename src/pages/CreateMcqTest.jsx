import { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

export default function CreateMcqTest() {

  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [questions, setQuestions] = useState([
  {
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: "",
  },
]);
const saveTest = async () => {

  try {

    const testRef = await addDoc(
      collection(db, "mcqTests"),
      {
        title,
        moduleId,
        active: true,
      }
    );

    for (const q of questions) {

      await addDoc(
        collection(
          db,
          "mcqTests",
          testRef.id,
          "questions"
        ),
        {
          question: q.question,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correctAnswer:
            q.correctAnswer,
        }
      );

    }

    alert(
      "MCQ Test Created Successfully"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Error Creating Test"
    );

  }

};

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <div className="bg-white p-6 rounded-2xl shadow-lg">

        <h1 className="text-3xl font-bold text-blue-700 mb-6">

          Create MCQ Test

        </h1>

        <label className="block font-semibold mb-2">
          Test Title
        </label>

        <input
          type="text"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full border p-3 rounded-lg mb-4"
        />

        <label className="block font-semibold mb-2">
          Module ID
        </label>

        <input
          type="text"
          value={moduleId}
          onChange={(e) =>
            setModuleId(e.target.value)
          }
          className="w-full border p-3 rounded-lg mb-4"
        />
<button
  type="button"
  onClick={() =>
    setQuestions([
      ...questions,
      {
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctAnswer: "",
      },
    ])
  }
  className="
    mt-4
    bg-green-600
    text-white
    px-4
    py-2
    rounded
  "
>
  Add Question
</button>
{questions.map((question, index) => (

  <div
    key={index}
    className="border p-4 rounded-lg mt-4"
  >

    <h3 className="font-bold mb-3">
      Question {index + 1}
    </h3>

    <input
      type="text"
      placeholder="Question"
      value={question.question}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].question =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

    <input
      type="text"
      placeholder="Option 1"
      value={question.option1}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].option1 =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

    <input
      type="text"
      placeholder="Option 2"
      value={question.option2}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].option2 =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

    <input
      type="text"
      placeholder="Option 3"
      value={question.option3}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].option3 =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

    <input
      type="text"
      placeholder="Option 4"
      value={question.option4}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].option4 =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

    <input
      type="text"
      placeholder="Correct Answer"
      value={question.correctAnswer}
      onChange={(e) => {

        const updated =
          [...questions];

        updated[index].correctAnswer =
          e.target.value;

        setQuestions(updated);

      }}
      className="w-full border p-2 mb-2"
    />

  </div>

))}
      </div>
      <button
  onClick={saveTest}
  className="
    bg-green-600
    hover:bg-green-700
    text-white
    px-6
    py-3
    rounded-lg
    mt-6
  "
>
  Save Test
</button>

    </div>

  );

}