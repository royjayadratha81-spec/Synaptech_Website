import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import ProgressRing from "../ui/ProgressRing";
import InfoItem from "../ui/InfoItem";

export default function CourseHero({ student, analytics }) {
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

                    <div className="mt-8">

                        <Button
    onClick={() => navigate("/modules")}
>

    Continue Learning →

</Button>

                    </div>

                </div>

                {/* RIGHT SIDE */}

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/10">

                    <div className="flex justify-center mb-8">

                        <ProgressRing
    progress={analytics?.overallProgress ?? 0}
    label="Learning Progress"
    color="#22C55E"
/>

                    </div>

                    <InfoItem

    label="Batch"

    value={student?.batchId ?? "--"}

/>
<InfoItem

    label="Started"

    value={student?.startDate ?? "--"}

/>

<InfoItem

    label="Ends"

    value={student?.endDate ?? "--"}

/>
                

                    <InfoItem

                        label="Duration"

                        value="10 Months"

                    />

                    <InfoItem

                        label="Internship"

                        value="6 weeks"

                    />

                    <InfoItem

                        label="Mode"

                        value="Offline + Live"

                    />

                </div>

            </div>

        </Card>

    );
}