import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase/firebaseConfig";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import aiBg from "../assets/ai3.jpg";
import emailjs from "@emailjs/browser";

export default function Register() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [course, setCourse] = useState("");

  const auth = getAuth(app);
  const db = getFirestore(app);
  const navigate = useNavigate();

  const handleRegister = async () => {

    try {

      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;

await setDoc(doc(db, "students", user.uid), {
  name,
  email,
  phone,
  course,
  approved: false,
  createdAt: new Date(),
});
await emailjs.send(
  "service_5vgn1e4",
  "template_btlsdzj",
  {
    name: name,
    course: course,
    email: email,
  },
  "rdTcDeBnoocEPDQkn"
);

      alert("Registration Successful");

      navigate("/dashboard");

    } catch (error) {

      console.log(error);

  alert(JSON.stringify(error));

    }

  };

  return (

    <div
  className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-12"
  style={{
    backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url(${aiBg})`,
  }}
>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-2xl text-white">

        <h1 className="text-4xl font-bold text-center mb-3">
  Student Enrollment Portal
</h1>

<p className="text-center text-gray-300 mb-8">
  Register for Data Science with Generative AI & Agentic AI
</p>

<input
  type="text"
  placeholder="Full Name"
  className="w-full p-4 rounded-xl bg-white/20 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
  onChange={(e) => setName(e.target.value)}
/>

<input
  type="text"
  placeholder="Phone Number"
  className="w-full p-4 rounded-xl bg-white/20 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
  onChange={(e) => setPhone(e.target.value)}
/>

<select
  className="w-full p-4 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
  onChange={(e) => setCourse(e.target.value)}
>

  <option value="">Select Course</option>

  <option value="Data Science with Generative AI & Agentic AI">
    Data Science with Generative AI & Agentic AI
  </option>
  <option value="Data Science">
  Data Science
</option>

  <option value="Data Analytics">
    Data Analytics
  </option>

</select>
        <input
          type="email"
          placeholder="Enter Email"
          className="w-full p-4 rounded-xl bg-white/20 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          className="w-full p-4 rounded-xl bg-white/20 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
  onClick={handleRegister}
  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-lg font-semibold transition duration-300 shadow-lg mt-6"
>
  Register Now
</button>

      </div>

    </div>

  );

}