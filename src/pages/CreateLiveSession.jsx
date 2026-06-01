import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function CreateLiveSession() {

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetLink, setMeetLink] = useState("");

  const handleSubmit = async () => {

    try {

      await addDoc(
        collection(db, "liveSessions"),
        {
          title,
          date,
          time,
          meetLink,
          active: true,
        }
      );

      alert("Live Session Created");

      setTitle("");
      setDate("");
      setTime("");
      setMeetLink("");

    } catch (error) {

      console.error(error);
      alert("Error creating session");

    }

  };

  return (

    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Create Live Session
      </h1>

      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl">

        <input
          type="text"
          placeholder="Session Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  className="w-full border p-3 rounded-lg mb-4"
/>

        <input
  type="time"
  value={time}
  onChange={(e) => setTime(e.target.value)}
  className="w-full border p-3 rounded-lg mb-4"
/>

        <input
          type="text"
          placeholder="Google Meet Link"
          value={meetLink}
          onChange={(e) => setMeetLink(e.target.value)}
          className="w-full border p-3 rounded-lg mb-6"
        />

        <button
          onClick={handleSubmit}
          className="bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          Create Session
        </button>

      </div>

    </div>

  );
}