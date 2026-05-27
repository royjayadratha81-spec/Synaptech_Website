import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Courses() {

  const [courses, setCourses] = useState([]);

  useEffect(() => {

    const fetchCourses = async () => {

      const querySnapshot = await getDocs(
        collection(db, "courses")
      );

      const courseList = [];

      querySnapshot.forEach((doc) => {

        courseList.push({
          id: doc.id,
          ...doc.data(),
        });

      });

      setCourses(courseList);

    };

    fetchCourses();

  }, []);

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold text-blue-800 mb-10">
        My Courses
      </h1>

      <div className="grid md:grid-cols-3 gap-8">
        
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => (

  <div
  key={course.id}
  className="bg-white p-6 rounded-2xl shadow-lg"
>

    <h2 className="text-2xl font-bold mb-4">
      {course.courseName}
    </h2>

    <p className="text-gray-600 mb-6">
      Dynamic Firestore Course
    </p>

    <Link
      to={`/course/${course.id}`}
      className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl inline-block"
    >
      Open Course
    </Link>

  </div>

))}
</div>
</div>
</div>
);
}