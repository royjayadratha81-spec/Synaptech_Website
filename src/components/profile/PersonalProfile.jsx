import ProfileRow from "./ProfileRow";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import EditableField from "./EditableField";

export default function PersonalProfile({
    profile,
    setProfile,
    originalProfile,
    setOriginalProfile,
    isEditing,
    setIsEditing,
    onSave,
}) {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">

      <h3 className="text-2xl font-bold text-blue-700 border-b pb-3 mb-6">
        Personal Profile
      </h3>

      <div className="space-y-1">

        <div className="flex justify-between items-center border-b py-3">

  <span className="font-semibold text-gray-700">
    Gender
  </span>

  {isEditing ? (

    <select
      value={profile.gender}
      onChange={(e) =>
        setProfile({
          ...profile,
          gender: e.target.value,
        })
      }
      className="border rounded-lg px-3 py-2"
    >
      <option value="">Select Gender</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
    </select>

  ) : (

    <span className="text-gray-600">
      {profile?.gender || "--"}
    </span>

  )}

</div>

        <div className="flex justify-between items-center border-b py-3">

  <span className="font-semibold text-gray-700">
    Date of Birth
  </span>

  {isEditing ? (

    <input
      type="date"
      value={profile.dob}
      onChange={(e) =>
        setProfile({
          ...profile,
          dob: e.target.value,
        })
      }
      className="border rounded-lg px-3 py-2"
    />

  ) : (

    <span className="text-gray-600">
      {profile?.dob || "--"}
    </span>

  )}

</div>

        <EditableField
  label="Address"
  field="address"
  profile={profile}
  setProfile={setProfile}
  isEditing={isEditing}
  placeholder="Enter Address"
/>

        <EditableField
    label="City"
    field="city"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter City"
/>

        <EditableField
    label="State"
    field="state"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter State"
/>

        <EditableField
    label="Country"
    field="country"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter Country"
/>

        <EditableField
    label="Qualification"
    field="qualification"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter Qualification"
/>

        <EditableField
    label="College / University"
    field="college"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter College / University"
/>

        <EditableField
    label="LinkedIn Profile"
    field="linkedin"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter LinkedIn URL"
/>

       <EditableField
    label="GitHub Profile"
    field="github"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter GitHub URL"
/>

       <EditableField
    label="Portfolio Website"
    field="portfolio"
    profile={profile}
    setProfile={setProfile}
    isEditing={isEditing}
    placeholder="Enter Portfolio URL"
/>

      </div>

      <div className="flex justify-end gap-4 mt-8">

  {!isEditing ? (

    <button
      onClick={() => setIsEditing(true)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
    >
      Edit Personal Profile
    </button>

  ) : (

    <>
      <button
        onClick={() => {
  setProfile(originalProfile);
  setIsEditing(false);
}}
        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-xl font-semibold transition"
      >
        Cancel
      </button>

      <button
        onClick={onSave}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition"
      >
        Save Changes
      </button>
    </>

  )}

</div>

    </div>
  );
}