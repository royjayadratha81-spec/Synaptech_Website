import ProfileRow from "./ProfileRow";

export default function AccountInformation({ studentData }) {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">

      <h3 className="text-2xl font-bold text-blue-700 border-b pb-3 mb-6">
        Account Information
      </h3>

      <div className="space-y-1">

        <ProfileRow
          label="Full Name"
          value={studentData?.name}
        />

        <ProfileRow
          label="Student ID"
          value={studentData?.studentId}
        />

        <ProfileRow
          label="Registered Email"
          value={studentData?.email}
        />

        <ProfileRow
          label="Registered Mobile"
          value={studentData?.phone}
        />

        <ProfileRow
          label="Course"
          value={studentData?.course}
        />

        <ProfileRow
          label="Batch"
          value={studentData?.batch}
        />

        <ProfileRow
          label="Admission Date"
          value={studentData?.admissionDate}
        />

        <ProfileRow
  label="Registration Date"
  value="--"
/>

      </div>

    </div>
  );
}