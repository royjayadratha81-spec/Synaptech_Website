import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function Admin() {

  const [courseName, setCourseName] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [noteLink, setNoteLink] = useState("");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  useEffect(() => {

  fetchCourses();
  fetchStudents();

}, []);

const fetchCourses = async () => {

  
  const querySnapshot = await getDocs(
    collection(db, "courses")
  );

  const courseList = [];

  querySnapshot.forEach((docItem) => {

    courseList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  setCourses(courseList);

};
const fetchStudents = async () => {

  const querySnapshot = await getDocs(
    collection(db, "students")
  );

  const studentList = [];

  querySnapshot.forEach((docItem) => {

    studentList.push({
      id: docItem.id,
      ...docItem.data(),
    });

  });

  setStudents(studentList);

};
const handleApprove = async (id) => {

  await updateDoc(doc(db, "students", id), {
    approved: true,
  });

  fetchStudents();

};
const handleDeleteStudent = async (id) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this student?"
  );

  if (!confirmDelete) return;

  await deleteDoc(doc(db, "students", id));

  fetchStudents();

};
const handleDelete = async (id) => {

  await deleteDoc(doc(db, "courses", id));

  fetchCourses();

};

  const handleSubmit = async (e) => {
    

  e.preventDefault();

  try {

    await addDoc(collection(db, "courses"), {

      courseName,
      videoLink,
      noteLink,
      createdAt: new Date(),

    });

    alert("Course Added Successfully");
    fetchCourses();

    setCourseName("");
    setVideoLink("");
    setNoteLink("");

  } catch (error) {

    console.log(error);

    alert("Error adding course");

  }

};

  return (

    <div className="min-h-screen bg-gray-100 p-10">

      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl">

        <h1 className="text-4xl font-bold text-blue-800 mb-8">
          Admin Panel
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>

            <label className="block text-lg font-semibold mb-2">
              Course Name
            </label>

            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-4"
              placeholder="Enter Course Name"
              required
            />

          </div>

          <div>

            <label className="block text-lg font-semibold mb-2">
              Video Link
            </label>

            <input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-4"
              placeholder="Paste YouTube Embed Link"
              required
            />

          </div>

          <div>

            <label className="block text-lg font-semibold mb-2">
              Notes Link
            </label>

            <input
              type="text"
              value={noteLink}
              onChange={(e) => setNoteLink(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-4"
              placeholder="Paste Notes PDF Link"
              required
            />

          </div>

          <button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-xl text-lg font-semibold"
          >
            Add Course
          </button>

        </form>


<h2>All Courses</h2>

{courses.map((course) => (
  <div
    key={course.id}
    style={{
      border: "1px solid gray",
      padding: "10px",
      marginBottom: "10px",
    }}
  >
    <h3>{course.courseName}</h3>

    <a href={course.videoLink} target="_blank">
      Video Link
    </a>

    <br />

    <a href={course.noteLink} target="_blank">
      Notes Link
    </a>

    <br />
    <br />

    <button onClick={() => handleDelete(course.id)}>
      Delete Course
    </button>

  </div>
))}
<h2 className="text-3xl font-bold mt-10 mb-5">
  Registered Students
</h2>

{students.map((student) => (
  <div
    key={student.id}
    style={{
      border: "1px solid #ccc",
      padding: "10px",
      marginBottom: "10px",
    }}
  >
    <h3>{student.name}</h3>

    <p>Email: {student.email}</p>

    <p>Course: {student.course}</p>

    <p>
      Status:
      {student.approved ? " Approved" : " Pending"}
    </p>

    {!student.approved && (
  <>
    <button
      onClick={() => handleApprove(student.id)}
    >
      Approve Student
    </button>

    <button
      onClick={() => handleDeleteStudent(student.id)}
      style={{
        marginLeft: "10px",
        background: "red",
        color: "white",
        border: "none",
        padding: "5px 10px",
        cursor: "pointer",
      }}
    >
      Delete Student
    </button>
  

</>

)}

</div>
))}



      </div>

    </div>

  );
}