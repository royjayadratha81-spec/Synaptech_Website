
import iitLogo from "./assets/IIT_Roorkee.png";
import synaptechLogo from "./assets/Synaptech_Education_Logo.png";
import certificate1 from "./assets/Sample_Certificate.png";
import certificate2 from "./assets/Internship_Certificate.png";
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
          Advanced Certification Programme in Data Science, GenAI & Agentic AI
        </h2>

        <p className="text-xl mb-8">
          In Collaboration with IIT Roorkee
        </p>

        <div className="flex justify-center gap-6 mt-10">
          <a
  href="https://docs.google.com/forms/d/e/1FAIpQLSeIGfJLFhZQ7G-SpUF2WUk_yyycZ19dA2B0d4tFscN1fquvRQ/viewform?usp=publish-editor"
  className="bg-white text-sky-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-yellow-300 inline-block"
>
  Enroll Now
</a>

          <a
  href="https://wa.me/919217766084"
  target="_blank"
  rel="noopener noreferrer"
  className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
>
  WhatsApp Us
</a>
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
{/* Certificates Section */}

<section className="py-20 px-8 bg-gray-100">

  <h2 className="text-5xl font-bold text-center mb-14 text-sky-800">
    Certification
  </h2>

  <div className="grid md:grid-cols-2 gap-10">

    <img
      src={certificate1}
      alt="Certificate"
      className="rounded-2xl shadow-2xl"
    />

    <img
      src={certificate2}
      alt="Certificate"
      className="rounded-2xl shadow-2xl"
    />

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
{/* Testimonials */}

<section className="py-20 px-8 bg-white">

  <h2 className="text-5xl font-bold text-center mb-14 text-sky-800">
    Student Testimonials
  </h2>

  <div className="grid md:grid-cols-3 gap-8">

    <div className="bg-sky-100 p-8 rounded-2xl shadow-xl">
      <p className="text-gray-700 italic">
        "Excellent training and industry-oriented projects."
      </p>

      <h3 className="mt-6 font-bold text-sky-800">
        Student
      </h3>
    </div>

    <div className="bg-sky-100 p-8 rounded-2xl shadow-xl">
      <p className="text-gray-700 italic">
        "Great support for placements and internships."
      </p>

      <h3 className="mt-6 font-bold text-sky-800">
        Student
      </h3>
    </div>

    <div className="bg-sky-100 p-8 rounded-2xl shadow-xl">
      <p className="text-gray-700 italic">
        "Very practical learning approach."
      </p>

      <h3 className="mt-6 font-bold text-sky-800">
        Student
      </h3>
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
  <span className="font-bold text-sky-800">Address:</span>
  {" "}Plot No. 15, Bollco Co-working Space, Vaishali Sector 5, Ghaziabad, 201010
</p>

<a
  href="https://maps.google.com/?q=Plot+No+15+Bollco+Co-working+Space+Vaishali+Sector+5+Ghaziabad+201010"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-block mt-4 bg-sky-700 hover:bg-sky-800 text-white px-6 py-3 rounded-xl font-semibold transition"
>
  View on Google Maps
</a>

    </div>

  </div>

</section>
{/* Floating WhatsApp Button */}

<a
  href="https://wa.me/919217766084"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl text-2xl z-50"
>
  💬
</a>
    </div>
  )
}