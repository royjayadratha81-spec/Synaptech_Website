export default function Dashboard() {

  return (

    <div className="min-h-screen bg-gray-100">

      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">

        <h1 className="text-2xl font-bold">
          Synaptech Student Portal
        </h1>

        <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg">
          Logout
        </button>

      </nav>

      <div className="p-6">

        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Welcome Student 👋
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-3 text-blue-800">
              My Courses
            </h3>
            <p className="text-gray-600">
              Access your enrolled courses.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-3 text-green-700">
              Assignments
            </h3>
            <p className="text-gray-600">
              Submit and track assignments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-3 text-purple-700">
              Certificates
            </h3>
            <p className="text-gray-600">
              Download completion certificates.
            </p>
          </div>

        </div>

      </div>

    </div>

  );

}