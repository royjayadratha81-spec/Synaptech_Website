import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import PersonalProfile from "../components/profile/PersonalProfile";
import AccountInformation from "../components/profile/AccountInformation";
import ProfileSummary from "../components/profile/ProfileSummary";
import AccountStatus from "../components/profile/AccountStatus";
import toast from "react-hot-toast";
import { supabase } from "../supabase/supabase";
import AIBackground from "../components/ui/AIBackground";
import StudentQuickStats from "../components/profile/StudentQuickStats";
import StudentIDCard from "../components/idcard/StudentIDCard";
import DownloadIDCard from "../components/idcard/DownloadIDCard";

export default function Profile() {

  const studentData = JSON.parse(
  localStorage.getItem("studentData")
);
const [isEditing, setIsEditing] = useState(false);
const [profile, setProfile] = useState({
  phone: studentData?.phone || "",
  gender: studentData?.gender || "",
  dob: studentData?.dob || "",
  address: studentData?.address || "",
  city: studentData?.city || "",
  state: studentData?.state || "",
  country: studentData?.country || "",
  qualification: studentData?.qualification || "",
  college: studentData?.college || "",
  linkedin: studentData?.linkedin || "",
  github: studentData?.github || "",
  portfolio: studentData?.portfolio || "",
  photoURL: studentData?.photoURL || "",
});
const profileFields = [
  profile.photoURL,
  profile.phone,
  profile.gender,
  profile.dob,
  profile.address,
  profile.city,
  profile.state,
  profile.country,
  profile.qualification,
  profile.college,
  profile.linkedin,
  profile.github,
  profile.portfolio,
];

const completedFields = profileFields.filter(
  (field) => field && field.toString().trim() !== ""
).length;

const profileCompletion = Math.round(
  (completedFields / profileFields.length) * 100
);
const [originalProfile, setOriginalProfile] = useState({});
const idCardRef = useRef(null);
const handlePhotoUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  // Allow only images
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    toast.error("Only JPG, PNG and WEBP images are allowed.");
    return;
  }

  // Max 2 MB
  if (file.size > 2 * 1024 * 1024) {
    toast.error("Image must be smaller than 2 MB.");
    return;
  }

  try {
    const fileName = `${studentData.studentId}-${Date.now()}`;

    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(fileName);
      await updateDoc(
  doc(db, "students", studentData.studentId),
  {
    photoURL: data.publicUrl,
  }
);

    setProfile((prev) => ({
      ...prev,
      photoURL: data.publicUrl,
    }));

    toast.success("Photo uploaded successfully.");
  } catch (err) {
    console.error(err);
    toast.error("Photo upload failed.");
  }
};
useEffect(() => {

  const loadProfile = async () => {

    if (!studentData?.studentId) return;

    try {

      console.log("Profile Student ID:", studentData.studentId);
      const studentRef = doc(db, "students", studentData.studentId);

      const snap = await getDoc(studentRef);

      if (snap.exists()) {
        const data = snap.data();

        const loadedProfile = {
  phone: data.phone || "",
  gender: data.gender || "",
  dob: data.dob || "",
  address: data.address || "",
  city: data.city || "",
  state: data.state || "",
  country: data.country || "",
  qualification: data.qualification || "",
  college: data.college || "",
  linkedin: data.linkedin || "",
  github: data.github || "",
  portfolio: data.portfolio || "",
  photoURL: data.photoURL || "",
};

setProfile(loadedProfile);
setOriginalProfile(loadedProfile);

      }

    } catch (err) {

      console.error(err);

    }

  };

  loadProfile();

}, []);
const handleSaveProfile = async () => {
  try {
    const studentRef = doc(db, "students", studentData.studentId);

    await updateDoc(studentRef, {
      gender: profile.gender,
      dob: profile.dob,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      qualification: profile.qualification,
      college: profile.college,
      linkedin: profile.linkedin,
      github: profile.github,
      portfolio: profile.portfolio,
      photoURL: profile.photoURL,
    });

    setOriginalProfile(profile);
    setIsEditing(false);

    toast.success("Profile updated successfully!");

  } catch (error) {
    console.error(error);
    toast.error("Failed to update profile.");
  }
};
const downloadIDCard = async () => {
    await DownloadIDCard(idCardRef, studentData);
};

  return (

<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

    <AIBackground />
    <div className="relative z-10">

    

<div className="max-w-7xl mx-auto px-8">


  <div className="relative overflow-hidden rounded-[32px] shadow-2xl mb-10 border border-white/30 backdrop-blur-xl">

  <div className="absolute inset-0 bg-gradient-to-r from-[#1E40AF] via-[#4F46E5] to-[#7C3AED]"></div>

  <div className="absolute -top-16 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

  <div className="absolute bottom-0 left-20 w-52 h-52 bg-cyan-300/20 rounded-full blur-2xl"></div>
  <div className="absolute top-10 left-1/3 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>

<div className="absolute bottom-10 right-40 w-40 h-40 bg-pink-400/20 rounded-full blur-3xl animate-pulse"></div>

  <div className="relative z-10 p-10 text-white">

      <p className="uppercase tracking-[6px] text-blue-100 text-sm">
          Synaptech Student Portal
      </p>

      <h1 className="text-5xl font-bold mt-3">
          My Profile
      </h1>

      <p className="text-blue-100 text-lg mt-4 max-w-2xl leading-8">
          Keep your personal information updated to unlock
          personalized learning, AI-powered recommendations,
          certificates and placement services.
      </p>

  
  <div className="mt-10 grid grid-cols-3 gap-8">

<div>
<p className="text-3xl font-bold">120+</p>
<p className="text-blue-100 text-sm">Learning Hours</p>
</div>

<div>
<p className="text-3xl font-bold">18</p>
<p className="text-blue-100 text-sm">Modules</p>
</div>

<div>
<p className="text-3xl font-bold">AI</p>
<p className="text-blue-100 text-sm">Powered LMS</p>
</div>
</div>


  </div>



</div>
<StudentQuickStats
    studentData={studentData}
    profileCompletion={profileCompletion}
/>

{/* ===================== PROFILE SUMMARY ===================== */}
<ProfileSummary
    studentData={studentData}
    profile={profile}
    isEditing={isEditing}
    setIsEditing={setIsEditing}
    handlePhotoUpload={handlePhotoUpload}
    profileCompletion={profileCompletion}
    downloadIDCard={downloadIDCard}
/>

<div className="grid md:grid-cols-2 gap-8 mt-8">

<AccountInformation
    studentData={studentData}
/>

<PersonalProfile
    profile={profile}
    setProfile={setProfile}
    originalProfile={originalProfile}
    setOriginalProfile={setOriginalProfile}
    isEditing={isEditing}
    setIsEditing={setIsEditing}
    onSave={handleSaveProfile}
/>

</div>

<div className="mt-8">
    <AccountStatus
        studentData={studentData}
    />
    <div className="mt-12 flex justify-center">

    <div ref={idCardRef}>

        <StudentIDCard
            studentData={studentData}
            profile={profile}
        />

    </div>

</div>
</div>

      </div>
    </div>

</div>

  );
}