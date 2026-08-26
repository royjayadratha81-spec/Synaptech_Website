import {
    GraduationCap,
    CalendarDays,
    CreditCard,
    TrendingUp,
} from "lucide-react";

export default function StudentQuickStats({
    studentData,
    profileCompletion,
}) {
    const cards = [
        {
            title: "Course",
            value: studentData?.course || "--",
            icon: GraduationCap,
            color: "from-blue-500 to-indigo-600",
        },
        {
            title: "Batch",
            value: studentData?.batchName || studentData?.batch || "--",
            icon: CalendarDays,
            color: "from-violet-500 to-fuchsia-600",
        },
        {
            title: "Payment",
            value: studentData?.paymentStatus || "Pending",
            icon: CreditCard,
            color: "from-emerald-500 to-green-600",
        },
        {
            title: "Profile",
            value: `${profileCompletion}%`,
            icon: TrendingUp,
            color: "from-orange-500 to-red-500",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => {
                const Icon = card.icon;

                return (
                    <div
                        key={index}
                        className="
                        bg-white/70
                        backdrop-blur-xl
                        rounded-3xl
                        border border-white/60
                        shadow-lg
                        p-6
                        transition-all
                        duration-300
                        hover:-translate-y-2
                        hover:shadow-2xl
                    "
                    >
                        <div
                            className={`
                            w-14
                            h-14
                            rounded-2xl
                            bg-gradient-to-br
                            ${card.color}
                            flex
                            items-center
                            justify-center
                            text-white
                            shadow-lg
                            mb-5
                        `}
                        >
                            <Icon size={28} />
                        </div>

                        <p className="text-gray-500 text-sm">
                            {card.title}
                        </p>

                        <h3 className="mt-2 font-bold text-lg text-slate-800">
                            {card.value}
                        </h3>
                    </div>
                );
            })}
        </div>
    );
}