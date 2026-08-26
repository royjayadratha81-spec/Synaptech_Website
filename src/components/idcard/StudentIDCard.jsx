import { QRCodeSVG } from "qrcode.react";
import IDHeader from "./IDHeader";
import IDFooter from "./IDFooter";
import IDSecurity from "./IDSecurity";


export default function StudentIDCard({ studentData, profile }) {
    // Admission Date

const admissionDate = studentData?.approvedAt
    ? studentData.approvedAt.split(",")[0]
    : null;


// Course Duration

let durationMonths = 6;

const course = studentData?.course?.toLowerCase() || "";

if (course.includes("data analyst")) {

    durationMonths = 3;

}
else if (course.includes("generative")) {

    durationMonths = 12;

}
else if (course.includes("agentic")) {

    durationMonths = 12;

}
else if (course.includes("data science")) {

    durationMonths = 6;

}


// Calculate Valid Till

let validTill = "--";

if (admissionDate) {

    const [day, month, year] = admissionDate.split("/");

    const expiryDate = new Date(

        Number(year),

        Number(month) - 1 + durationMonths,

        Number(day)

    );

    validTill = expiryDate.toLocaleDateString("en-GB", {

        day: "2-digit",

        month: "short",

        year: "numeric",

    });

}
  return (
    <div
    className="relative bg-white rounded-[30px] shadow-2xl overflow-hidden w-[850px]"
>

<IDSecurity/>

<IDHeader/>

      

      <div className="grid grid-cols-3 gap-8 p-8">

    {/* LEFT COLUMN */}

    <div className="flex flex-col items-center">

        <div className="relative">

    <img
        src={
            profile?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                studentData?.name || "Student"
            )}&background=2563eb&color=fff&size=256`
        }
        className="w-40 h-40 rounded-full border-4 border-blue-600 shadow-xl object-cover"
    />

    <div
        className="
            absolute
            bottom-2
            right-2
            w-10
            h-10
            rounded-full
            bg-gradient-to-r
            from-emerald-500
            to-green-600
            border-4
            border-white
            shadow-lg
            flex
            items-center
            justify-center
            text-white
            font-bold
        "
    >
        ✓
    </div>

</div>

<div className="mt-4 inline-flex items-center bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
    Verified Student
</div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-xl p-5">

    <QRCodeSVG
        value={studentData?.studentId || "Student"}
        size={120}
    />

    <p className="text-xs text-slate-500 text-center mt-4">
        Scan to verify student identity
    </p>

</div>

    </div>



    {/* RIGHT COLUMN */}

    <div className="col-span-2">

        <h1 className="text-5xl font-black tracking-tight text-slate-900">
            {studentData?.name}
        </h1>

        <p className="text-xl font-semibold tracking-wide text-slate-600 mt-2">
            {studentData?.course}
        </p>

        <div className="space-y-6 mt-6">

    {/* Student ID */}
    <div>

        <p className="text-gray-500 text-sm font-medium mb-2">
            Student ID
        </p>

        <div className="flex items-center rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 w-[320px] min-h-[48px]">

    <div className="font-semibold text-blue-700 text-[18px] tracking-wide">
        {studentData?.studentId ?? "--"}
    </div>

</div>

    </div>


    {/* Batch + Valid Till */}

    <div className="grid grid-cols-2 gap-8">

        <div>

            <p className="text-gray-500 text-sm font-medium">
                Batch
            </p>

            <p className="font-semibold text-gray-900 mt-1">
                {studentData?.batchName}
            </p>

        </div>


        <div>

            <p className="text-gray-500 text-sm font-medium">
                Valid Till
            </p>

            <span className="inline-block mt-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">

    {validTill}

</span>

        </div>

    </div>


    {/* Admission */}

    <div>

        <p className="text-gray-500 text-sm font-medium">
            Admission
        </p>

        <p className="font-semibold text-gray-900 mt-1">
            {admissionDate || "--"}
        </p>

    </div>

</div>

    </div>

</div>

<div
    className="
        absolute
        top-0
        right-8
        h-full
        w-2
        bg-gradient-to-b
        from-cyan-300
        via-violet-300
        to-pink-300
        opacity-50
    "
></div>
      <IDFooter />

    </div>
  );
}