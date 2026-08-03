export default function ProfileSummary({ studentData }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">

      <h2 className="text-2xl font-bold text-blue-700 border-b pb-4 mb-8">
        Profile Summary
      </h2>

      <div className="flex flex-col md:flex-row items-center gap-8">

        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
            studentData?.name || "Student"
          )}&background=2563eb&color=fff&size=256`}
          alt="Student"
          className="w-40 h-40 rounded-full border-4 border-blue-700 shadow-lg"
        />

        <div className="flex-1">

          <h2 className="text-3xl font-bold">
            {studentData?.name}
          </h2>

          <p className="text-gray-600 mt-2">
            {studentData?.course}
          </p>

          <p className="text-gray-600 mt-2">
            Batch :
            <span className="font-semibold ml-2">
              {studentData?.batchName || studentData?.batchId || "--"}
            </span>
          </p>

          <p className="text-gray-600 mt-2">
            Student ID :
            <span className="font-semibold ml-2">
              {studentData?.studentId || "--"}
            </span>
          </p>

          <span className="inline-block mt-5 bg-green-100 text-green-700 px-5 py-2 rounded-full font-semibold">
            Active Student
          </span>

        </div>

        <div className="w-full md:w-64">

          <p className="font-semibold text-gray-700 mb-3">
            Profile Completion
          </p>

          <div className="w-full bg-gray-200 rounded-full h-4">

            <div
              className="bg-blue-600 h-4 rounded-full"
              style={{ width: "35%" }}
            />

          </div>

          <p className="text-sm text-gray-500 mt-3">
            Complete your profile to unlock all student services.
          </p>

        </div>

      </div>

    </div>
  );
}