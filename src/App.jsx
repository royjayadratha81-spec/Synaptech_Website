export default function App() {
  return (
    <div className="font-sans bg-sky-50 min-h-screen">

      {/* Navbar */}
      <nav className="bg-sky-700 text-white px-8 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-3xl font-bold">
          Synaptech Education
        </h1>

        <div className="space-x-6 hidden md:flex">
          <a href="#home" className="hover:text-yellow-300">Home</a>
          <a href="#about" className="hover:text-yellow-300">About</a>
          <a href="#courses" className="hover:text-yellow-300">Courses</a>
          <a href="#placement" className="hover:text-yellow-300">Placement</a>
          <a href="#contact" className="hover:text-yellow-300">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="bg-sky-500 text-white text-center py-24 px-6"
      >
        <h2 className="text-5xl font-bold mb-6">
          Professional Program in Data Science, AI & GenAI
        </h2>

        <p className="text-xl mb-8">
          In Collaboration with IIT Roorkee
        </p>

        <div className="space-x-4">
          <button className="bg-white text-sky-700 px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300 transition">
            Enroll Now
          </button>

          <button className="bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition">
            WhatsApp
          </button>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="py-20 px-6 text-center"
      >
        <h3 className="text-4xl font-bold text-sky-700 mb-6">
          About Synaptech Education
        </h3>

        <p className="max-w-3xl mx-auto text-lg text-gray-700 leading-8">
          Synaptech Education is an emerging technical institution focused on
          Data Science, Machine Learning, Artificial Intelligence and
          Generative AI with industry-oriented training, projects,
          internships and placement support.
        </p>
      </section>

      {/* Courses */}
      <section
        id="courses"
        className="bg-white py-20 px-6"
      >
        <h3 className="text-4xl font-bold text-center text-sky-700 mb-14">
          Our Courses
        </h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

          <div className="bg-sky-100 p-8 rounded-2xl shadow-lg">
            <h4 className="text-2xl font-bold mb-4">
              Data Science
            </h4>

            <p>
              Learn Python, statistics, machine learning and real-world analytics.
            </p>
          </div>

          <div className="bg-sky-100 p-8 rounded-2xl shadow-lg">
            <h4 className="text-2xl font-bold mb-4">
              Artificial Intelligence
            </h4>

            <p>
              Master neural networks, deep learning and AI applications.
            </p>
          </div>

          <div className="bg-sky-100 p-8 rounded-2xl shadow-lg">
            <h4 className="text-2xl font-bold mb-4">
              Generative AI
            </h4>

            <p>
              Build applications using LLMs, ChatGPT APIs and AI agents.
            </p>
          </div>

        </div>
      </section>

      {/* Placement */}
      <section
        id="placement"
        className="py-20 px-6 text-center"
      >
        <h3 className="text-4xl font-bold text-sky-700 mb-6">
          Placement Assistance
        </h3>

        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          We provide internship opportunities, resume building,
          interview preparation and placement guidance for students.
        </p>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="bg-sky-800 text-white text-center py-10"
      >
        <h4 className="text-2xl font-bold mb-4">
          Contact Us
        </h4>

        <p>Email: royjayadratha81@gmail.com</p>
        <p>Phone: +91-9876543210</p>

        <p className="mt-6 text-sm text-gray-300">
          © 2026 Synaptech Education. All rights reserved.
        </p>
      </footer>

    </div>
  )
}