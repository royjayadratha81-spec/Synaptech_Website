import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";

export default function Assignments() {

  const [selectedFile, setSelectedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  useEffect(() => {
  const fetchAssignments = async () => {
    const querySnapshot = await getDocs(
      collection(db, "assignments")
    );

    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setAssignments(data);
  };

  fetchAssignments();
}, []);

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedFile) {
    alert("Please select a file");
    return;
  }

  try {

    const fileName =
      `${Date.now()}-${selectedFile.name}`;

    const { error } =
      await supabase.storage
        .from("assignments")
        .upload(fileName, selectedFile);

    if (error) {
      console.error(error);
      alert("Upload Failed");
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("assignments")
        .getPublicUrl(fileName);

    const fileUrl =
      publicUrlData.publicUrl;

    await addDoc(
      collection(db, "submissions"),
      {
        fileName: selectedFile.name,
        fileUrl: fileUrl,
        submittedAt:
          new Date().toLocaleString(),
        status: "Submitted",
      }
    );

    const newSubmission = {
      fileName: selectedFile.name,
      date: new Date().toLocaleString(),
      status: "Submitted",
    };

    setSubmissions([
      ...submissions,
      newSubmission,
    ]);

    setSubmitted(true);

    alert("Assignment Submitted Successfully");

  } catch (error) {

    console.error(error);
    alert("Submission Failed");

  }
};

  return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">

    <div className="max-w-4xl mx-auto">

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="bg-blue-800 text-white p-8">
          <h1 className="text-4xl font-bold">
            Assignment Submission
          </h1>

          <p className="mt-2 text-blue-100">
            Upload and submit your course assignments
          </p>
        </div>

        <div className="p-10">

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">

           {assignments.map((assignment) => (

  <div
    key={assignment.id}
    className="mb-8 border-b pb-6"
  >

    <h2 className="text-3xl font-bold text-gray-800 mb-3">
      {assignment.title}
    </h2>

    <p className="text-gray-600 text-lg mb-3">
      {assignment.description}
    </p>

    <p className="text-red-600 font-semibold mb-4">
      Due Date: {assignment.dueDate}
    </p>

    {assignment.fileUrl && (
      <a
        href={assignment.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg mr-3"
      >
        📥 Open Assignment
      </a>
    )}

    {assignment.assignmentFileUrl && (
      <a
        href={assignment.assignmentFileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
      >
        📄 Download Assignment File
      </a>
    )}

  </div>

))}

            <form onSubmit={handleSubmit}>

              <div className="mb-8">

                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Assignment File
                </label>
                <p className="text-gray-600 mb-3">
  Accepted formats: .ipynb, .pdf, .doc, .docx, .xls, .xlsx, .csv, .py, .jpg, .jpeg, .png
</p>

                <input
  type="file"
  accept=".ipynb,.pdf,.doc,.docx,.xls,.xlsx,.csv,.py,.jpg,.jpeg,.png"
  className="w-full border-2 border-dashed border-blue-300 bg-white p-6 rounded-2xl cursor-pointer hover:border-blue-500 transition"
  onChange={(e) => setSelectedFile(e.target.files[0])}
/>

              </div>

              {selectedFile && (
                <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <p className="text-blue-800 font-medium">
                    Selected File: {selectedFile.name}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition shadow-lg"
              >
                Submit Assignment
              </button>

            </form>

            {submitted && (
              <div className="mt-8 bg-green-100 border border-green-300 text-green-800 p-5 rounded-2xl text-lg font-semibold">
                ✅ Assignment submitted successfully
              </div>
            )}
{submissions.length > 0 && (

  <div className="mt-10">

    <h3 className="text-2xl font-bold mb-5 text-gray-800">
      Submission History
    </h3>

    <div className="space-y-4">

      {submissions.map((item, index) => (

        <div
          key={index}
          className="bg-white border border-gray-200 shadow-md rounded-2xl p-5"
        >

          <p className="text-lg font-semibold text-blue-800">
            {item.fileName}
          </p>

          <p className="text-gray-600 mt-1">
            Submitted on: {item.date}
          </p>

          <p className="mt-2 inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-semibold">
            {item.status}
          </p>

        </div>

      ))}

    </div>

  </div>

)}
          </div>

        </div>

      </div>

    </div>

  </div>
);
}