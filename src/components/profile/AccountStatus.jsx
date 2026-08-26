import { ShieldCheck } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import GlassCard from "../ui/GlassCard";
export default function AccountStatus({ studentData }) {
  return (
    <GlassCard className="p-8">

      <SectionHeader
    icon={<ShieldCheck />}
    title="Account Status"
    color="from-emerald-500 to-green-600"
/>

      <div className="grid md:grid-cols-3 gap-6">

        <div>
          <p className="text-gray-500">
            Overall Status
          </p>

          <p className="font-bold text-lg">
            {studentData?.status || "--"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Payment Status
          </p>

          <p className="font-bold text-lg">
            {studentData?.paymentStatus || "--"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            LMS Access
          </p>

          <p className="font-bold text-lg text-green-600">
            {studentData?.lmsAccess ? "Enabled" : "Disabled"}
          </p>
        </div>

      </div>

    </GlassCard>
  );
}