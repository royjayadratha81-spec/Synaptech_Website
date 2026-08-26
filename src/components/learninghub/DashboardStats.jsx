import {
    BookOpen,
    Layers,
    ClipboardCheck,
    Rocket,
    ListChecks,
    CalendarDays,
} from "lucide-react";

export default function DashboardStats({
    totalCourses = 1,
    completedModules = 0,
    completedAssignments = 0,
    completedProjects = 0,
    completedMiniTests = 0,
    attendance = 0,
}) {
    const cards = [
        {
            title: "Courses",
            value: totalCourses,
            icon: BookOpen,
            color: "from-blue-500 to-indigo-600",
        },
        {
            title: "Modules Completed",
            value: completedModules,
            icon: Layers,
            color: "from-purple-500 to-fuchsia-600",
        },
        {
            title: "Assignments",
            value: completedAssignments,
            icon: ClipboardCheck,
            color: "from-orange-500 to-red-500",
        },
        {
            title: "Projects",
            value: completedProjects,
            icon: Rocket,
            color: "from-purple-500 to-indigo-600",
        },
        {
            title: "Mini Tests",
            value: completedMiniTests,
            icon: ListChecks,
            color: "from-pink-500 to-rose-500",
        },
        {
            title: "Attendance",
            value: `${attendance}%`,
            icon: CalendarDays,
            color: "from-emerald-500 to-green-600",
        },
    ];

    return (
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mt-8">
            {cards.map((card, index) => {
                const Icon = card.icon;

                return (
                    <div
                        key={index}
                        className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                        <div
                            className={`h-2 bg-gradient-to-r ${card.color}`}
                        />

                        <div className="p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-500 text-sm">
                                        {card.title}
                                    </p>

                                    <h2 className="text-4xl font-bold mt-3 text-gray-900">
                                        {card.value}
                                    </h2>
                                </div>

                                <div
                                    className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${card.color} flex items-center justify-center text-white group-hover:scale-110 transition`}
                                >
                                    <Icon size={30} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}