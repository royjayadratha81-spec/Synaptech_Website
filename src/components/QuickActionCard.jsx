export default function QuickActionCard({
    title,
    description,
    icon,
    iconBg = "from-blue-500 to-blue-700",

    cardBg = "from-white via-indigo-50 to-blue-100",

    onClick
}) {

    return (

        <div
            onClick={onClick}
            className="
                bg-gradient-to-br
                ${cardBg}
                rounded-2xl border border-indigo-100
                shadow-lg
                hover:shadow-2xl
                hover:-translate-y-2
                transition-all
                duration-300
                cursor-pointer
                p-6
                flex
                flex-col
                justify-between
                min-h-[160px]
            "
        >

            <div
                className={`
                    w-14
                    h-14
                    rounded-full
                    bg-gradient-to-br
                    ${iconBg}
                    flex
                    items-center
                    justify-center
                    text-white
                    text-2xl
                    shadow-lg
                `}
            >

                {icon}

            </div>

            <div className="mt-5">

                <h3 className="text-lg font-bold text-gray-800">

                    {title}

                </h3>

                <p className="text-gray-500 text-sm mt-2">

                    {description}

                </p>

            </div>

            <p className="mt-6 text-blue-600 font-semibold text-sm">

                Open →

            </p>

        </div>

    );

}