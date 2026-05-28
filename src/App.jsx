import { FaRobot, FaBrain, FaChartLine } from "react-icons/fa";
import { Link } from "react-router-dom";
import placementsImg from "./assets/placements.png";
import aiHero from "./assets/ai-hero.png";
import { FaWhatsapp } from "react-icons/fa";
import iitLogo from "./assets/IIT_Roorkee.png";
import synaptechLogo from "./assets/Synaptech_Education_Logo.png";
import certificate1 from "./assets/Sample_Certificate.png";
import certificate2 from "./assets/Internship_Certificate.png";
export default function App() {
  return (
    <div className="font-sans bg-sky-50 min-h-screen">

      {/* Navbar */}
      <nav className="bg-slate-100 px-4 md:px-10 py-4 flex flex-col md:flex-row justify-between items-center shadow-md">

  {/* Left Side */}
  <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">

    <img
      src={synaptechLogo}
      alt="Synaptech Logo"
      className="h-20 md:h-32 w-auto"
    />

    <div>
      <h1 className="text-3xl md:text-6xl font-extrabold text-blue-900 tracking-tight">
        Synaptech Education
      </h1>

      <p className="text-blue-700 font-semibold mt-4">
        In Collaboration with IIT Roorkee
      </p>
    </div>

  </div>
<div className="flex items-center gap-4">

  <img
  src={iitLogo}
  alt="IIT Roorkee"
  className="h-40 md:h-48 w-auto object-contain"
/>

  <div>
    <h2 className="text-3xl font-bold text-blue-900">
      IIT Roorkee
    </h2>
  </div>

</div>
  {/* Menu */}
  <div className="space-x-6 hidden md:flex">
    <a href="#home" className="text-blue-900 hover:text-sky-600 font-semibold text-xl">Home</a>
    <a href="#courses" className="hover:text-yellow-300">Courses</a>
    <a href="#placement" className="hover:text-yellow-300">Placement</a>
    <a href="#contact" className="hover:text-yellow-300">Contact</a>
  

</div>

</nav>

 {/* Hero Section */}
<section className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-black text-white flex items-center px-8">

  <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">

    {/* Left Content */}
    <div>

      <p className="text-blue-300 text-lg mb-4 uppercase tracking-widest">
        Synaptech Education
      </p>

      <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">

        Future of
        <span className="text-blue-400"> AI & Data Science </span>
        Learning

      </h1>

      <p className="text-xl text-gray-300 leading-relaxed mb-8">

        Industry-focused training in Data Science,
        Artificial Intelligence, Generative AI,
        and Agentic AI with practical exposure
        and real-world projects.

      </p>

     <div className="flex flex-wrap gap-5">

  <a href="/courses">

    <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-2xl">

      Explore Courses

    </button>

  </a>

  <a href="/login">

    <button className="border border-white hover:bg-white hover:text-black px-8 py-4 rounded-2xl text-lg font-semibold transition">

      Student Portal

    </button>

  </a>

</div>

    {/* Right Side Graphics */}
    <div className="grid grid-cols-2 gap-6">

      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl hover:scale-105 transition">

        <FaRobot className="text-5xl text-blue-400 mb-5" />

        <h3 className="text-2xl font-bold mb-3">
          Artificial Intelligence
        </h3>

        <p className="text-gray-300">
          Learn modern AI technologies and applications.
        </p>

      </div>

      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl hover:scale-105 transition">

        <FaChartLine className="text-5xl text-green-400 mb-5" />

        <h3 className="text-2xl font-bold mb-3">
          Data Science
        </h3>

        <p className="text-gray-300">
          Master analytics, visualization, and ML.
        </p>

      </div>

      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl hover:scale-105 transition col-span-2">

        <FaBrain className="text-5xl text-pink-400 mb-5" />

        <h3 className="text-2xl font-bold mb-3">
          Generative & Agentic AI
        </h3>

        <p className="text-gray-300">
          Explore the next generation of autonomous AI systems.
        </p>

      </div>

    </div>

  </div>
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
          Synaptech Education, established in 2025, is an emerging technical institution dedicated to shaping the next generation of professionals in the rapidly evolving domains of Data Science and Artificial Intelligence. The institute is committed to addressing the growing demand for industry-ready talent by delivering high-quality, career-oriented education. With a comprehensive and future-focused curriculum, Synaptech offers a wide range of in-depth modules covering Data Analytics, Data Science, Traditional Artificial Intelligence, Generative AI, and the cutting-edge field of Agentic AI. Each program is designed to equip learners with practical skills, real-world exposure, and a strong conceptual foundation. Aligned with national skill development initiatives, Synaptech Education is registered under the Government of India’s Skill India Mission and is in collaboration with IIT Roorkee, reinforcing its commitment to empowering individuals with employable and future-ready technical expertise.
        </p>
      </section>

      {/* Courses */}
      <section id="courses" className="py-16 px-8 bg-white">

  <h2 className="text-4xl font-bold text-center mb-12 text-sky-800">
    Our Courses
  </h2>

  <div className="grid md:grid-cols-3 gap-8">

    {/* Data Analytics */}
    <Link to="/courses">
      <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">

      <h3 className="text-lg md:text-2xl font-bold mb-4 text-sky-800">
        Data Analytics
      </h3>

      <p className="text-gray-700">
        Learn Excel, SQL, Power BI, Tableau and Python for real-world business analytics and reporting.
      </p>

    </div>
    </Link>

    {/* Data Science */}
    <Link to="/courses">
      <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">
        

      <h3 className="text-lg md:text-2xl font-bold mb-4 text-sky-800">
        Data Science
      </h3>

      <p className="text-gray-700">
        Master Machine Learning, Deep Learning, Python, statistics and real industry projects.
      </p>

    </div>
    </Link>

    {/* Generative AI */}
    <Link to="/courses">
      <div className="bg-sky-100 p-8 rounded-2xl shadow-lg hover:scale-105 transition">

      <h3 className="text-lg md:text-2xl font-bold mb-4 text-sky-800">
        Data Science with Generative AI & Agentic AI
      </h3>

      <p className="text-gray-700">
        Learn LLMs, Generative AI, AI Agents, Prompt Engineering, RAG, Vector Databases and AI automation.
      </p>

      </div>
    </Link>


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
<div className="max-w-6xl mx-auto mb-16">

  <p className="text-lg md:text-2xl text-center mb-8">
    Our students have opportunities with top recruiters and global companies.
  </p>

  <img
    src={placementsImg}
    alt="Top Hiring Companies"
    className="w-full rounded-3xl shadow-2xl border-4 border-white"
  />

</div>
  <div className="grid md:grid-cols-3 gap-10 text-center">

    <div className="bg-white text-sky-800 p-8 rounded-2xl shadow-xl">
      <h3 className="text-5xl font-bold mb-4">300+</h3>
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
  Mayank Yadav
</h3>

<p className="text-gray-600">
  Data Scientist
</p>
    </div>

    <div className="bg-sky-100 p-8 rounded-2xl shadow-xl">
      <p className="text-gray-700 italic">
        "Great support for placements and internships."
      </p>

      <h3 className="mt-6 font-bold text-sky-800">
  Arpita Shome
</h3>

<p className="text-gray-600">
  Data Analyst
</p>
    </div>

    <div className="bg-sky-100 p-8 rounded-2xl shadow-xl">
      <p className="text-gray-700 italic">
        "Very practical learning approach."
      </p>

      <h3 className="mt-6 font-bold text-sky-800">
  Rupam Kohli
</h3>

<p className="text-gray-600">
  AIML Engineer
</p>

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
  <span className="font-bold text-sky-800">Email:</span>{" "}

  <a
    href="mailto:admission@synaptecheducation.in"
    className="text-blue-700 hover:underline"
  >
    admission@synaptecheducation.in
  </a>
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
  className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl text-lg md:text-2xl z-50"
>
  <FaWhatsapp />
</a>
    </div>
  )
}