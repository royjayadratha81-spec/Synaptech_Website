export default function SectionHeader({
    icon,
    title,
    color = "from-blue-600 to-violet-600",
}) {
    return (
        <div className="flex items-center gap-4 mb-6">

            <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color}
                flex items-center justify-center
                shadow-lg shadow-blue-300/40`}
            >
                <span className="text-white text-xl">
                    {icon}
                </span>
            </div>

            <div>

                <h2 className="text-3xl font-bold text-slate-800">

                    {title}

                </h2>

                <div className="w-20 h-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 mt-2"></div>

            </div>

        </div>
    );
}