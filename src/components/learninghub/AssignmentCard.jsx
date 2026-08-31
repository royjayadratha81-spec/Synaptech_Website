import Card from "../ui/Card";

export default function AssignmentCard({

    assignment,
    assessmentRow

}) {
    if (!assignment) {

    return (

        <Card>

            <div className="p-8 text-center">

                <h2 className="text-xl font-semibold">

                    🎉 No Assignments Available

                </h2>

                <p className="text-gray-500 mt-2">

                    Enjoy your free time.

                </p>

            </div>

        </Card>

    );

}
const isProject =
    String(
        assignment.type ||
        assignment.assignmentType ||
        ""
    )
        .trim()
        .toLowerCase() === "project";

const itemIcon = isProject ? "📁" : "📝";

const itemLabel = isProject
    ? "PROJECT"
    : "ASSIGNMENT";

const isCompleted = isProject
    ? Boolean(assessmentRow?.projectCompleted)
    : Boolean(assessmentRow?.assignmentCompleted);
const dueDate =
    assignment.dueDate instanceof Date
        ? assignment.dueDate
        : assignment.dueDate
        ? new Date(assignment.dueDate)
        : null;

const today = new Date();

const daysLeft = dueDate
    ? Math.ceil(
          (dueDate - today) /
          (1000 * 60 * 60 * 24)
      )
    : null;

const displayDueDate = dueDate
    ? dueDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
      })
    : "—";

    return (

    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">

        <div className="flex items-center justify-between">

            <span
    className={`text-xs font-bold px-3 py-1 rounded-full ${
        isProject
            ? "bg-purple-100 text-purple-700"
            : "bg-orange-100 text-orange-700"
    }`}
>
    {itemIcon} {itemLabel}
</span>

            <span className="text-sm text-gray-500">
    Due {displayDueDate}
</span>

        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-5">

            {assignment.title}

        </h2>

        <p className="text-gray-500 mt-2">

            {assignment.description}

        </p>

        <div className="mt-6">

            <div className="flex justify-between mb-2">

                <span className="text-sm text-gray-500">

                    Submission Status

                </span>

                <span
    className={`font-semibold ${
        isCompleted
            ? "text-green-600"
            : "text-red-600"
    }`}
>
    {isCompleted ? "Completed" : "Pending"}
</span>

            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">

                <div
    className={`h-full rounded-full transition-all duration-500 ${
        isCompleted
            ? "w-full bg-green-500"
            : "w-0 bg-red-500"
    }`}
/>

            </div>

        </div>

        <div className="flex items-center justify-between mt-6">

            <span
    className={`px-3 py-1 rounded-full text-sm font-semibold ${
        isCompleted
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-600"
    }`}
>
    {isCompleted
    ? "✓ Completed"
    : daysLeft === null
    ? "No Due Date"
    : `🔥 ${Math.max(daysLeft, 0)} Days Left`}
</span>

            <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-xl font-semibold hover:scale-105 transition">

                {isProject ? "View Project" : "View Assignment"}

            </button>

        </div>

    </div>

);

}