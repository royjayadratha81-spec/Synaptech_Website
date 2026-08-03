
export default function UpcomingClassCard({
    analytics,
    liveClass,
}) {

    

    if (!liveClass) {

        return (

            <div className="bg-white rounded-3xl p-6 shadow-lg">

                <h2 className="text-xl font-bold">

                    No Live Classes Scheduled

                </h2>

            </div>

        );

    }

    return (

        <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">

            <div className="flex items-center justify-between">

                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">

                    ● LIVE TODAY

                </span>

                <span className="text-sm text-gray-500">

                    {liveClass.time}

                </span>

            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-5">

                {liveClass.title}

            </h2>

            <p className="text-gray-500 mt-2">

                Module : {liveClass.moduleId}

            </p>

            <div className="mt-6 flex items-center justify-between">

                <div>

                    <p className="text-sm text-gray-500">

                        Date

                    </p>

                    <p className="font-semibold">

                        {liveClass.date}

                    </p>

                </div>

                <div>

                    <p className="text-sm text-gray-500">

                        Batch

                    </p>

                    <p className="font-semibold">

                        {liveClass.batchId}

                    </p>

                </div>

            </div>

            <button
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:scale-[1.02] transition"
            >

                Join Live Class

            </button>

        </div>

    );

}