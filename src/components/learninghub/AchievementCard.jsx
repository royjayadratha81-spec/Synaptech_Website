export default function AchievementCard() {

    return (

        <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">

            <div className="flex items-center justify-between">

                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">

                    🏆 ACHIEVEMENT

                </span>

                <span className="text-yellow-500 text-2xl">

                    ⭐

                </span>

            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-5">

                Python Fundamentals Completed

            </h2>

            <p className="text-gray-500 mt-2">

                Congratulations! You successfully completed this module.

            </p>

            <div className="mt-6">

                <div className="w-full h-2 bg-gray-200 rounded-full">

                    <div className="h-full w-full bg-green-500 rounded-full"></div>

                </div>

            </div>

            <button className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:scale-105 transition">

                View Certificate

            </button>

        </div>

    );

}