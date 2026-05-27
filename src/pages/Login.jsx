import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import app from "../firebase/firebaseConfig";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = getAuth(app);
  const navigate = useNavigate();

  const handleLogin = async () => {

    try {

      await signInWithEmailAndPassword(auth, email, password);

      alert("Login Successful");

      navigate("/dashboard");

    } catch (error) {

      alert(error.message);

    }

  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 px-4">

      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">

        <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-8">
          Student Login
        </h1>

        <input
          type="email"
          placeholder="Enter Email"
          className="w-full border border-gray-300 rounded-lg p-3 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg text-lg font-semibold transition duration-300"
        >
          Login
        </button>

      </div>

    </div>

  );

}