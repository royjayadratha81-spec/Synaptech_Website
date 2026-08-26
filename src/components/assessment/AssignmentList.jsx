export default function AssignmentList({ assignments = [] }) {

  if (assignments.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
        <div className="text-4xl mb-4">
          📚
        </div>

        <h3 className="text-xl font-bold text-gray-800">
          No Assignments Available
        </h3>

        <p className="text-gray-500 mt-2">
          There are currently no assignments available for your batch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Section Header */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Your Assignments
          </h2>

          <p className="text-gray-500 mt-1">
            Complete your assignments and submit your work before the due date.
          </p>
        </div>

        <div className="hidden sm:flex items-center justify-center bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold">
          {assignments.length}{" "}
          {assignments.length === 1 ? "Assignment" : "Assignments"}
        </div>

      </div>


      {/* Assignment Cards */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {assignments.map((assignment) => {

          const type = assignment.type || "Assignment";

          const isProject =
            type.toLowerCase().includes("project");

          const isCapstone =
            type.toLowerCase().includes("capstone");

          let badgeClass =
  "bg-blue-50 text-blue-700 border-blue-200";

let iconClass =
  "bg-blue-100 text-blue-700";

if (isProject) {
  badgeClass =
    "bg-purple-50 text-purple-700 border-purple-200";

  iconClass =
    "bg-purple-100 text-purple-700";
}

if (isCapstone) {
  badgeClass =
    "bg-orange-50 text-orange-700 border-orange-200";

  iconClass =
    "bg-orange-100 text-orange-700";
}

          return (

            <div
              key={assignment.id}
              className="
                group
                bg-white
                border border-gray-200
                rounded-2xl
                p-6
                shadow-sm
                hover:shadow-xl
                hover:-translate-y-1
                transition-all
                duration-300
                flex
                flex-col
                min-h-[300px]
              "
            >

              {/* Top Row */}

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div
  className={`
    w-12
    h-12
    rounded-xl
    flex
    items-center
    justify-center
    text-xl
    ${iconClass}
  `}
>
                    📝
                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {type}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Course Assessment
                    </p>

                  </div>

                </div>


                {/* Type Badge */}

                <span
                  className={`
                    px-3
                    py-1
                    rounded-full
                    border
                    text-xs
                    font-semibold
                    whitespace-nowrap
                    ${badgeClass}
                  `}
                >
                  {type}
                </span>

              </div>


              {/* Assignment Title */}

              <div className="mt-6">

                <h3
                  className="
                    text-xl
                    font-bold
                    text-gray-800
                    group-hover:text-blue-700
                    transition-colors
                  "
                >
                  {assignment.title}
                </h3>

                <p className="text-gray-500 mt-2 leading-relaxed">
                  {assignment.description ||
                    "Complete this assignment and submit your work for evaluation."}
                </p>

              </div>


              {/* Assignment Information */}

              <div className="mt-5 grid grid-cols-2 gap-3">

                <div className="bg-gray-50 rounded-xl p-3">

                  <p className="text-xs text-gray-400 uppercase font-semibold">
                    Due Date
                  </p>

                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {assignment.dueDate || "Not specified"}
                  </p>

                </div>


                <div className="bg-gray-50 rounded-xl p-3">

                  <p className="text-xs text-gray-400 uppercase font-semibold">
                    Module
                  </p>

                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {assignment.moduleName ||
                      assignment.module ||
                      "Course Module"}
                  </p>

                </div>

              </div>


              {/* Bottom Action */}

              <div className="mt-auto pt-6">

                {assignment.assignmentFileUrl ? (

                  <a
                    href={assignment.assignmentFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      gap-2
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      font-semibold
                      px-5
                      py-3
                      rounded-xl
                      transition-all
                      shadow-sm
                      hover:shadow-md
                    "
                  >
                    <span>📄</span>
                    Download Assignment
                  </a>

                ) : (

                  <div
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      bg-gray-100
                      text-gray-400
                      font-semibold
                      px-5
                      py-3
                      rounded-xl
                    "
                  >
                    Assignment File Unavailable
                  </div>

                )}

              </div>

            </div>

          );

        })}

      </div>

    </div>
  );
}