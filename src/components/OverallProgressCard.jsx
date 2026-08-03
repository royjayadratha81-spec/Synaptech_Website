export default function OverallProgressCard({
    progress,
    completedModules,
    totalModules,
    assignments,
}) {

    return (

        <div className="bg-white rounded-3xl shadow-lg p-8">

            <h2 className="text-2xl font-bold text-gray-800 mb-8">

                Overall Progress

            </h2>

            <div className="flex flex-col lg:flex-row items-center justify-between">

                {/* Progress Circle */}

                <div className="relative w-44 h-44">

                    <svg className="w-44 h-44 -rotate-90">

                        <circle

                            cx="88"

                            cy="88"

                            r="72"

                            stroke="#E5E7EB"

                            strokeWidth="12"

                            fill="none"

                        />

                        <circle

                            cx="88"

                            cy="88"

                            r="72"

                            stroke="#2563EB"

                            strokeWidth="12"

                            fill="none"

                            strokeDasharray={452}

                            strokeDashoffset={
                                452 -
                                (452 * progress) / 100
                            }

                            strokeLinecap="round"

                        />

                    </svg>

                    <div className="absolute inset-0 flex items-center justify-center">

                        <div className="text-center">

                            <p className="text-4xl font-bold text-blue-700">

                                {progress}%

                            </p>

                            <p className="text-gray-500 text-sm">

                                Complete

                            </p>

                        </div>

                    </div>

                </div>

                {/* Right Side */}

                <div className="space-y-5 mt-8 lg:mt-0 lg:w-1/2">

                    <div className="flex justify-between">

                        <span className="text-gray-600">

                            Modules Completed

                        </span>

                        <span className="font-semibold">

                            {completedModules}/{totalModules}

                        </span>

                    </div>

                    <div className="flex justify-between">

                        <span className="text-gray-600">

                            Assignments Submitted

                        </span>

                        <span className="font-semibold">

                            {assignments}

                        </span>

                    </div>

                    <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition">

                        Continue Learning →

                    </button>

                </div>

            </div>

        </div>

    );

}