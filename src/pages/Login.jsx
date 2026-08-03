import aiBg from "../assets/ai4.jpg";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";

import {
    collection,
    query,
    where,
    getDocs
} from "firebase/firestore";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = getAuth(app);
  const navigate = useNavigate();

  const handleLogin = async () => {

  try {

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const userEmail =
      userCredential.user.email;

    const studentQuery = query(
    collection(db, "students"),
    where("email", "==", userEmail)
);

const querySnapshot = await getDocs(studentQuery);

let studentData = null;

if (!querySnapshot.empty) {

    const studentDoc = querySnapshot.docs[0];

    studentData = {
        studentId: studentDoc.id,
        ...studentDoc.data(),
    };
    console.log("Student found:", studentData);

}

    if (!studentData) {

    await auth.signOut();

    alert("Student record not found.");

    return;
}

// Registration received but not approved
if (!studentData.approved) {

    await auth.signOut();

    alert(
        "Your registration has been received and is awaiting admin approval."
    );

    return;
}

// Approved but fee pending
if (studentData.status === "Fee Pending") {

    await auth.signOut();

    alert(
        "Your payment is pending verification. LMS access will be activated once your payment is verified."
    );

    return;
}

// Admitted but LMS not yet activated
if (
    studentData.status === "Admitted" &&
    !studentData.lmsAccess
) {

    await auth.signOut();

    alert(
        "Your admission has been completed. Your LMS account is currently being activated."
    );

    return;
}

// Active but LMS flag missing
if (
    studentData.status === "Active" &&
    !studentData.lmsAccess
) {

    await auth.signOut();

    alert(
        "Your LMS access has not yet been enabled. Please contact Synaptech Education."
    );

    return;
}

// Everything is correct

localStorage.setItem(
    "studentData",
    JSON.stringify(studentData)
);

navigate("/learning-hub");

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
          className="w-full bg-white text-black border border-gray-300 rounded-lg p-3 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          className="w-full bg-white text-black border border-gray-300 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
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