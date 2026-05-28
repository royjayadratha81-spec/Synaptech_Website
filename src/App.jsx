import heroBg from "./assets/hero-bg.jpg";
import { useState } from "react";
import contact1 from "./assets/contact1.jpg";
import contact2 from "./assets/contact2.jpg";
import ai1 from "./assets/ai1.jpg";
import ai2 from "./assets/ai2.jpg";
import ai3 from "./assets/ai3.jpg";
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
  const [showContactForm, setShowContactForm] = useState(false);
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


</div>
  {/* Menu */}
  <div className="space-x-6 hidden md:flex items-center text-blue-900 font-semibold text-lg">

  <a
    href="#home"
    className="hover:text-yellow-300 transition"
  >
    Home
  </a>

  <a
    href="#courses"
    className="hover:text-yellow-300 transition"
  >
    Courses
  </a>

  <a
    href="#placement"
    className="hover:text-yellow-300 transition"
  >
    Placement
  </a>

  <button
    type="button"
    onClick={() => {
      setShowContactForm(true);
    }}
    className="hover:text-yellow-300 transition cursor-pointer"
  >
    Contact
  </button>

</div>

</nav>

 {/* Hero Section */}
<section
  className="relative overflow-hidden text-white py-28 px-8"
  style={{
    backgroundImage: `linear-gradient(rgba(10,10,30,0.75), rgba(0,0,0,0.85)), url(${heroBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">

    {/* LEFT SIDE */}

    <div className="space-y-8">

      <p className="uppercase tracking-[8px] text-blue-300 text-sm">
        Synaptech Education
      </p>

      <h1 className="text-6xl md:text-7xl font-extrabold leading-tight">

        Future of
        <span className="text-blue-400"> AI & </span>

        <span className="text-cyan-300">
          Data Science
        </span>

        Learning

      </h1>

      <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">

        Industry-focused training in Data Science,
        Artificial Intelligence, Generative AI,
        and Agentic AI with practical exposure,
        real-world projects, and future-ready skills.

      </p>

      {/* Buttons */}

      <div className="flex flex-wrap gap-5 pt-4">

        <a href="/courses">

          <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl text-lg font-semibold transition duration-300 shadow-2xl hover:scale-105">

            Explore Courses

          </button>

        </a>

        <a href="/login">

          <button className="border border-white hover:bg-white hover:text-black px-8 py-4 rounded-2xl text-lg font-semibold transition duration-300 hover:scale-105">

            Student Portal

          </button>

        </a>

      </div>

    </div>

    {/* RIGHT SIDE */}

    <div className="relative">

      <div className="grid grid-cols-2 gap-6">

        {/* Card 1 */}

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl hover:scale-105 transition duration-300">

          <div className="text-5xl mb-6">
            🤖
          </div>

          <h3 className="text-3xl font-bold mb-4">
            Artificial Intelligence
          </h3>

          <p className="text-gray-300 text-lg">
            Learn modern AI technologies and real-world applications.
          </p>

        </div>

        {/* Card 2 */}

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl hover:scale-105 transition duration-300 mt-16">

          <div className="text-5xl mb-6">
            📈
          </div>

          <h3 className="text-3xl font-bold mb-4">
            Data Science
          </h3>

          <p className="text-gray-300 text-lg">
            Master analytics, visualization, and machine learning.
          </p>

        </div>

        {/* Large Card */}

        <div className="col-span-2 bg-white/10 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl hover:scale-105 transition duration-300">

          <div className="text-5xl mb-6">
            🧠
          </div>

          <h3 className="text-4xl font-bold mb-4">
            Generative & Agentic AI
          </h3>

          <p className="text-gray-300 text-xl leading-relaxed">

            Explore the next generation of autonomous AI systems,
            intelligent agents, and generative technologies.

          </p>

        </div>

      </div>

    </div>

  </div>

</section>

{/* Statistics Section */}

<section className="bg-black text-white py-24 px-8">

  <div className="max-w-7xl mx-auto">

    <div className="grid md:grid-cols-4 gap-10">

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl text-center hover:scale-105 transition shadow-2xl">

        <h2 className="text-5xl font-extrabold text-blue-400 mb-4">
          300+
        </h2>

        <p className="text-xl text-gray-300">
          Students Enrolled
        </p>

      </div>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl text-center hover:scale-105 transition shadow-2xl">

        <h2 className="text-5xl font-extrabold text-green-400 mb-4">
          20+
        </h2>

        <p className="text-xl text-gray-300">
          Advanced Courses
        </p>

      </div>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl text-center hover:scale-105 transition shadow-2xl">

        <h2 className="text-5xl font-extrabold text-pink-400 mb-4">
          10+
        </h2>

        <p className="text-xl text-gray-300">
          AI Specializations
        </p>

      </div>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl text-center hover:scale-105 transition shadow-2xl">

        <h2 className="text-5xl font-extrabold text-yellow-400 mb-4">
          100%
        </h2>

        <p className="text-xl text-gray-300">
          Practical Learning
        </p>

      </div>

    </div>

  </div>

</section>

{/* AI Showcase Section */}

<section className="bg-gradient-to-b from-black to-gray-950 text-white py-28 px-8">

  <div className="max-w-7xl mx-auto">

    <div className="text-center mb-20">

      <h2 className="text-5xl font-extrabold mb-6">

        Explore The Future of AI

      </h2>

      <p className="text-gray-400 text-xl max-w-3xl mx-auto">

        Learn cutting-edge Artificial Intelligence,
        Machine Learning, Generative AI,
        and Agentic AI technologies through
        practical projects and industry-focused learning.

      </p>

    </div>

    <div className="grid md:grid-cols-3 gap-10">

      <div className="group overflow-hidden rounded-3xl shadow-2xl">

        <img
          src={ai1}
          alt="AI"
          className="w-full h-[450px] object-cover group-hover:scale-110 transition duration-500"
        />

      </div>

      <div className="group overflow-hidden rounded-3xl shadow-2xl">

        <img
          src={ai2}
          alt="Data Science"
          className="w-full h-[450px] object-cover group-hover:scale-110 transition duration-500"
        />

      </div>

      <div className="group overflow-hidden rounded-3xl shadow-2xl">

        <img
          src={ai3}
          alt="Generative AI"
          className="w-full h-[450px] object-cover group-hover:scale-110 transition duration-500"
        />

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

      {/* Premium Contact Section */}

<section className="bg-black text-white py-28 px-8">

  <div className="max-w-7xl mx-auto">

    <div className="text-center mb-16">

      <h2 className="text-5xl font-extrabold mb-6">
        Contact Synaptech Education
      </h2>

      <p className="text-gray-400 text-xl max-w-3xl mx-auto">
        Connect with us to begin your journey in
        Data Science, Artificial Intelligence,
        Generative AI, and future technologies.
      </p>

    </div>

    <div className="grid lg:grid-cols-2 gap-14 items-center">

      {/* Left Side Images */}

      <div className="grid grid-cols-2 gap-6">

        <div className="overflow-hidden rounded-3xl shadow-2xl">

          <img
            src={contact1}
            alt="Technology"
            className="w-full h-[320px] object-cover hover:scale-110 transition duration-500"
          />

        </div>

        <div className="overflow-hidden rounded-3xl shadow-2xl mt-12">

          <img
            src={contact2}
            alt="AI Network"
            className="w-full h-[320px] object-cover hover:scale-110 transition duration-500"
          />

        </div>

      </div>

      {/* Right Side Contact Card */}

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">

        <h3 className="text-4xl font-bold mb-8">
          Get In Touch
        </h3>

        <div className="space-y-6 text-xl">

          <p>
            📞 +91 9217766084
          </p>

          <p>
            📧 <a
  href="mailto:admission@synaptecheducation.in"
  className="hover:text-blue-400 transition"
>
  admission@synaptecheducation.in
</a>
          </p>

          <p>
            📍 <a
  href="https://maps.google.com/?q=Bollco+Co-working+Vaishali+Ghaziabad"
  target="_blank"
  rel="noopener noreferrer"
  className="hover:text-blue-400 transition"
>
  Plot No. 15, Bollco Co-working, Vaishali, Ghaziabad, Uttar Pradesh - 201010
</a>
          </p>

          <p>
            🎓 Industry-focused AI & Data Science Training
          </p>

        </div>

        <button
  onClick={() => setShowContactForm(true)}
  className="mt-10 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-2xl"
>

  Contact Now

</button>
        <div className="mt-10 overflow-hidden rounded-3xl shadow-2xl">

  <iframe
    src="<iframe src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3501.4984359575674!2d77.33771217928633!3d28.644790820780845!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfba225a40923%3A0x1c8527e2228cc300!2sBollco%20Co-working%20Vaishali!5e0!3m2!1sen!2sin!4v1779959720602!5m2!1sen!2sin' width='600' height='450' style='border:0;' allowfullscreen='' loading='lazy' referrerpolicy='no-referrer-when-downgrade'></iframe>"
    width="100%"
    height="300"
    style={{ border: 0 }}
    allowFullScreen=""
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    className="rounded-3xl"
  ></iframe>

</div>

      </div>

    </div>

  </div>

</section>
{/* Contact Popup Form */}

{showContactForm && (

<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] px-6">
    <div className="bg-white rounded-3xl p-10 w-full max-w-2xl relative shadow-2xl">

      <button
        onClick={() => setShowContactForm(false)}
        className="absolute top-5 right-5 text-3xl font-bold text-gray-500 hover:text-black"
      >
        ×
      </button>

      <h2 className="text-4xl font-bold text-blue-800 mb-8">
        Contact Synaptech Education
      </h2>

      <form className="space-y-6">

        <input
          type="text"
          placeholder="Your Name"
          className="w-full border border-gray-300 rounded-2xl p-4 text-lg"
        />

        <input
          type="email"
          placeholder="Your Email"
          className="w-full border border-gray-300 rounded-2xl p-4 text-lg"
        />

        <input
          type="text"
          placeholder="Phone Number"
          className="w-full border border-gray-300 rounded-2xl p-4 text-lg"
        />

        <textarea
          placeholder="Your Message"
          rows="5"
          className="w-full border border-gray-300 rounded-2xl p-4 text-lg"
        ></textarea>

        <button
          type="submit"
          className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl text-lg font-semibold"
        >
          Submit Inquiry
        </button>

      </form>

    </div>

  </div>

)}
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