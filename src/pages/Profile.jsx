import { getAuth } from "firebase/auth";

export default function Profile() {

  const auth = getAuth();
  const user = auth.currentUser;

  return (

    <div className="bg-white p-6 rounded-2xl shadow-lg">

      <h2 className="text-2xl font-bold text-blue-800 mb-4">
        Student Profile
      </h2>

      <div className="space-y-3">

        <p className="text-lg">
          <span className="font-semibold">Email:</span>{" "}
          {user?.email}
        </p>

        <p className="text-lg">
          <span className="font-semibold">Enrolled Courses:</span>{" "}
          3
        </p>

      </div>

    </div>

  );
}