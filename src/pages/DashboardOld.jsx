import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import Progress from "./Progress";
import Profile from "./Profile";
import { Link } from "react-router-dom";
import dashboardBg from "../assets/dashboard-bg.jpg";
export default function Dashboard() {
  const navigate = useNavigate();
  const studentData = JSON.parse(
  localStorage.getItem("studentData")
);

const studentName =
  studentData?.name || "Student";

const studentCourse =
  studentData?.course || "";
  
  const handleLogout = async () => {
  await signOut(auth);
  navigate("/");
};

  return (

    <div
  className="min-h-screen bg-cover bg-center bg-fixed"
  style={{
    backgroundImage: `url(${dashboardBg})`,
  }}
>
  <div className="min-h-screen bg-white/70 backdrop-blur-sm">

      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">

        <h1 className="text-2xl font-bold">
          Synaptech Student Portal
        </h1>

        <button
  onClick={handleLogout}
  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
>
  Logout
</button>

      </nav>

      <div className="p-6">

        <div className="bg-white/80 rounded-2xl p-6 shadow-lg mb-6">

  <h2 className="text-3xl font-bold text-blue-900">
    Welcome, {studentName} 👋
  </h2>

  <p className="text-lg text-gray-700 mt-2">
    {studentCourse}
  </p>

</div>
        <div className="mb-10">
  <Profile />
  
</div>
<div className="mb-10">
  <Progress />
</div>

         <div className="grid md:grid-cols-3 gap-8 items-stretch">

          

<Link to="/modules">
  <div className="bg-white p-6 rounded-2xl shadow-lg h-full hover:shadow-xl cursor-pointer transition">

    <h3 className="text-xl font-bold mb-3 text-indigo-700">
      Course Modules
    </h3>

    <p className="text-gray-600">
      Access Python, NumPy, Pandas, Machine Learning, Generative AI and other learning modules.
    </p>

  </div>
</Link>

          <div className="bg-white p-6 rounded-2xl shadow-lg h-full">
            <h3 className="text-xl font-bold mb-3 text-purple-700">
  Certificates
</h3>

<p className="text-gray-600 mb-4">
  Download completion certificates.
</p>

<Link
  to="/certificates"
  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-semibold"
>
  View Certificates
</Link>
          </div>
          <Link to="/analytics">
  <div className="bg-white p-6 rounded-2xl shadow-lg h-full hover:shadow-xl cursor-pointer transition">

    <h3 className="text-xl font-bold mb-3 text-green-700">
      My Analytics
    </h3>

    <p className="text-gray-600">
      View MCQ performance, test attempts and learning progress.
    </p>

  </div>
</Link>

        </div>

      </div>

    </div>
  </div>

  );

}