import StudentPerformancePanel from "./StudentPerformancePanel";
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import ProgressRing from "../ui/ProgressRing";
import InfoItem from "../ui/InfoItem";

export default function CourseHero({
    student,
    analytics,
    dashboardStats,
    latestAssignment,
    nextLiveClass,
    currentModule,
    moduleProgress,
    learningGoalModules = [],
}) {
    const navigate = useNavigate();
    const hour = new Date().getHours();

let greeting = "Good Evening";

if (hour < 12) {

    greeting = "Good Morning";

}
else if (hour < 17) {

    greeting = "Good Afternoon";

}
    return (

        <Card className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-10 text-white">

            <div className="grid lg:grid-cols-2 gap-10 items-center">

                {/* LEFT SIDE */}

                <div>

                    <p className="uppercase tracking-[0.25em] text-blue-200 font-semibold">

    SYNAPTECH LEARNING HUB

</p>
                    <div className="mt-8">


    <div>

    <h2 className="text-4xl font-bold">

        {greeting}, {student?.name || "Student"} 👋

    </h2>

    <p className="text-blue-100 text-lg mt-3">

        Continue where you left off.

    </p>

</div>

</div>

                    <h1 className="text-4xl lg:text-5xl font-bold mt-8 leading-tight">
    {student?.course || analytics?.courseName}
</h1>

                    <p className="mt-5 text-blue-100 text-lg">

                        In collaboration with IIT Roorkee

                    </p>

                    <div className="mt-10">

    <Button
        onClick={() => navigate("/modules")}
    >
        Continue Learning →
    </Button>

</div>

<div className="mt-8 max-w-xl">

    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6">

        <div className="flex justify-between items-center">

            <h3 className="text-xl font-bold text-white">
                Today's Learning Goal
            </h3>

            <Badge>
                AI Recommended
            </Badge>

        </div>

        <div className="mt-6">

    <p className="text-blue-100 text-sm">
        Today's Learning Goal
    </p>

    <div className="flex flex-wrap gap-2 mt-2">

        {learningGoalModules.length > 0 ? (

            learningGoalModules.map((module) => (

                <span
                    key={module.id}
                    className="px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white font-semibold"
                >
                    {module.moduleName}
                </span>

            ))

        ) : (

            <span className="text-2xl font-bold text-white">
                {currentModule?.moduleName ||
                "Continue your current module"}
            </span>

        )}

    </div>

</div>

        <div className="mt-6">

    <p className="text-blue-100 text-sm">
        Completion
    </p>

    <p className="text-green-300 text-xl font-bold mt-1">
        {moduleProgress || 0}%
    </p>

</div>

        <div className="mt-6 h-3 bg-white/20 rounded-full overflow-hidden">

            <div
                className="h-full bg-gradient-to-r from-green-400 to-cyan-400"
                style={{
                    width: `${moduleProgress || 0}%`
                }}
            />

        </div>

    </div>

</div>

                </div>

                {/* RIGHT SIDE */}

<StudentPerformancePanel
    analytics={analytics}
    studentData={student}
    dashboardStats={dashboardStats}
/>

            </div>

        </Card>

    );
}