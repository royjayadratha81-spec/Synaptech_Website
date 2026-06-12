import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";
export default function CreateCertificate() {

  const [studentEmail, setStudentEmail] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [course, setCourse] =
    useState("");

  const [certificateName, setCertificateName] =
    useState("");

  const [certificateFile, setCertificateFile] =
    useState(null);
    const handleUpload = async () => {

  if (!certificateFile) {
    alert("Please select certificate PDF");
    return;
  }

  try {

    const fileName =
      `${Date.now()}-${certificateFile.name}`;

    const { error } =
      await supabase.storage
        .from("certificates")
        .upload(
          fileName,
          certificateFile
        );

    if (error) {
      console.error(error);
      alert("Upload Failed");
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("certificates")
        .getPublicUrl(fileName);

    const certificateUrl =
      publicUrlData.publicUrl;

    await addDoc(
      collection(db, "certificates"),
      {
        studentName,
        studentEmail,
        course,
        certificateName,
        certificateUrl,
        issuedAt:
          new Date().toLocaleString(),
      }
    );

    alert(
      "Certificate Uploaded Successfully"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Certificate Upload Failed"
    );

  }

};
return (

  <div className="min-h-screen bg-gray-100 p-8">

    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">

      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        Upload Certificate
      </h1>

      <input
        type="text"
        placeholder="Student Name"
        className="w-full border p-3 rounded-lg mb-4"
        onChange={(e) =>
          setStudentName(e.target.value)
        }
      />

      <input
        type="email"
        placeholder="Student Email"
        className="w-full border p-3 rounded-lg mb-4"
        onChange={(e) =>
          setStudentEmail(e.target.value)
        }
      />

      <input
        type="text"
        placeholder="Course"
        className="w-full border p-3 rounded-lg mb-4"
        onChange={(e) =>
          setCourse(e.target.value)
        }
      />

      <input
        type="text"
        placeholder="Certificate Name"
        className="w-full border p-3 rounded-lg mb-4"
        onChange={(e) =>
          setCertificateName(e.target.value)
        }
      />

      <input
        type="file"
        accept=".pdf"
        className="w-full border p-3 rounded-lg mb-6"
        onChange={(e) =>
          setCertificateFile(
            e.target.files[0]
          )
        }
      />

      <button
        onClick={handleUpload}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
      >
        Upload Certificate
      </button>

    </div>

  </div>

);
}