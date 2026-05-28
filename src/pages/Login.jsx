import aiBg from "../assets/ai4.jpg";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase/firebaseConfig";

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

    <div
  className="min-h-screen flex items-center justify-center bg-cover bg-center px-6"
  style={{
    backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url(${aiBg})`,
  }}
>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-md text-white">

        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-white mb-4">
  Student Login
</h1>

<p className="text-center text-gray-300 mb-8">
  Access your AI & Data Science learning dashboard
</p>

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