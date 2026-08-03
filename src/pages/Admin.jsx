import Background from "../components/ui/Background";
import GlassCard from "../components/ui/GlassCard";
import StatsCard from "../components/StatsCard";
import {
  FaUserGraduate,
  FaCheckCircle,
  FaClock,
  FaBook,
  FaLayerGroup,
  FaClipboardList,
  FaQuestionCircle,
  FaFileAlt,
  FaChartBar,
  FaVideo,
  FaPlayCircle,
  FaMoneyCheckAlt,
  FaCertificate,
  FaAward,
  FaClipboardCheck,
  FaTools,
} from "react-icons/fa";
import QuickActionCard from "../components/QuickActionCard";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminEmail");

    navigate("/admin-login");

  };

  const [courseName, setCourseName] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [noteLink, setNoteLink] = useState("");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState(0);

  const [pendingStudents, setPendingStudents] = useState(0);

  const [totalCourses, setTotalCourses] = useState(0);
  const [selectedSection, setSelectedSection] = useState("");
  useEffect(() => {

    fetchCourses();
    fetchStudents();

  }, []);

  const fetchCourses = async () => {

    try {

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

      console.log("Courses Loaded:", courseList);

      setCourses(courseList);
      setTotalCourses(courseList.length);

    } catch (error) {

      console.error("fetchCourses Error:", error);

      alert(error.message);

    }

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
  const fetchStudents = async () => {

    try {

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

      console.log("Students Loaded:", studentList);

      setStudents(studentList);
      setApprovedStudents(
        studentList.filter(student => student.approved).length
      );

      setPendingStudents(
        studentList.filter(student => !student.approved).length
      );

    } catch (error) {

      console.error("fetchStudents Error:", error);

      alert(error.message);

    }

  };
  const handleApprove = async (studentId) => {

    try {

      const studentRef = doc(db, "students", studentId);

      await updateDoc(studentRef, {

        approved: true,

      });

      alert("Student approved successfully.");

      fetchStudents();

    } catch (error) {

      console.error(error);

      alert("Error approving student.");

    }

  };
  const hour = new Date().getHours();

  let greeting = "";

  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }
  return (

    <Background>

      <div className="min-h-screen px-12 py-10">

        <GlassCard className="max-w-[1400px] mx-auto p-8">

          <div className="mb-8">

            <div className="flex justify-between items-start mb-8">

              <div>

                <h1 className="text-4xl font-bold text-blue-800">
                  {greeting}, Admin 👋
                </h1>

                <p className="text-gray-600 mt-2 text-lg">
                  Welcome back to Synaptech Education LMS
                </p>

                <p className="text-gray-500 mt-1">
                  Admin Dashboard
                </p>

              </div>

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-md transition-all"
              >
                Logout
              </button>

            </div>

          </div>
          {/* Dashboard Statistics */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <StatsCard
              title="Students"
              value={students.length}
              color="text-blue-700"
              borderColor="border-blue-600"
              badge="Live Data"
              subtitle="Total Registered Students"
              icon={<FaUserGraduate />}
              iconBg="from-blue-500 to-blue-700"
              onClick={() => navigate("/admin/students")}
            />

            <StatsCard
              title="Approved"
              value={approvedStudents}
              color="text-green-700"
              borderColor="border-green-600"
              badge="Active"
              subtitle="Approved Students"
              icon={<FaCheckCircle />}
              iconBg="from-green-500 to-green-700"
              onClick={() => console.log("Approved Students")}
            />

            <StatsCard
              title="Pending"
              value={pendingStudents}
              color="text-yellow-600"
              borderColor="border-yellow-500"
              badge="Needs Review"
              subtitle="Awaiting Approval"
              icon={<FaClock />}
              iconBg="from-yellow-500 to-orange-500"
              onClick={() => console.log("Pending Students")}
            />

            <StatsCard
              title="Courses"
              value={totalCourses}
              color="text-purple-700"
              borderColor="border-purple-600"
              badge="Available"
              subtitle="Published Courses"
              icon={<FaBook />}
              iconBg="from-purple-500 to-purple-700"
              onClick={() => console.log("Courses")}
            />
          </div>

          <h2 className="text-xl font-bold text-blue-700 mt-8 mb-4">
            Academic Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

            <QuickActionCard
              title="Create Batch"
              description="Create a new student batch for upcoming courses."
              icon={<FaLayerGroup />}
              iconBg="from-indigo-500 to-indigo-700"
              cardBg="from-indigo-50 via-white to-blue-100"
              onClick={() => navigate("/create-batch")}
            />

            <QuickActionCard
              title="Assign Batch"
              description="Assign students to an existing batch."
              icon={<FaUserGraduate />}
              iconBg="from-green-500 to-green-700"
              cardBg="from-green-50 via-white to-green-100"
              onClick={() => navigate("/assign-batch")}
            />

            <QuickActionCard
              title="Upload Course Material"
              description="Upload PDFs, PPTs, notes and other learning resources."
              icon={<FaBook />}
              iconBg="from-purple-500 to-purple-700"
              cardBg="from-purple-50 via-white to-purple-100"
              onClick={() => navigate("/upload-course-material")}
            />
          </div>
          <h2 className="text-xl font-bold text-purple-700 mt-8 mb-4">
            Assessments
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">

            <QuickActionCard
              title="Create Assignment"
              description="Create assignments for students."
              icon={<FaClipboardList />}
              iconBg="from-orange-500 to-orange-700"
              cardBg="from-orange-50 via-white to-orange-100"
              onClick={() => navigate("/create-assignment")}
            />

            <QuickActionCard
              title="Create MCQ Test"
              description="Design and publish MCQ tests."
              icon={<FaQuestionCircle />}
              iconBg="from-purple-500 to-purple-700"
              cardBg="from-purple-50 via-white to-purple-100"
              onClick={() => navigate("/create-mcq-test")}
            />

            <QuickActionCard
              title="View Submissions"
              description="Review student assignment submissions."
              icon={<FaFileAlt />}
              iconBg="from-blue-500 to-blue-700"
              cardBg="from-blue-50 via-white to-blue-100"
              onClick={() => navigate("/view-submissions")}
            />

            <QuickActionCard
              title="View MCQ Results"
              description="View MCQ test scores and analytics."
              icon={<FaChartBar />}
              iconBg="from-green-500 to-green-700"
              cardBg="from-green-50 via-white to-green-100"
              onClick={() => navigate("/view-mcq-results")}
            />
          </div>

          <h2 className="text-xl font-bold text-green-700 mt-8 mb-4">
            Learning Content
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">

            <QuickActionCard
              title="Create Live Session"
              description="Schedule live online classes."
              icon={<FaVideo />}
              iconBg="from-green-500 to-green-700"
              cardBg="from-green-50 via-white to-green-100"
              onClick={() => navigate("/create-live-session")}
            />

            <QuickActionCard
              title="Create Recording"
              description="Upload recorded class sessions."
              icon={<FaPlayCircle />}
              iconBg="from-purple-500 to-purple-700"
              cardBg="from-purple-50 via-white to-purple-100"
              onClick={() => navigate("/create-recording")}
            />

          </div>

          <h2 className="text-xl font-bold text-green-700 mt-8 mb-4">
            Finance & Certificates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

            <QuickActionCard
              title="View Payments"
              description="Review student payment records."
              icon={<FaMoneyCheckAlt />}
              iconBg="from-green-500 to-green-700"
              cardBg="from-green-50 via-white to-green-100"
              onClick={() => navigate("/view-payments")}
            />

            <QuickActionCard
              title="Upload Certificate"
              description="Generate and upload certificates."
              icon={<FaCertificate />}
              iconBg="from-blue-500 to-blue-700"
              cardBg="from-blue-50 via-white to-blue-100"
              onClick={() => navigate("/create-certificate")}
            />

            <QuickActionCard
              title="View Certificates"
              description="Browse all issued certificates."
              icon={<FaAward />}
              iconBg="from-red-500 to-red-700"
              cardBg="from-red-50 via-white to-red-100"
              onClick={() => navigate("/view-certificates")}
            />

          </div>

          <h2 className="text-xl font-bold text-indigo-700 mt-8 mb-4">
            Operations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">

            <QuickActionCard
              title="Attendance"
              description="Track and manage attendance."
              icon={<FaClipboardCheck />}
              iconBg="from-indigo-500 to-indigo-700"
              cardBg="from-indigo-50 via-white to-indigo-100"
              onClick={() => navigate("/attendance")}
            />

          </div>

          <h2 className="text-xl font-bold text-red-700 mt-8 mb-4">
            System Maintenance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">

            <QuickActionCard
              title="Initialize Analytics"
              description="Repair or create analytics data."
              icon={<FaTools />}
              iconBg="from-red-500 to-red-700"
              cardBg="from-red-50 via-white to-red-100"
              onClick={() => navigate("/initialize-analytics")}
            />

          </div>

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
          

    </GlassCard>

    </div>
  </Background>

  );
}