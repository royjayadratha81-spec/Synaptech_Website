export default function SectionTitle({

    title,

    subtitle = ""

}) {

    return (

        <div className="mb-8">

            <h2 className="text-3xl font-bold text-gray-800">

                {title}

            </h2>

            {subtitle && (

                <p className="text-gray-500 mt-2">

                    {subtitle}

                </p>

            )}

        </div>

    );

}