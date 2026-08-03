export default function ProgressCard({

    module,

    progress,

    color = "bg-blue-600"

}) {

    return (

        <div className="bg-white rounded-2xl shadow-lg p-6">

            <div className="flex justify-between mb-3">

                <h3 className="font-semibold text-gray-700">

                    {module}

                </h3>

                <span className="font-bold">

                    {progress}%

                </span>

            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">

                <div

                    className={`${color} h-3 rounded-full transition-all duration-500`}

                    style={{ width: `${progress}%` }}

                />

            </div>

        </div>

    );

}