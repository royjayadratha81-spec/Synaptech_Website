import aiHero from "../assets/hero-bg.jpg";
import aiGraphic from "../assets/ai3.jpg";
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

    <div
  className="min-h-screen bg-cover bg-center px-6 py-16"
  style={{
    backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url(${aiHero})`,
  }}
>

      <h1 className="text-4xl font-bold text-blue-800 mb-10">
        My Courses
      </h1>

        
<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

  {courses.map((course) => (

    <div
      key={course.id}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl hover:scale-105 transition duration-300 text-white"
    >

      <img
        src={aiGraphic}
        alt="AI Graphic"
        className="w-full h-48 object-cover rounded-2xl mb-6"
      />

      <h2 className="text-3xl font-bold mb-4 text-white">
        {course.courseName}
      </h2>

      <p className="text-gray-300 text-lg mb-6">
        Dynamic Firestore Course
      </p>

      <Link
        to={`/course/${course.id}`}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-lg font-semibold transition shadow-xl inline-block"
      >
        Open Course
      </Link>

    </div>

  ))}

</div>
        
</div>
);
}