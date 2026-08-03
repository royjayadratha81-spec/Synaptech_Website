export default function KpiCard({
    title,
    value,
    icon,
    variant = "blue",
    onClick,
    active = false,
}) {

    const variants = {

        blue: {
            bg: "bg-gradient-to-br from-blue-50 to-cyan-100",
            border: "border-l-4 border-blue-500",
            value: "text-blue-700",
        },

        green: {
            bg: "bg-gradient-to-br from-green-50 to-emerald-100",
            border: "border-l-4 border-green-500",
            value: "text-green-700",
        },

        orange: {
            bg: "bg-gradient-to-br from-orange-50 to-amber-100",
            border: "border-l-4 border-orange-500",
            value: "text-orange-700",
        },

        red: {
            bg: "bg-gradient-to-br from-red-50 to-rose-100",
            border: "border-l-4 border-red-500",
            value: "text-red-700",
        },

        cyan: {
            bg: "bg-gradient-to-br from-cyan-50 to-sky-100",
            border: "border-l-4 border-cyan-500",
            value: "text-cyan-700",
        },

        yellow: {
            bg: "bg-gradient-to-br from-yellow-50 to-amber-100",
            border: "border-l-4 border-yellow-500",
            value: "text-yellow-700",
        },
    };

    const style = variants[variant];

    return (
        <div
            onClick={onClick}
            className={`
    ${style.bg}
    ${style.border}
    rounded-2xl
    p-5
    transition-all
    duration-300
    cursor-pointer

    ${
        active
            ? "ring-4 ring-offset-2 ring-blue-400 shadow-2xl scale-105"
            : "shadow-lg hover:shadow-2xl hover:-translate-y-1"
    }
`}
        >
            <div className="flex justify-between items-start">

                <div>

                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                        {title}
                    </p>

                    <h2 className={`text-4xl font-bold ${style.value}`}>
                        {value}
                    </h2>

                </div>

                <div className="text-3xl">
                    {icon}
                </div>

            </div>

        </div>
    );
}