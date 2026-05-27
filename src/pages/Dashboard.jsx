import Progress from "./Progress";
import Profile from "./Profile";
import { Link } from "react-router-dom";
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
        <div className="mb-10">
  <Profile />
</div>
<div className="mb-10">
  <Progress />
</div>

         <div className="grid md:grid-cols-3 gap-8 items-stretch">

          <Link to="/courses">

  <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer h-full">

    <h3 className="text-xl font-bold mb-3 text-blue-800">
      My Courses
    </h3>

    <p className="text-gray-600">
      Access your enrolled courses.
    </p>

  </div>

</Link>

          <div className="bg-white p-6 rounded-2xl shadow-lg h-full">
            <h3 className="text-xl font-bold mb-3 text-green-700">
              Assignments
            </h3>
            <p className="text-gray-600">
              Submit and track assignments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg h-full">
            <h3 className="text-xl font-bold mb-3 text-purple-700">
  Certificates
</h3>

<p className="text-gray-600 mb-4">
  Download completion certificates.
</p>

<a
  href="/certificates/ds-certificate.pdf"
  target="_blank"
  rel="noreferrer"
  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-semibold"
>
  Download Certificate
</a>
          </div>

        </div>

      </div>

    </div>

  );

}