export default function AccountStatus({ studentData }) {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 mt-8">

      <h3 className="text-xl font-bold text-blue-700 mb-5">
        Account Status
      </h3>

      <div className="grid md:grid-cols-3 gap-6">

        <div>
          <p className="text-gray-500">
            Overall Status
          </p>

          <p className="font-bold text-lg">
            {studentData?.status || "--"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Payment Status
          </p>

          <p className="font-bold text-lg">
            {studentData?.paymentStatus || "--"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            LMS Access
          </p>

          <p className="font-bold text-lg text-green-600">
            {studentData?.lmsAccess ? "Enabled" : "Disabled"}
          </p>
        </div>

      </div>

    </div>
  );
}