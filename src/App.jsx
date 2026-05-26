import iitLogo from "./assets/IIT_Roorkee.png";
import synaptechLogo from "./assets/Synaptech_Education_Logo.png";
export default function App() {
  return (
    <div className="font-sans bg-sky-50 min-h-screen">

      {/* Navbar */}
      <nav className="bg-sky-700 text-white px-8 py-4 flex justify-between items-center shadow-lg">

  {/* Left Side */}
  <div className="flex items-center gap-4">

    <img
      src={synaptechLogo}
      alt="Synaptech Logo"
      className="h-20 w-auto bg-white p-2 rounded-xl"
    />

    <div>
      <h1 className="text-2xl font-bold">
        Synaptech Education
      </h1>

      <p className="text-sm text-yellow-200">
        In Collaboration with IIT Roorkee
      </p>
    </div>

  </div>

  {/* Menu */}
  <div className="space-x-6 hidden md:flex">
    <a href="#home" className="hover:text-yellow-300">Home</a>
    <a href="#courses" className="hover:text-yellow-300">Courses</a>
    <a href="#placement" className="hover:text-yellow-300">Placement</a>
    <a href="#contact" className="hover:text-yellow-300">Contact</a>
  </div>

  {/* IIT Logo */}
  <img
    src={iitLogo}
    alt="IIT Roorkee"
    className="h-20 w-auto bg-white p-2 rounded-xl"
  />

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
      <section id="courses" className="py-16 px-8 bg-white">

  <h2 className="text-4xl font-bold text-center mb-12 text-sky-800">
    Our Courses
  </h2>

  <div className="grid md:grid-cols-3 gap-8">

    {/* Data Analytics */}
    <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">

      <h3 className="text-2xl font-bold mb-4 text-sky-800">
        Data Analytics
      </h3>

      <p className="text-gray-700">
        Learn Excel, SQL, Power BI, Tableau and Python for real-world business analytics and reporting.
      </p>

    </div>

    {/* Data Science */}
    <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">

      <h3 className="text-2xl font-bold mb-4 text-sky-800">
        Data Science
      </h3>

      <p className="text-gray-700">
        Master Machine Learning, Deep Learning, Python, statistics and real industry projects.
      </p>

    </div>

    {/* Generative AI */}
    <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">

      <h3 className="text-2xl font-bold mb-4 text-sky-800">
        Data Science with Generative AI & Agentic AI
      </h3>

      <p className="text-gray-700">
        Learn LLMs, Generative AI, AI Agents, Prompt Engineering, RAG, Vector Databases and AI automation.
      </p>

    </div>

  </div>

</section>

      {/* Placement Section */}

<section id="placement" className="py-20 px-8 bg-sky-700 text-white">

  <h2 className="text-5xl font-bold text-center mb-14">
    Placement Support
  </h2>

  <div className="grid md:grid-cols-3 gap-10 text-center">

    <div className="bg-white text-sky-800 p-8 rounded-2xl shadow-xl">
      <h3 className="text-5xl font-bold mb-4">100+</h3>
      <p className="text-xl">Students Trained</p>
    </div>

    <div className="bg-white text-sky-800 p-8 rounded-2xl shadow-xl">
      <h3 className="text-5xl font-bold mb-4">20+</h3>
      <p className="text-xl">Industry Projects</p>
    </div>

    <div className="bg-white text-sky-800 p-8 rounded-2xl shadow-xl">
      <h3 className="text-5xl font-bold mb-4">Placement</h3>
      <p className="text-xl">Internship & Career Support</p>
    </div>

  </div>

</section>

      {/* Contact Section */}

<section id="contact" className="py-20 px-8 bg-gray-100">

  <h2 className="text-5xl font-bold text-center mb-14 text-sky-800">
    Contact Us
  </h2>

  <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-xl">

    <div className="space-y-6 text-lg text-gray-700">

      <p>
        <span className="font-bold text-sky-800">Institute:</span>
        {" "}Synaptech Education
      </p>

      <p>
        <span className="font-bold text-sky-800">Courses:</span>
        {" "}Data Analytics, Data Science, Generative AI & Agentic AI
      </p>

      <p>
        <span className="font-bold text-sky-800">Phone:</span>
        {" "}+91 9217766084
      </p>

      <p>
        <span className="font-bold text-sky-800">Email:</span>
        {" "}synaptecheducation@gmail.com
      </p>

      <p>
        <span className="font-bold text-sky-800">Location:</span>
        {" "}Delhi NCR
      </p>

    </div>

  </div>

</section>

    </div>
  )
}