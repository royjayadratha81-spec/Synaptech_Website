import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function CourseDetails() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);

useEffect(() => {
  const fetchCourse = async () => {
    try {
      console.log("Route ID:", id);

      const docRef = doc(db, "courses", id);

      const docSnap = await getDoc(docRef);

      console.log("Document exists:", docSnap.exists());

      if (docSnap.exists()) {
        console.log("Firestore data:", docSnap.data());
        setCourse(docSnap.data());
      } else {
        console.log("NO DOCUMENT FOUND");
      }

    } catch (error) {
      console.error("Firestore Error:", error);
    }
  };

  fetchCourse();
}, [id]);
if (!course) {
  console.log("Course Data:", course);
  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading Course...
    </div>
  );
}



  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-5">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">
          {course.courseName}
        </h1>

        <h2 className="text-xl font-semibold mb-4">
  Course Content
</h2>

<div className="space-y-3">
  <div className="bg-blue-100 p-3 rounded-xl">
    {course.courseName}
  </div>
</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">

        <h2 className="text-3xl font-bold text-blue-900 mb-6">
          {course.courseName}
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <div className="aspect-video mb-6">
            {
  course.videoLink &&
  (course.videoLink.includes("youtube") ||
   course.videoLink.includes("youtu.be")) ? (

    <iframe
      className="w-full h-full rounded-xl"
      src={course.videoLink.replace(
        "youtu.be/",
        "www.youtube.com/embed/"
      )}
      title={course.courseName}
      allowFullScreen
    ></iframe>

  ) : (

    <div className="flex items-center justify-center h-full text-gray-500 text-xl">
      No video available
    </div>

  )
}
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-4">
              Notes & Resources
            </h3>

            <ul className="list-disc ml-6 text-blue-700">
              <li>
                

  <a
    href={course.noteLink}
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline text-blue-700"
  >
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