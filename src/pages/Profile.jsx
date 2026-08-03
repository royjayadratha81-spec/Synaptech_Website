import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import PersonalProfile from "../components/profile/PersonalProfile";
import AccountInformation from "../components/profile/AccountInformation";
import ProfileSummary from "../components/profile/ProfileSummary";
import AccountStatus from "../components/profile/AccountStatus";
import toast from "react-hot-toast";

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
});
const [originalProfile, setOriginalProfile] = useState({});
useEffect(() => {

  const loadProfile = async () => {

    if (!studentData?.studentId) return;

    try {

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
    });

    setOriginalProfile(profile);
    setIsEditing(false);

    toast.success("Profile updated successfully!");

  } catch (error) {
    console.error(error);
    toast.error("Failed to update profile.");
  }
};

  return (

<div className="min-h-screen bg-gray-100 p-8">

<div className="max-w-5xl mx-auto">

<div className="flex justify-between items-center mb-8">

  <div>

    <div className="mb-10">

  <h1 className="text-4xl font-bold text-blue-800">
    My Profile
  </h1>

  <p className="text-gray-500 mt-2 text-lg">
    Complete your profile and keep your account information up to date.
  </p>

</div>

  </div>



</div>


{/* ===================== PROFILE SUMMARY ===================== */}
<ProfileSummary
    studentData={studentData}
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

<AccountStatus
    studentData={studentData}
/>

      </div>
    </div>

  );
}