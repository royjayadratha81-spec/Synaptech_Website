import Card from "../ui/Card";

export default function AssignmentCard({

    assignment

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
const dueDate = new Date(assignment.dueDate);

const today = new Date();

const daysLeft = Math.ceil(

    (dueDate - today) /

    (1000 * 60 * 60 * 24)

);

    return (

    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">

        <div className="flex items-center justify-between">

            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">

                📝 ASSIGNMENT

            </span>

            <span className="text-sm text-gray-500">

                Due {assignment.dueDate}

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

                <span className="font-semibold text-red-600">

                    Pending

                </span>

            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">

                <div className="h-full w-0 bg-red-500 rounded-full"></div>

            </div>

        </div>

        <div className="flex items-center justify-between mt-6">

            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">

                🔥 {daysLeft} Days Left

            </span>

            <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-xl font-semibold hover:scale-105 transition">

                View Assignment

            </button>

        </div>

    </div>

);

}