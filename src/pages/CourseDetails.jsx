import { useParams } from "react-router-dom";

export default function CourseDetails() {
  const { id } = useParams();

  const courseData = {
    1: {
      title: "Python Programming",
      video: "https://www.youtube.com/embed/rfscVS0vtbw",
    },

    2: {
      title: "Data Science",
      video: "https://www.youtube.com/embed/ua-CiDNNj30",
    },

    3: {
      title: "Artificial Intelligence",
      video: "https://www.youtube.com/embed/JMUxmLyrhSk",
    },
  };

  const course = courseData[id];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-blue-900 mb-6">
        {course.title}
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">
          Video Lesson
        </h2>

        <div className="aspect-video mb-6">
          <iframe
            className="w-full h-full rounded-xl"
            src={course.video}
            title={course.title}
            allowFullScreen
          ></iframe>
        </div>

        <h2 className="text-2xl font-semibold mb-4">
          Notes & Resources
        </h2>

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
  );
}