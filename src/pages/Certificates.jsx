import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Certificates() {

  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {

    const studentData = JSON.parse(
      localStorage.getItem("studentData")
    );

    const querySnapshot = await getDocs(
      collection(db, "certificates")
    );
    console.log(
  "Certificate Count:",
  querySnapshot.docs.length
);

    const data = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (item) =>
          item.studentEmail ===
          studentData?.email
      );
      console.log("Certificates:", data);

    setCertificates(data);
  };

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        My Certificates
      </h1>

      {certificates.length === 0 ? (

        <div className="bg-white p-6 rounded-xl shadow">
          No certificates available.
        </div>

      ) : (

        <div className="space-y-6">

          {certificates.map((item) => (

            <div
              key={item.id}
              className="bg-white p-6 rounded-xl shadow"
            >

              <h2 className="text-2xl font-bold">
                {item.certificateName}
              </h2>

              <p className="text-gray-600 mt-2">
                Course: {item.course}
              </p>

              <a
                href={item.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Download Certificate
              </a>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}