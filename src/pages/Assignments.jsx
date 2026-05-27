import { useState } from "react";

export default function Assignments() {

  const [selectedFile, setSelectedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    const newSubmission = {
  fileName: selectedFile.name,
  date: new Date().toLocaleString(),
  status: "Submitted",
};

setSubmissions([...submissions, newSubmission]);
setSubmitted(true);
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

            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Python Assignment 1
            </h2>

            <p className="text-gray-600 mb-8 text-lg">
              Submit your assignment in PDF, DOCX, or image format.
            </p>

            <form onSubmit={handleSubmit}>

              <div className="mb-8">

                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Assignment File
                </label>

                <input
                  type="file"
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