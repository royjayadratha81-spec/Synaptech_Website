import { useParams } from "react-router-dom";
import { useState } from "react";

export default function CourseDetails() {
  const { id } = useParams();

  const courses = {
    1: {
      title: "Python Programming",
       notes: "/notes/python-notes.pdf",
      lessons: [
        {
          title: "Introduction to Python",
          video: "https://www.youtube.com/embed/rfscVS0vtbw",
        },

        {
          title: "Python Variables",
          video: "https://www.youtube.com/embed/WGJJIrtnfpk",
        },

        {
          title: "Python Functions",
          video: "https://www.youtube.com/embed/9Os0o3wzS_I",
        },
      ],
    },

    2: {
      title: "Data Science",
      notes: "/notes/ds-notes.pdf",
      lessons: [
        {
          title: "Introduction to Data Science",
          video: "https://www.youtube.com/embed/ua-CiDNNj30",
        },

        {
          title: "Data Analysis",
          video: "https://www.youtube.com/embed/LHBE6Q9XlzI",
        },

        {
          title: "Machine Learning Basics",
          video: "https://www.youtube.com/embed/GwIo3gDZCVQ",
        },
      ],
    },

    3: {
      title: "Artificial Intelligence",
        notes: "/notes/ai-notes.pdf",
      lessons: [
        {
          title: "Introduction to AI",
          video: "https://www.youtube.com/embed/JMUxmLyrhSk",
        },

        {
          title: "Neural Networks",
          video: "https://www.youtube.com/embed/aircAruvnKk",
        },

        {
          title: "Deep Learning",
          video: "https://www.youtube.com/embed/6M5VXKLf4D4",
        },
      ],
    },
  };

  const course = courses[id];

  const [selectedLesson, setSelectedLesson] = useState(
    course.lessons[0]
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-5">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">
          {course.title}
        </h1>

        <h2 className="text-xl font-semibold mb-4">
          Lessons
        </h2>

        <div className="space-y-3">
          {course.lessons.map((lesson, index) => (
            <button
              key={index}
              onClick={() => setSelectedLesson(lesson)}
              className="w-full text-left bg-blue-100 hover:bg-blue-200 p-3 rounded-xl transition"
            >
              {lesson.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">

        <h2 className="text-3xl font-bold text-blue-900 mb-6">
          {selectedLesson.title}
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <div className="aspect-video mb-6">
            <iframe
              className="w-full h-full rounded-xl"
              src={selectedLesson.video}
              title={selectedLesson.title}
              allowFullScreen
            ></iframe>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-4">
              Notes & Resources
            </h3>

            <ul className="list-disc ml-6 text-blue-700">
              <li>
                <a href="#" className="hover:underline">
                  Download PDF Notes
                </a>
              </li>

              <li>
                <a href="#" className="hover:underline">
                  Assignment Sheet
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}