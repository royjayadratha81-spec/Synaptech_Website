export default function Badge({

    children,

    color = "blue"

}) {

    const colors = {

        blue:

            "bg-blue-100 text-blue-700",

        green:

            "bg-green-100 text-green-700",

        orange:

            "bg-orange-100 text-orange-700",

        purple:

            "bg-purple-100 text-purple-700",

        red:

            "bg-red-100 text-red-700",

        gray:

            "bg-gray-100 text-gray-700",

    };

    return (

        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[color]}`}
        >

            {children}

        </span>

    );

}