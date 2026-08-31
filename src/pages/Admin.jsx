import Background from "../components/ui/Background";
import GlassCard from "../components/ui/GlassCard";
import StatsCard from "../components/StatsCard";
import QuickActionCard from "../components/QuickActionCard";
import {
  FaUserGraduate,
  FaCheckCircle,
  FaClock,
  FaBook,
  FaLayerGroup,
  FaClipboardList,
  FaQuestionCircle,
  FaFileAlt,
  FaChartBar,
  FaVideo,
  FaPlayCircle,
  FaMoneyCheckAlt,
  FaCertificate,
  FaAward,
  FaClipboardCheck,
  FaTools,
  FaChalkboardTeacher,
  FaWallet,
  FaArrowUp,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const quickGroups = [
  {
    title: "Academic Management",
    eyebrow: "CORE ACADEMICS",
    accent: "blue",
    cards: [
      ["Create Batch", "Create a new student batch for upcoming courses.", <FaLayerGroup />, "/create-batch", "from-indigo-500 to-blue-700"],
      ["Assign Batch", "Assign students to an existing batch.", <FaUserGraduate />, "/assign-batch", "from-emerald-500 to-teal-700"],
      ["Upload Course Material", "Upload PDFs, PPTs, notes and other learning resources.", <FaBook />, "/upload-course-material", "from-violet-500 to-purple-700"],
    ],
  },
  {
    title: "Faculty & Academic Network",
    eyebrow: "FACULTY OPERATIONS",
    accent: "cyan",
    cards: [
      ["Faculty Management", "Manage faculty profiles, expertise and teaching readiness.", <FaChalkboardTeacher />, "/admin/faculty", "from-cyan-500 to-blue-700"],
      ["Faculty Assignments", "Assign faculty to batches and modules.", <FaChalkboardTeacher />, "/admin/faculty-assignments", "from-violet-500 to-indigo-700"],
      ["Create Doubt Session", "Schedule a live or recorded doubt-solving session.", <FaQuestionCircle />, "/admin/create-doubt-session", "from-fuchsia-500 to-purple-700"],
      ["Manage Doubt Sessions", "View and control live and recorded doubt sessions.", <FaVideo />, "/admin/doubt-sessions", "from-indigo-500 to-purple-700"],
    ],
  },
  {
    title: "Career & Interview Preparation",
    eyebrow: "CAREER READINESS",
    accent: "emerald",
    cards: [
      ["Interview Q&A Management", "Create, organize and publish interview questions and model answers.", <FaQuestionCircle />, "/admin/interview-qna", "from-emerald-500 to-teal-700"],
    ],
  },
  {
    title: "Assessments",
    eyebrow: "ASSESSMENT CONTROL",
    accent: "violet",
    cards: [
      ["Create Assignment", "Create assignments for students.", <FaClipboardList />, "/create-assignment", "from-orange-500 to-red-600"],
      ["Create MCQ Test", "Design and publish MCQ tests.", <FaQuestionCircle />, "/create-mcq-test", "from-violet-500 to-purple-700"],
      ["View Submissions", "Review student assignment submissions.", <FaFileAlt />, "/view-submissions", "from-blue-500 to-indigo-700"],
      ["View MCQ Results", "View MCQ test scores and analytics.", <FaChartBar />, "/view-mcq-results", "from-emerald-500 to-green-700"],
    ],
  },
  {
    title: "Learning Content",
    eyebrow: "CONTENT & DELIVERY",
    accent: "green",
    cards: [
      ["Create Live Session", "Schedule live online classes.", <FaVideo />, "/create-live-session", "from-green-500 to-emerald-700"],
      ["Manage Live Sessions", "Start, monitor and end live classes.", <FaVideo />, "/manage-live-sessions", "from-teal-500 to-cyan-700"],
      ["Create Recording", "Upload recorded class sessions.", <FaPlayCircle />, "/create-recording", "from-purple-500 to-indigo-700"],
    ],
  },
  {
    title: "Finance & Certificates",
    eyebrow: "REVENUE & CREDENTIALS",
    accent: "amber",
    cards: [
      ["Finance Dashboard", "Monitor revenue, dues, receipts and payment verification.", <FaWallet />, "/finance", "from-emerald-500 to-green-700"],
      ["View Payments", "Review student payment records.", <FaMoneyCheckAlt />, "/view-payments", "from-green-500 to-teal-700"],
      ["Upload Certificate", "Generate and upload certificates.", <FaCertificate />, "/create-certificate", "from-blue-500 to-indigo-700"],
      ["View Certificates", "Browse all issued certificates.", <FaAward />, "/view-certificates", "from-rose-500 to-red-700"],
    ],
  },
  {
    title: "Operations & System",
    eyebrow: "PLATFORM OPERATIONS",
    accent: "slate",
    cards: [
      ["Attendance", "Track and manage attendance.", <FaClipboardCheck />, "/attendance", "from-indigo-500 to-blue-700"],
      ["Initialize Analytics", "Repair or create analytics data.", <FaTools />, "/initialize-analytics", "from-red-500 to-rose-700"],
      ["Daily MIS Report", "Generate an institute-wide management information report.", <FaChartBar />, "/mis-report", "from-cyan-500 to-blue-700"],
    ],
  },
];

function SectionHeader({ eyebrow, title, accent = "blue" }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    cyan: "text-cyan-700 bg-cyan-50 border-cyan-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    violet: "text-violet-700 bg-violet-50 border-violet-100",
    green: "text-green-700 bg-green-50 border-green-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    slate: "text-slate-700 bg-slate-100 border-slate-200",
  };
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] ${colors[accent]}`}>
          {eyebrow}
        </span>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 md:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminEmail");
    navigate("/admin-login");
  };

  const [courseName, setCourseName] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [noteLink, setNoteLink] = useState("");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [financeSummary, setFinanceSummary] = useState({
    expected: 0,
    collected: 0,
    outstanding: 0,
    receipts: 0,
  });

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    fetchFinanceSummary();
  }, []);

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const courseList = [];
      querySnapshot.forEach((docItem) => {
        courseList.push({ id: docItem.id, ...docItem.data() });
      });
      console.log("Courses Loaded:", courseList);
      setCourses(courseList);
      setTotalCourses(courseList.length);
    } catch (error) {
      console.error("fetchCourses Error:", error);
      alert(error.message);
    }
  };

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentList = [];
      querySnapshot.forEach((docItem) => {
        studentList.push({ id: docItem.id, ...docItem.data() });
      });
      console.log("Students Loaded:", studentList);
      setStudents(studentList);
      setApprovedStudents(studentList.filter((student) => student.approved).length);
      setPendingStudents(studentList.filter((student) => !student.approved).length);
    } catch (error) {
      console.error("fetchStudents Error:", error);
      alert(error.message);
    }
  };

  const fetchFinanceSummary = async () => {
    try {
      const snapshot = await getDocs(collection(db, "finance"));
      const rows = snapshot.docs.map((item) => item.data());
      setFinanceSummary({
        expected: rows.reduce((sum, row) => sum + Number(row.agreedFee || 0), 0),
        collected: rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0),
        outstanding: rows.reduce((sum, row) => sum + Math.max(0, Number(row.balanceAmount || 0)), 0),
        receipts: rows.filter((row) => row.paymentProofUploaded).length,
      });
    } catch (error) {
      console.error("fetchFinanceSummary Error:", error);
    }
  };

  const handleDeleteStudent = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this student?");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "courses", id));
    fetchCourses();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "courses"), {
        courseName,
        videoLink,
        noteLink,
        createdAt: new Date(),
      });
      alert("Course Added Successfully");
      fetchCourses();
      setCourseName("");
      setVideoLink("");
      setNoteLink("");
    } catch (error) {
      console.log(error);
      alert("Error adding course");
    }
  };

  const handleApprove = async (studentId) => {
    try {
      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, { approved: true });
      alert("Student approved successfully.");
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("Error approving student.");
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const approvalData = [
    { name: "Approved", value: approvedStudents },
    { name: "Pending", value: pendingStudents },
  ];
  const financeBars = [
    { name: "Expected", value: financeSummary.expected },
    { name: "Collected", value: financeSummary.collected },
    { name: "Outstanding", value: financeSummary.outstanding },
  ];

  return (
    <Background>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1700px] space-y-6">

          {/* Premium SaaS header */}
          <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-slate-950 px-6 py-7 text-white shadow-[0_25px_80px_rgba(15,23,42,0.20)] md:px-9 md:py-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.22em] text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  SYNAPTECH • ADMIN CONSOLE
                </div>
                <h1 className="text-3xl font-black tracking-[-0.03em] md:text-5xl">
                  {greeting}, Admin <span className="text-cyan-300">👋</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  One command centre for students, academics, assessments, content delivery and revenue operations.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/super-admin")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Super Admin <FaExternalLinkAlt size={12} />
                </button>
                <button
                  onClick={() => navigate("/finance")}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-300"
                >
                  <FaWallet /> Finance
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500/90"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard title="Students" value={students.length} color="text-blue-700" borderColor="border-blue-600" badge="LIVE DATA" subtitle="Total Registered Students" icon={<FaUserGraduate />} iconBg="from-blue-500 to-blue-700" onClick={() => navigate("/admin/students")} />
            <StatsCard title="Approved" value={approvedStudents} color="text-emerald-700" borderColor="border-emerald-600" badge="ACTIVE" subtitle="Approved Students" icon={<FaCheckCircle />} iconBg="from-emerald-500 to-green-700" />
            <StatsCard title="Pending" value={pendingStudents} color="text-amber-600" borderColor="border-amber-500" badge="REVIEW" subtitle="Awaiting Approval" icon={<FaClock />} iconBg="from-amber-500 to-orange-600" />
            <StatsCard title="Courses" value={totalCourses} color="text-violet-700" borderColor="border-violet-600" badge="PUBLISHED" subtitle="Available Courses" icon={<FaBook />} iconBg="from-violet-500 to-purple-700" />
          </div>

          {/* Command centre analytics */}
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <GlassCard className="p-6 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-blue-600">OPERATIONS SNAPSHOT</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Platform health</h2>
                  <p className="mt-1 text-sm text-slate-500">Live read-only metrics from your existing Firestore collections.</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><FaArrowUp /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniMetric label="Students" value={students.length} icon={<FaUserGraduate />} />
                <MiniMetric label="Approval rate" value={`${students.length ? Math.round((approvedStudents / students.length) * 100) : 0}%`} icon={<FaCheckCircle />} tone="green" />
                <MiniMetric label="Course library" value={courses.length} icon={<FaBook />} tone="violet" />
                <MiniMetric label="Receipts" value={financeSummary.receipts} icon={<FaFileAlt />} tone="amber" />
              </div>
              <div className="mt-6 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-6 md:p-7">
              <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600">STUDENT PIPELINE</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Approval mix</h2>
              <p className="mt-1 text-sm text-slate-500">A quick view of the current student approval state.</p>
              <div className="mt-2 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={approvalData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={4}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Approved" value={approvedStudents} icon={<FaCheckCircle />} tone="green" />
                <MiniMetric label="Pending" value={pendingStudents} icon={<FaClock />} tone="amber" />
              </div>
            </GlassCard>
          </div>

          {/* Finance command card */}
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-cyan-50 p-6 shadow-[0_18px_55px_rgba(16,185,129,0.10)] md:p-7">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-emerald-700"><FaWallet /><span className="text-[10px] font-black tracking-[0.2em]">FINANCE COMMAND CENTRE</span></div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Revenue & payment operations</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">The existing Finance Dashboard remains the source of truth. This snapshot is read-only and does not modify finance records.</p>
              </div>
              <button onClick={() => navigate("/finance")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5">
                Open Finance Dashboard <FaExternalLinkAlt size={12} />
              </button>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniMetric label="Expected" value={`₹${financeSummary.expected.toLocaleString()}`} icon={<FaWallet />} tone="green" />
              <MiniMetric label="Collected" value={`₹${financeSummary.collected.toLocaleString()}`} icon={<FaCheckCircle />} tone="green" />
              <MiniMetric label="Outstanding" value={`₹${financeSummary.outstanding.toLocaleString()}`} icon={<FaClock />} tone="amber" />
              <MiniMetric label="Receipts" value={financeSummary.receipts} icon={<FaFileAlt />} tone="violet" />
            </div>
          </div>

          {/* Existing admin capabilities, visually upgraded */}
          <div className="space-y-8">
            {quickGroups.map((group) => (
              <section key={group.title}>
                <SectionHeader eyebrow={group.eyebrow} title={group.title} accent={group.accent} />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.cards.map(([title, description, icon, path, iconBg]) => (
                    <QuickActionCard
                      key={title}
                      title={title}
                      description={description}
                      icon={icon}
                      iconBg={iconBg}
                      cardBg="from-white via-white to-slate-50"
                      onClick={() => navigate(path)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Course management */}
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <GlassCard className="p-6 md:p-7">
              <div className="mb-6">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-blue-700">COURSE STUDIO</span>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Add a course</h2>
                <p className="mt-1 text-sm text-slate-500">Uses the existing courses collection and fields without changing the data contract.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" placeholder="Course name" required />
                <input type="text" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" placeholder="YouTube / video link" required />
                <input type="text" value={noteLink} onChange={(e) => setNoteLink(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" placeholder="Notes PDF link" required />
                <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700">Add Course</button>
              </form>
            </GlassCard>

            <GlassCard className="p-6 md:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-violet-700">COURSE LIBRARY</span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Published courses</h2>
                </div>
                <div className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">{courses.length} total</div>
              </div>
              {courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No courses found.</div>
              ) : (
                <div className="grid max-h-[520px] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
                  {courses.map((course, index) => (
                    <div key={course.id} className="group rounded-[22px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-lg">{String(index + 1).padStart(2, "0")}</div>
                        <button onClick={() => handleDelete(course.id)} className="rounded-xl px-2 py-1 text-xs font-bold text-red-500 opacity-70 transition hover:bg-red-50 hover:opacity-100">Delete</button>
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-base font-black text-slate-900">{course.courseName}</h3>
                      <div className="mt-4 flex gap-2">
                        <a href={course.videoLink} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100">Video ↗</a>
                        <a href={course.noteLink} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700 hover:bg-violet-100">Notes ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </section>

        </div>
      </div>
    </Background>
  );
}
