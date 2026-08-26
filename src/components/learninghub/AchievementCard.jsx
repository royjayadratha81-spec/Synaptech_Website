export default function AchievementCard({
    analytics,
    latestAchievement,
}) {

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

            <h3 className="text-2xl font-bold text-slate-800">
    {latestAchievement
        ? `${latestAchievement.moduleName} Completed`
        : "No Achievement Yet"}
</h3>

            <p className="text-slate-500 mt-3">
    {latestAchievement
        ? "Congratulations! You successfully completed this module."
        : "Complete your first module to unlock achievements."}
</p>

            <div className="mt-6">

                <div className="w-full h-2 bg-gray-200 rounded-full">

                    <div className="h-full w-full bg-green-500 rounded-full"></div>

                </div>

            </div>

            <button
    disabled={!analytics?.certificateIssued}
    className={`w-full mt-6 py-3 rounded-xl font-semibold transition ${
        analytics?.certificateIssued
            ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
    }`}
>

               {
analytics?.certificateIssued
    ? "View Certificate"
    : "Certificate Locked"
}

            </button>

        </div>

    );

}