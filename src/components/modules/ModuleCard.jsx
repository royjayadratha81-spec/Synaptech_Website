export default function ModuleCard({

    icon,

    title,

    lessons,

    assignments,

    quizzes,

    progress,

    status,

    buttonText

}) {

    return (

        <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">

            <div className="flex justify-between items-start">

                <div>

                    <h2 className="text-2xl font-bold">

                        {icon} {title}

                    </h2>

                    <p className="text-gray-500 mt-2">

                        {lessons} Lessons • {assignments} Assignments • {quizzes} Quizzes

                    </p>

                </div>

                <span className="text-sm font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">

                    {status}

                </span>

            </div>

            <div className="w-full h-3 bg-gray-200 rounded-full mt-6 overflow-hidden">

                <div

                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"

                    style={{

                        width: `${progress}%`

                    }}

                ></div>

            </div>

            <div className="flex justify-between mt-3">

                <span className="text-gray-500">

                    {progress}% Completed

                </span>

            </div>

            <button className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition">

                {buttonText}

            </button>

        </div>

    );

}