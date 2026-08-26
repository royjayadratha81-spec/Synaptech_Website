import { FaCamera } from "react-icons/fa";
import { GraduationCap } from "lucide-react";
import PremiumSectionHeader from "../ui/PremiumSectionHeader";

export default function ProfileSummary({
    studentData,
    profile,
    isEditing,
    setIsEditing,
    handlePhotoUpload,
    profileCompletion,
    downloadIDCard,
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">

      <PremiumSectionHeader
    icon={<GraduationCap size={24} strokeWidth={2.3} />}
    title="Profile Summary"
/>

      <div className="flex flex-col md:flex-row items-center gap-8">

        <div className="relative">

  <img
    src={
      profile?.photoURL
        ? profile.photoURL
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            studentData?.name || "Student"
          )}&background=2563eb&color=fff&size=256`
    }
    alt="Student"
    className="w-40 h-40 rounded-full border-4 border-blue-700 shadow-lg object-cover"
  />

  {isEditing && (
    <label className="absolute bottom-1 right-1 bg-white hover:bg-gray-100 border-2 border-blue-600 rounded-full p-2 cursor-pointer shadow-xl transition-all duration-200 hover:scale-110">

      <FaCamera className="text-blue-600 text-lg" />

      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

    </label>
  )}

</div>

        <div className="flex-1">

          <h2 className="text-3xl font-bold flex items-center gap-3">
    {studentData?.name}

    <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold">
        ✔ Verified
    </span>
</h2>

<p className="text-gray-600 mt-3 text-lg">
    {studentData?.course}
</p>

          <div className="grid grid-cols-2 gap-x-10 gap-y-5 mt-6">

    <div>
        <p className="text-gray-400 text-sm">
            Student ID
        </p>

        <p className="font-semibold">
            {studentData?.studentId}
        </p>
    </div>

    <div>
        <p className="text-gray-400 text-sm">
            Batch
        </p>

        <p className="font-semibold">
            {studentData?.batchName || "--"}
        </p>
    </div>

    <div>
        <p className="text-gray-400 text-sm">
            Admission
        </p>

        <p className="font-semibold">
            {studentData?.admissionDate}
        </p>
    </div>

    <div>
        <p className="text-gray-400 text-sm">
            Status
        </p>

        <p className="font-semibold text-emerald-600">
            Active
        </p>
    </div>

</div>

          

        </div>

        <div className="w-full md:w-64">


          <div className="flex justify-between items-center mb-2">
    <p className="font-semibold text-gray-700">
        Profile Completion
    </p>

    <span className="font-bold text-blue-700 text-lg">
        {profileCompletion}%
    </span>
</div>

<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
    <div
        className="bg-gradient-to-r from-blue-600 to-blue-500 h-4 rounded-full transition-all duration-700"
        style={{ width: `${profileCompletion}%` }}
    />
</div>

<p className="text-sm text-gray-500 mt-3">
    Complete your profile to unlock all student services.
</p>
<div className="mt-6 flex flex-col gap-3">

    <button
    onClick={() => setIsEditing(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition"
>
    Edit Profile
</button>

    <button
    onClick={downloadIDCard}
    className="border border-gray-300 rounded-xl py-3 hover:bg-gray-50 transition font-semibold"
>
    Download ID Card
</button>

</div>

        </div>

      </div>

    </div>
  );
}