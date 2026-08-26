import ProfileRow from "./ProfileRow";
import { FolderKanban } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import GlassCard from "../ui/GlassCard";

export default function AccountInformation({ studentData }) {
    console.log(studentData);
  return (
    <GlassCard className="p-8">

      <SectionHeader
    icon={<FolderKanban size={24} strokeWidth={2.3} />}
    title="Account Information"
    color="from-cyan-500 to-blue-600"
/>

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
  value={studentData?.batchName}
/>

        <ProfileRow
  label="Admission Date"
  value={
    studentData?.approvedAt
      ? studentData.approvedAt.split(",")[0]
      : "--"
  }
/>

        <ProfileRow
  label="Registration Date"
  value={
    studentData?.createdAt?.seconds
      ? new Date(studentData.createdAt.seconds * 1000).toLocaleDateString(
          "en-GB"
        )
      : "--"
  }
/>

      </div>

    </GlassCard>
  );
}