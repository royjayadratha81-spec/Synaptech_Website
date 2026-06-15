import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";

export default function LiveSessions() {
    const [recordings, setRecordings] = useState([]);
    useEffect(() => {

  const fetchRecordings = async () => {

    const snapshot = await getDocs(
      collection(db, "recordedSessions")
    );

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setRecordings(data);

  };

  fetchRecordings();

}, []);

  const [sessions, setSessions] = useState([]);
  const [studentBatch, setStudentBatch] = useState("");
  useEffect(() => {

  fetchStudentBatch();

}, []);

const fetchStudentBatch = async () => {

  const user = auth.currentUser;

  if (!user) return;

  const q = query(
    collection(db, "students"),
    where("email", "==", user.email)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {

    const studentData =
      snapshot.docs[0].data();

    setStudentBatch(
      studentData.batchId || ""
    );

  }

};
  useEffect(() => {

    const fetchSessions = async () => {

      const querySnapshot = await getDocs(
        collection(db, "liveSessions")
      );
      

      const sessionList = [];

      querySnapshot.forEach((doc) => {

        sessionList.push({
          id: doc.id,
          ...doc.data(),
        });

      });

      setSessions(
  sessionList.filter(
    (session) =>
      session.batchId === studentBatch
  )
);

    };

    fetchSessions();

  }, [studentBatch]);

  return (

    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Live Sessions
      </h1>
      <p className="mb-4 text-green-700 font-bold">
  Batch: {studentBatch}
</p>

      <div className="space-y-8">

        {sessions.map((session) => (

          <div
            key={session.id}
            className="bg-white p-8 rounded-2xl shadow-lg"
          >

            <h2 className="text-2xl font-bold text-blue-800 mb-4">
              {session.title}
            </h2>

            <p className="text-lg mb-2">
              Date: {session.date}
            </p>

            <p className="text-lg mb-4">
              Time: {session.time}
            </p>

            <a
              href={session.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
            >
              Join Live Session
            </a>

          </div>

        ))}

       </div>

      {/* Recorded Sessions */}

      <h1 className="text-4xl font-bold text-blue-900 mt-16 mb-10">
        Recorded Sessions
      </h1>

      <div className="grid md:grid-cols-2 gap-8">

        {recordings.map((video) => (

          <div
            key={video.id}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >

            <h2 className="text-xl font-bold text-blue-800 mb-4">
              {video.title}
            </h2>

            <p className="text-gray-600 mb-2">
  Platform: {video.platform}
</p>

<p className="text-gray-600 mb-4">
  Duration: {video.duration}
</p>

<a
  href={video.videoLink}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
>
  Watch Recording
</a>

          </div>

        ))}

      </div>

    </div>

  );
}