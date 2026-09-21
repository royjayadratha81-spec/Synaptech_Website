import { useState } from "react";
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const auth = getAuth(app);
  const navigate = useNavigate();

  const handleLogin = async () => {

  try {
    setBusy(true);
    setMessage("");

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
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

  } finally {
    setBusy(false);
  }

};

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setMessage("Enter your registered LMS email first."); return; }
    try {
      setBusy(true); setMessage("");
      await sendPasswordResetEmail(auth, normalizedEmail);
      setMessage("A secure password setup/reset link has been sent. Please check Inbox, Spam and Promotions.");
    } catch (error) {
      console.error(error);
      setMessage("The link could not be sent. Confirm your registered LMS email or activate your account first.");
    } finally { setBusy(false); }
  };

  return (

    <div className="relative min-h-screen overflow-hidden bg-[#f5f8f1] px-6 py-14 text-slate-900">

      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-lime-200/60 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center">

      <div className="w-full max-w-lg rounded-[32px] border border-emerald-950/10 bg-white/90 p-8 shadow-[0_30px_90px_rgba(6,78,59,.14)] backdrop-blur-xl sm:p-11">

        <p className="mb-4 text-center text-sm font-black uppercase tracking-[.2em] text-emerald-700">Synaptech student LMS</p>
        <h1 className="mb-4 text-center text-4xl font-black tracking-[-.04em] text-slate-950 md:text-5xl">
  Student Login
</h1>

<p className="mb-8 text-center text-lg leading-7 text-slate-600">
  Access your AI & Data Science learning dashboard
</p>

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          className="mb-5 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          className="mb-6 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="button" disabled={busy} onClick={handlePasswordReset} className="mb-5 w-full text-right text-base font-bold text-emerald-700 hover:text-emerald-900 hover:underline disabled:opacity-50">Set or forgot your password?</button>
        {message && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{message}</div>}

        <button
          onClick={handleLogin}
          disabled={busy || !email.trim() || !password}
          className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Login"}
        </button>

        <a href="/lms" className="mt-6 block text-center text-base font-bold text-slate-600 hover:text-emerald-800">← Back to LMS information</a>

      </div>

      </div>

    </div>

  );

}
