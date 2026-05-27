export default function Progress() {

  const courses = [
    {
      name: "Python Programming",
      progress: 75,
    },

    {
      name: "Data Science",
      progress: 50,
    },

    {
      name: "Artificial Intelligence",
      progress: 30,
    },
  ];

  return (

    <div className="bg-white p-6 rounded-2xl shadow-lg">

      <h2 className="text-2xl font-bold text-green-700 mb-6">
        Course Progress
      </h2>

      <div className="space-y-6">

        {courses.map((course, index) => (

          <div key={index}>

            <div className="flex justify-between mb-2">

              <span className="font-semibold text-lg">
                {course.name}
              </span>

              <span className="font-bold text-blue-700">
                {course.progress}%
              </span>

            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">

              <div
                className="bg-blue-600 h-4 rounded-full"
                style={{ width: `${course.progress}%` }}
              ></div>

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}