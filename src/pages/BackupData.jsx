import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function BackupData() {
  const [running, setRunning] = useState(false);
  const handleBackup = async () => {
  try {
    setRunning(true);

    const collections = [
      "students",
      "finance",
      "payments",
      "batches",
      "courses",
      "modules",
      "assignments",
      "liveSessions",
      "recordedSessions",
    ];

    const backup = {
      createdAt: new Date().toISOString(),
      collections: {},
    };

    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));

      backup.collections[collectionName] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Synaptech_Backup_${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert("Backup downloaded successfully.");
  } catch (error) {
    console.error(error);
    alert("Backup failed.");
  }

  setRunning(false);
};

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <div className="bg-white shadow-xl rounded-xl p-10 w-[500px]">

        <h1 className="text-3xl font-bold text-blue-700 mb-6">
          ERP Backup
        </h1>

        <p className="mb-6">
          Download a complete backup of all ERP collections before making major changes.
        </p>

        <button
  onClick={handleBackup}
  disabled={running}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
        >
          {running ? "Preparing Backup..." : "Download Backup"}
        </button>

      </div>
    </div>
  );
}