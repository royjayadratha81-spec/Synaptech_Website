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
<<<<<<< HEAD
      <section
        id="home"
        className="bg-gradient-to-r from-sky-700 to-cyan-500 text-white py-24 px-6 text-center"
      >
        <h2 className="text-5xl font-bold mb-6">
          Professional Program in
          <br />
          Data Science, AI & GenAI
        </h2>

        <p className="text-xl mb-4">
          In Collaboration with IIT Roorkee
        </p>

        <p className="max-w-3xl mx-auto text-lg mb-8">
          Industry-oriented learning with internships,
          projects, certifications and placement assistance.
        </p>

        <div className="space-x-4">
          <button className="bg-white text-sky-700 px-8 py-3 rounded-xl font-semibold hover:bg-yellow-300">
            Enroll Now
          </button>
=======
      <section id="home" style={{
        padding:'80px 20px',
        textAlign:'center',
        background:'#0ea5e9',
        color:'white'
      }}>

        <h1 style={{fontSize:'48px'}}>
          Professional Program in Data Science, AI & GenAI
        </h1>

        <p style={{fontSize:'20px', marginTop:'20px'}}>
          In Collaboration with IIT Roorkee
        </p>

        <div style={{marginTop:'30px'}}>

          <a
            href="https://razorpay.me/@synaptecheducation"
            target="_blank"
            style={{
              background:'white',
              color:'#0284c7',
              padding:'15px 25px',
              marginRight:'20px',
              borderRadius:'10px',
              textDecoration:'none',
              fontWeight:'bold'
            }}
          >
            Enroll Now
          </a>
>>>>>>> 3ceb407b8d909ad9883b46b18bb7485f70a0dff2

          <a
            href="https://wa.me/919217766084"
            target="_blank"
<<<<<<< HEAD
            className="bg-green-500 px-8 py-3 rounded-xl font-semibold hover:bg-green-600"
          >
            WhatsApp
          </a>
=======
            style={{
              background:'#22c55e',
              color:'white',
              padding:'15px 25px',
              borderRadius:'10px',
              textDecoration:'none',
              fontWeight:'bold'
            }}
          >
            WhatsApp
          </a>

>>>>>>> 3ceb407b8d909ad9883b46b18bb7485f70a0dff2
        </div>
      </section>

      {/* About */}
<<<<<<< HEAD
      <section
        id="about"
        className="py-20 px-8 max-w-6xl mx-auto"
      >
        <h2 className="text-4xl font-bold text-sky-700 mb-10 text-center">
          About Synaptech Education
        </h2>

        <p className="text-lg text-gray-700 leading-8 text-center">
          Synaptech Education is a leading EdTech platform focused on
          Data Science, Artificial Intelligence, Machine Learning,
          Generative AI and Industry-oriented technical training.
          We provide internships, live projects, certifications and
          placement assistance to help students build successful careers.
        </p>
      </section>

      {/* Courses */}
      <section
        id="courses"
        className="bg-white py-20 px-8"
      >
        <h2 className="text-4xl font-bold text-center text-sky-700 mb-14">
          Our Courses
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">

          {[
            "Data Science",
            "Artificial Intelligence",
            "Machine Learning",
            "Generative AI",
            "Python Programming",
            "Deep Learning"
          ].map((course, index) => (
            <div
              key={index}
              className="bg-sky-50 p-8 rounded-3xl shadow-lg hover:scale-105 transition"
            >
              <h3 className="text-2xl font-bold text-sky-700 mb-4">
                {course}
              </h3>

              <p className="text-gray-700">
                Practical industry-oriented learning with projects,
                mentorship and internship opportunities.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Placement */}
      <section
        id="placement"
        className="py-20 px-8 bg-sky-100"
      >
        <h2 className="text-4xl font-bold text-center text-sky-700 mb-14">
          Placement Assistance
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

          {[
            "Resume Building",
            "Interview Preparation",
            "Internship Opportunities"
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-3xl shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-sky-700">
                {item}
              </h3>

              <p className="text-gray-700">
                We help students become industry-ready through
                career mentoring and placement support.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="py-20 px-8 bg-white"
      >
        <h2 className="text-4xl font-bold text-center text-sky-700 mb-12">
          Contact Us
        </h2>

        <div className="max-w-3xl mx-auto text-center text-lg space-y-4">

          <p>
            📍 Synaptech Education,
            Plot No 15, Bollco Co-working Space,
            Vaishali Sector 5, Ghaziabad 201010
          </p>

          <p>
            📞 9217766084
          </p>

          <p>
            📧 synaptecheducation@gmail.com
          </p>

          <p>
            Instagram: synaptech_education
          </p>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sky-900 text-white text-center py-6">
        © 2026 Synaptech Education | All Rights Reserved
      </footer>

    </div>
  );
=======
      <section id="about" style={{padding:'60px 20px'}}>

        <h2 style={{
          textAlign:'center',
          color:'#0284c7',
          fontSize:'40px'
        }}>
          About Synaptech Education
        </h2>

        <p style={{
          maxWidth:'900px',
          margin:'30px auto',
          fontSize:'18px',
          lineHeight:'1.8'
        }}>
          Synaptech Education is an emerging technical institution focused on
          Data Science, Machine Learning, Artificial Intelligence and
          Generative AI with industry-oriented training, projects,
          internships and placement support.
        </p>

      </section>

      {/* Courses */}
      <section id="courses" style={{
        padding:'60px 20px',
        background:'white'
      }}>

        <h2 style={{
          textAlign:'center',
          color:'#0284c7',
          fontSize:'40px'
        }}>
          Courses Offered
        </h2>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',
          gap:'20px',
          marginTop:'40px'
        }}>

          {[
            "Python & Data Analytics",
            "Machine Learning",
            "Deep Learning",
            "Generative AI",
            "Agentic AI",
            "MLOps"
          ].map((course,index)=>(
            <div key={index} style={{
              background:'#e0f2fe',
              padding:'30px',
              borderRadius:'15px'
            }}>
              <h3>{course}</h3>

              <p>
                Practical industry-oriented learning with projects and mentorship.
              </p>
            </div>
          ))}

        </div>

      </section>

      {/* Placement */}
      <section style={{
        padding:'60px 20px',
        background:'#bae6fd'
      }}>

        <h2 style={{
          textAlign:'center',
          color:'#0284c7',
          fontSize:'40px'
        }}>
          Placement Assistance
        </h2>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
          gap:'20px',
          marginTop:'40px'
        }}>

          {[
            "Resume Building",
            "Mock Interviews",
            "Internship Support",
            "Career Guidance"
          ].map((item,index)=>(
            <div key={index} style={{
              background:'white',
              padding:'30px',
              borderRadius:'15px'
            }}>
              <h3>{item}</h3>
            </div>
          ))}

        </div>

      </section>

      {/* Contact */}
      <section id="contact" style={{
        padding:'60px 20px',
        background:'#0369a1',
        color:'white',
        textAlign:'center'
      }}>

        <h2 style={{fontSize:'40px'}}>Contact Us</h2>

        <p style={{marginTop:'20px'}}>
          📞 9217766084
        </p>

        <p>
          📧 synaptecheducation@gmail.com
        </p>

        <p>
          📍 Plot No 15, Bollco Co Working Space,
          Vaishali Sector 5, Ghaziabad 201010
        </p>

      </section>

      {/* Footer */}
      <footer style={{
        background:'#082f49',
        color:'white',
        textAlign:'center',
        padding:'20px'
      }}>
        © 2026 Synaptech Education
      </footer>

    </div>
  )
>>>>>>> 3ceb407b8d909ad9883b46b18bb7485f70a0dff2
}