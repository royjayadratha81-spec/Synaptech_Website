import { Link, useNavigate } from "react-router-dom";

import {
    FaHome,
    FaBook,
    FaVideo,
    FaClipboardList,
    FaChartLine,
    FaCertificate,
    FaUser,
    FaSignOutAlt,
    FaCalendarCheck,
    FaMoneyBillWave
} from "react-icons/fa";

import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export default function Sidebar({ student }) {

    const navigate = useNavigate();

    const logout = async () => {

        await signOut(auth);

        navigate("/login");

    };

    return (

        <div className="w-72 bg-gradient-to-b from-blue-800 to-blue-950 text-white min-h-screen p-6">

            <div className="flex flex-col items-center mb-10">

    <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || "Student")}&background=2563eb&color=fff&size=128`}
        alt="Student"
        className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
    />

    <h2 className="text-xl font-bold mt-4">

        {student?.name || "Student"}

    </h2>

    <p className="text-blue-200 text-sm text-center mt-1">

        {student?.course || "Synaptech Education"}

    </p>

</div>

            <div className="space-y-3">

                <Link
                    to="/learning-hub"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaHome />
                    Dashboard
                </Link>

                <Link
                    to="/courses"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaBook />
                    My Courses
                </Link>

                <Link
                    to="/modules"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaBook />
                    Course Modules
                </Link>

                <Link
                    to="/live-sessions"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaVideo />
                    Live Classes
                </Link>

                <Link
                    to="/assignments"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaClipboardList />
                    Assignments
                </Link>

                <Link
    to="/payment"
    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
>
    <FaMoneyBillWave />
    Payments
</Link>

                <Link
                    to="/analytics"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaChartLine />
                    Analytics
                </Link>

                <Link
                    to="/attendance"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaCalendarCheck />
                    Attendance
                </Link>

                <Link
                    to="/certificates"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaCertificate />
                    Certificates
                </Link>

                <Link
                    to="/profile"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700"
                >
                    <FaUser />
                    Profile
                </Link>

            </div>

            <button
                onClick={logout}
                className="mt-12 w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg flex items-center justify-center gap-3"
            >

                <FaSignOutAlt />

                Logout

            </button>

        </div>

    );

}