export default function SynaptechEducationWebsite() {
  return (
    <div style={{fontFamily:'Arial', background:'#f0f9ff', minHeight:'100vh'}}>

      {/* Navbar */}
      <nav style={{
        background:'#0284c7',
        color:'white',
        padding:'20px',
        display:'flex',
        justifyContent:'space-between',
        alignItems:'center'
      }}>
        <h1>Synaptech Education</h1>

        <div style={{display:'flex', gap:'20px'}}>
          <a href="#home" style={{color:'white'}}>Home</a>
          <a href="#about" style={{color:'white'}}>About</a>
          <a href="#courses" style={{color:'white'}}>Courses</a>
          <a href="#contact" style={{color:'white'}}>Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
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

          <a
            href="https://wa.me/919217766084"
            target="_blank"
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

        </div>
      </section>

      {/* About */}
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
}