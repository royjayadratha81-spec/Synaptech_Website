export default function ProgressRing({

    progress = 0,

    size = 180,

    strokeWidth = 14,

    color = "#2563EB",

    label = "Overall Progress"

}) {

    const radius =
        (size - strokeWidth) / 2;

    const circumference =
        2 * Math.PI * radius;

    const offset =
        circumference -
        (progress / 100) * circumference;

    return (

        <div className="flex flex-col items-center">

            <div
                className="relative"
                style={{
                    width: size,
                    height: size,
                }}
            >

                <svg
                    width={size}
                    height={size}
                    className="-rotate-90"
                >

                    <circle

                        cx={size / 2}

                        cy={size / 2}

                        r={radius}

                        stroke="rgba(255,255,255,0.25)"

                        strokeWidth={strokeWidth}

                        fill="none"

                    />

                    <circle

                        cx={size / 2}

                        cy={size / 2}

                        r={radius}

                        stroke={color}

                        strokeWidth={strokeWidth}

                        fill="none"

                        strokeDasharray={
                            circumference
                        }

                        strokeDashoffset={
                            offset
                        }

                        strokeLinecap="round"

                    />

                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">

                    <h2 className="text-4xl font-bold text-white drop-shadow-md">

    {progress}%

</h2>

                </div>

            </div>

            <p className="mt-5 text-lg font-semibold text-white drop-shadow-sm">

    {label}

</p>

        </div>

    );

}