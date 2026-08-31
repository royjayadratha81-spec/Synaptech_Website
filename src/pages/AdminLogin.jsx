import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {

    try {

      
      const adminRef = doc(db, "admins", email);

      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {

        setError("Admin not found.");
        return;

      }

      const adminData = adminSnap.data();

      if (adminData.password !== password) {
    setError("Invalid password.");
    return;
}

      const auth = getAuth();

try {
    await signInWithEmailAndPassword(auth, email, password);
} catch (authError) {
    console.error("Admin Firebase authentication failed:", authError);
    setError(
        "Admin account verification failed in Firebase Authentication."
    );
    return;
}

      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("adminEmail", email);

      navigate("/admin");

    }

    catch (error) {

      console.error(error);

      setError("Login Failed");

    }

  };

  return (

    <div className="min-h-screen flex justify-center items-center bg-gray-100">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">

        <h1 className="text-3xl font-bold text-center mb-6">

          Admin Login

        </h1>

        <input
          type="email"
          placeholder="Admin Email"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-700 text-white py-3 rounded-lg"
        >
          Login
        </button>

      </div>

    </div>

  );

}