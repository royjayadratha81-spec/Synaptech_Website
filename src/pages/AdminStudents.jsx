import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

import Background from "../components/ui/Background";
import GlassCard from "../components/ui/GlassCard";
import AdmissionModal from "../components/AdmissionModal";
import { completeAdmission } from "../services/admissionService";

import {
  FaArrowLeft,
  FaUserGraduate,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaTrash,
  FaUserCheck,
  FaUserTimes,
} from "react-icons/fa";

export default function AdminStudents() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
const [selectedStudent, setSelectedStudent] = useState(null);

  const [approvedStudents, setApprovedStudents] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "students"));

      const studentList = [];

      querySnapshot.forEach((docItem) => {
        studentList.push({
    id: docItem.id,
    status: docItem.data().status || "Registered",
    ...docItem.data(),
});
      });

      setStudents(studentList);

      setApprovedStudents(
        studentList.filter((student) => student.approved).length
      );

      setPendingStudents(
        studentList.filter((student) => !student.approved).length
      );

      setLoading(false);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleApprove = async (studentId) => {
    try {
      await updateDoc(doc(db, "students", studentId), {
  approved: true,


  approvedAt: new Date().toLocaleString(),

  approvedBy: "Admin",
});

      alert("Student approved successfully.");

      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("Unable to approve student.");
    }
  };

  const handleDelete = async (studentId) => {
    const confirmDelete = window.confirm(
      "Delete this student permanently?"
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "students", studentId));

    fetchStudents();
  };

  /*
      IMPORTANT

      Your old Admin.jsx calls handleReject(student)
      but the actual function does not exist.

      For now we will simply show an alert.

      In Part 3 we'll implement the real rejection
      workflow with EmailJS.
  */

  const handleStatusChange = async (student, newStatus) => {

    if (newStatus === "Fee Pending") {
        setSelectedStudent(student);
        setShowAdmissionModal(true);
        return;
    }

    try {

        await updateDoc(doc(db, "students", student.id), {
            status: newStatus,
            updatedAt: new Date().toLocaleString(),
        });

        fetchStudents();

    } catch (error) {
        console.error(error);
        alert("Unable to update student status.");
    }

};
      const handleReject = (student) => {

    alert(
      `${student.name} rejection workflow will be added in Part 3.`
    );
  };

  const filteredStudents = students.filter((student) => {
    const value = search.toLowerCase();

    return (
      student.name?.toLowerCase().includes(value) ||
      student.email?.toLowerCase().includes(value) ||
      student.course?.toLowerCase().includes(value)
    );
  });

  return (
    <Background>

      <div className="min-h-screen px-12 py-10">

        <GlassCard className="max-w-[1450px] mx-auto p-8">

          {/* Header */}

          <div className="flex justify-between items-center mb-10">

            <div>

              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-md"
              >
                <FaArrowLeft />
                Back to Dashboard
              </button>

              <h1 className="text-4xl font-bold text-blue-800 mt-6">

                Student Management

              </h1>

              <p className="text-gray-600 mt-2">

                Manage registrations, approvals and student accounts.

              </p>

            </div>

          </div>
                    {/* Statistics */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 shadow-lg">

              <div className="flex justify-between items-center">

                <div>

                  <p className="text-blue-100">
                    Total Students
                  </p>

                  <h2 className="text-4xl font-bold mt-2">
                    {students.length}
                  </h2>

                </div>

                <FaUserGraduate className="text-5xl opacity-80" />

              </div>

            </div>

            <div className="bg-gradient-to-r from-green-600 to-green-800 text-white rounded-2xl p-6 shadow-lg">

              <div className="flex justify-between items-center">

                <div>

                  <p className="text-green-100">
                    Approved
                  </p>

                  <h2 className="text-4xl font-bold mt-2">
                    {approvedStudents}
                  </h2>

                </div>

                <FaCheckCircle className="text-5xl opacity-80" />

              </div>

            </div>

            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-lg">

              <div className="flex justify-between items-center">

                <div>

                  <p className="text-orange-100">
                    Pending
                  </p>

                  <h2 className="text-4xl font-bold mt-2">
                    {pendingStudents}
                  </h2>

                </div>

                <FaClock className="text-5xl opacity-80" />

              </div>

            </div>

          </div>

          {/* Search */}

          <div className="relative mb-8">

            <FaSearch className="absolute left-5 top-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search by Name, Email or Course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-14 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Table */}

          <div className="overflow-x-auto rounded-xl shadow">

            <table className="min-w-full bg-white">

              <thead className="bg-blue-700 text-white">

                <tr>

                  <th className="px-5 py-4 text-left">
                    Name
                  </th>

                  <th className="px-5 py-4 text-left">
                    Email
                  </th>

                  <th className="px-5 py-4 text-left">
                    Course
                  </th>

                  <th className="px-5 py-4 text-left">
                    Batch
                  </th>

                  <th className="px-5 py-4 text-left">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="text-center py-10"
                    >

                      Loading students...

                    </td>

                  </tr>

                ) : filteredStudents.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="text-center py-10"
                    >

                      No students found.

                    </td>

                  </tr>

                ) : (

                  filteredStudents.map((student) => (

                    <tr
                      key={student.id}
                      className="border-b hover:bg-gray-50"
                    >

                      <td className="px-5 py-4 font-semibold">
                        {student.name}
                      </td>

                      <td className="px-5 py-4">
                        {student.email}
                      </td>

                      <td className="px-5 py-4">
                        {student.course}
                      </td>

                      <td className="px-5 py-4">
                        {student.batchId || "Not Assigned"}
                      </td>

                      <td className="px-5 py-4">

                        <select
    value={student.status}
    onChange={(e) =>
    handleStatusChange(student, e.target.value)
}
    className="border rounded-lg px-3 py-2 bg-white"
>
    <option>Registered</option>
    <option>Counselling Scheduled</option>
    <option>Counselling Completed</option>
    <option>Admission Offered</option>
    <option>Fee Pending</option>
    <option>Admitted</option>
    <option>Active</option>
    <option>Completed</option>
    <option>Alumni</option>
</select>

                      </td>

                      <td className="px-5 py-4">

                        <div className="flex gap-2">
                                                  {!student.approved && (
                            <button
                              onClick={() => handleApprove(student.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                            >
                              <FaUserCheck />
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleReject(student)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                          >
                            <FaUserTimes />
                            Reject
                          </button>

                          <button
                            onClick={() => handleDelete(student.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                          >
                            <FaTrash />
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </GlassCard>

      </div>
      <AdmissionModal
    open={showAdmissionModal}
    student={selectedStudent}
    onClose={() => {
        setShowAdmissionModal(false);
        setSelectedStudent(null);
    }}
    onSave={async (data) => {

    try {

        await completeAdmission(
            selectedStudent,
            data
        );

        alert("Admission completed successfully.");

        setShowAdmissionModal(false);

        setSelectedStudent(null);

        fetchStudents();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}}
/>

    </Background>

  );
}
                        