import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import banner from "../assets/dashboard-bg.jpg";

export default function WelcomeCard() {
  const [student, setStudent] = useState(null);

useEffect(() => {

    const fetchStudent = async () => {

        if (!auth.currentUser) return;

        const docRef = doc(db, "students", auth.currentUser.uid);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
    setStudent(docSnap.data());
}

    };

    fetchStudent();

}, []);
const hour = new Date().getHours();

let greeting = "Good Evening";

if (hour < 12) {

    greeting = "Good Morning";

}
else if (hour < 17) {

    greeting = "Good Afternoon";

}

  const today = new Date();

  return (

    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl text-white overflow-hidden shadow-xl">

      <div className="flex justify-between items-center p-10">

        <div>

          <h1 className="text-4xl font-bold mb-3">
            {greeting}, {student?.name || "Student"} 👋
          </h1>

          <p className="text-lg opacity-90">
            {student?.course}
          </p>
          <p className="text-blue-100 mt-2">
  Batch: {student?.batchId || "Not Assigned"}
</p>

          <p className="mt-4 text-blue-100">
            Today: {today.toDateString()}
          </p>

        </div>

        <img
          src={banner}
          alt="Dashboard Banner"
          className="w-72 hidden lg:block"
        />

      </div>

    </div>

  );

}