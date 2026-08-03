import { FaBell, FaSearch } from "react-icons/fa";
import { getAuth } from "firebase/auth";

export default function Navbar() {

  const auth = getAuth();

  return (

    <div className="h-20 bg-white shadow-md px-8 flex justify-between items-center">

      {/* Left Side */}

      <div>

  <h1 className="text-3xl font-bold text-blue-700">
    Student Dashboard
  </h1>

</div>

      {/* Right Side */}

      <div className="flex items-center gap-6">

        {/* Search */}

        <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-4 py-2">

          <FaSearch className="text-gray-500 mr-2" />

          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none"
          />

        </div>

        {/* Notification */}

        <div className="relative cursor-pointer">

          <FaBell
            size={24}
            className="text-blue-700"
          />

          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
            3
          </span>

        </div>

        {/* Profile */}

        <div className="flex items-center gap-3">

          <img
            src={`https://ui-avatars.com/api/?name=${
              auth.currentUser?.email || "Student"
            }&background=2563eb&color=fff`}
            alt="profile"
            className="w-12 h-12 rounded-full"
          />

          <div>

            <p className="font-semibold">
              {auth.currentUser?.email}
            </p>

            <p className="text-sm text-gray-500">
              Student
            </p>

          </div>

        </div>

      </div>

    </div>

  );

}