export default function StatsCard({
    title,
    value,
    color,
    icon,
    iconBg = "from-blue-600 to-blue-800",
    borderColor = "border-blue-600",
    badge = "Live Data",
    subtitle = "",
    onClick = null
}) {

    return (

        <div
    onClick={onClick}
    className={`
        bg-gradient-to-br from-white via-blue-50 to-sky-100
        rounded-2xl
        shadow-lg
        hover:shadow-2xl
        hover:-translate-y-2
        transition-all
        duration-300
        border-t-4
        ${borderColor}
        p-7
        min-h-[170px]
        flex
        flex-col
        justify-between
        ${onClick ? "cursor-pointer" : ""}
    `}
>

            <div className="flex justify-between items-start">

                <div>

                    <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">

                        {title}

                    </p>

                    <h2 className={`text-2xl font-bold mt-3 ${color}`}>

                        {value}

                    </h2>

                </div>

                <div
    className={`
        w-14
        h-14
        rounded-full
        flex
        items-center
        justify-center
        bg-gradient-to-br
        ${iconBg}
        text-white
        text-2xl
        shadow-lg
    `}
>
    {icon}
</div>

            </div>

            <div className="mt-5">

                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">

                    {badge}

                </span>
                {subtitle && (

    <p className="text-sm text-gray-500 mt-3">

        {subtitle}

    </p>

)}
{onClick && (

    <p
    className="
        mt-4
        inline-flex
        items-center
        text-blue-600
        font-semibold
        text-sm
        hover:text-blue-800
        transition-colors
    "
>

        View Details →

    </p>

)}

            </div>

        </div>

    );

}