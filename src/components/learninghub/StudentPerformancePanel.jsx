import {
    CalendarDays,
    ClipboardCheck,
    Award,
    CreditCard,
    Flame,
    Trophy,
} from "lucide-react";

export default function StudentPerformancePanel({
    analytics,
    studentData,
    dashboardStats,
}) {
    const items = [
    {
        icon: CalendarDays,
        label: "Attendance",
        value: `${dashboardStats?.attendance ?? 0}%`,
        color: "text-cyan-300",
    },

    {
        icon: ClipboardCheck,
        label: "Pending Assignments",
        value: dashboardStats?.pendingAssignments ?? 0,
        color: "text-orange-300",
    },

    {
        icon: ClipboardCheck,
        label: "Pending Projects",
        value: dashboardStats?.pendingProjects ?? 0,
        color: "text-purple-300",
    },

    {
        icon: ClipboardCheck,
        label: "Pending Mini Tests",
        value: dashboardStats?.pendingMiniTests ?? 0,
        color: "text-pink-300",
    },

    {
        icon: Award,
        label: "Certificates",
        value: analytics?.certificates ?? 0,
        color: "text-green-300",
    },

    {
        icon: CreditCard,
        label: "Fee Status",
        value: studentData?.paymentStatus || "Pending",
        color:
            studentData?.paymentStatus === "Paid"
                ? "text-green-300"
                : "text-red-300",
    },

    {
        icon: Flame,
        label: "Learning Streak",
        value: `${analytics?.learningStreak ?? 0} Days`,
        color: "text-orange-300",
    },

    {
        icon: Trophy,
        label: "Batch Rank",
        value: analytics?.batchRank ?? "--",
        color: "text-yellow-300",
    },
];

    return (
        <div className="w-full h-full rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 p-8">

            <div className="flex justify-center">

                <div className="relative w-44 h-44">

                    <svg className="w-44 h-44 rotate-[-90deg]">

                        <circle
                            cx="88"
                            cy="88"
                            r="74"
                            stroke="rgba(255,255,255,0.20)"
                            strokeWidth="12"
                            fill="none"
                        />

                        <circle
                            cx="88"
                            cy="88"
                            r="74"
                            stroke="#22c55e"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={465}
                            strokeDashoffset={
                                465 -
                                ((dashboardStats?.overallProgress ?? 0) / 100) * 465
                            }
                        />

                    </svg>

                    <div className="absolute inset-0 flex flex-col justify-center items-center">

                        <h1 className="text-5xl font-bold text-white">
                            {dashboardStats?.overallProgress ?? 0}%
                        </h1>

                        <p className="text-white/70 text-sm mt-2">
                            Progress
                        </p>

                    </div>

                </div>

            </div>

            <div className="space-y-6 mt-8">

                {items.map((item, index) => {

                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="flex justify-between items-center border-b border-white/20 pb-3"
                        >

                            <div className="flex items-center gap-3">

                                <Icon
                                    size={20}
                                    className="text-white"
                                />

                                <span className="text-white text-[17px] font-semibold tracking-wide drop-shadow-md">
    {item.label}
</span>

                            </div>

                            <span
    className={`text-xl font-extrabold ${item.color} drop-shadow-md`}
>
    {item.value}
</span>

                        </div>
                    );

                })}

            </div>

        </div>
    );
}