import { Link } from "react-router-dom";

export default function Courses() {
  const courses = [
    {
      id: 1,
      title: "Python Programming",
      image:
        "https://images.unsplash.com/photo-1526379095098-d400fd0bf935",
    },
    {
      id: 2,
      title: "Data Science",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
    },
    {
      id: 3,
      title: "Artificial Intelligence",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold mb-8 text-blue-900">
        My Courses
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <img
              src={course.image}
              alt={course.title}
              className="h-52 w-full object-cover"
            />

            <div className="p-5">
              <h2 className="text-2xl font-semibold mb-3">
                {course.title}
              </h2>

              <Link
                to={`/course/${course.id}`}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg inline-block hover:bg-blue-900"
              >
                Open Course
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}