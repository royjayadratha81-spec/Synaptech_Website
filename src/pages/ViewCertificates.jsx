import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewCertificates() {

  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {

    const querySnapshot = await getDocs(
      collection(db, "certificates")
    );

    const data = querySnapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

    setCertificates(data);
  };

  const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
      "Delete this certificate?"
    );

    if (!confirmDelete) return;

    await deleteDoc(
      doc(db, "certificates", id)
    );

    fetchCertificates();
  };

  return (

    <div className="p-8">

      <h1 className="text-3xl font-bold mb-6">
        View Certificates
      </h1>

      <div className="space-y-4">

        {certificates.map((item) => (

          <div
            key={item.id}
            className="bg-white p-5 rounded-xl shadow"
          >

            <h2 className="font-bold text-xl">
              {item.studentName}
            </h2>

            <p>{item.studentEmail}</p>

            <p>{item.course}</p>

            <a
              href={item.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View Certificate
            </a>

            <br />

            <button
              onClick={() =>
                handleDelete(item.id)
              }
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Delete Certificate
            </button>

          </div>

        ))}

      </div>

    </div>

  );

}