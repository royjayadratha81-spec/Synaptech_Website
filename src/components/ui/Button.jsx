export default function Button({

    children,

    onClick,

    type = "button",

    variant = "primary",

    className = ""

}) {

    const styles = {

        primary:

            "bg-blue-600 hover:bg-blue-700 text-white",

        secondary:

            "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700",

        success:

            "bg-green-600 hover:bg-green-700 text-white",

        danger:

            "bg-red-600 hover:bg-red-700 text-white",

    };

    return (

        <button

            type={type}

            onClick={onClick}

            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow hover:shadow-lg ${styles[variant]} ${className}`}

        >

            {children}

        </button>

    );

}