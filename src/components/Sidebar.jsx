import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaBook,
  FaVideo,
  FaClipboardList,
  FaChartLine,
  FaCertificate,
  FaUser,
  FaSignOutAlt,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaChevronDown,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

const menuClass =
  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors";

export default function Sidebar({ student }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssignmentsPage = location.pathname === "/assignments";
  const currentView =
    new URLSearchParams(location.search).get("view") || "overview";

  const [assignmentsOpen, setAssignmentsOpen] = useState(isAssignmentsPage);

  useEffect(() => {
    if (!isAssignmentsPage) setAssignmentsOpen(false);
  }, [isAssignmentsPage]);

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const assignmentLink = (view, label) => (
    <Link
      to={`/assignments?view=${view}`}
      className={`block px-3 py-1.5 rounded-lg text-[12px] leading-5 transition-colors ${
        currentView === view
          ? "bg-blue-50 text-blue-700 font-bold"
          : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="w-[290px] shrink-0 flex flex-col bg-slate-100">
      <aside className="bg-white border-r border-slate-200 px-3 pt-3 pb-3">
        {/* Student card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0b174d] via-[#162a78] to-[#293a9c] text-white p-4 shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                student?.photoURL
                  ? student.photoURL
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      student?.name || "Student"
                    )}&background=2563eb&color=fff&size=128`
              }
              alt="Student"
              className="w-12 h-12 rounded-2xl border-2 border-white/80 shadow object-cover"
            />
            <div className="min-w-0">
              <p className="text-[9px] tracking-[0.2em] font-black text-cyan-200">
                SYNAPTECH LEARNER
              </p>
              <h2 className="text-[15px] font-extrabold truncate">
                {student?.name || "Student"}
              </h2>
              <p className="text-[10px] text-blue-100 truncate mt-0.5">
                {student?.course || "Data Science with Generative AI"}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-white/10 border border-white/10 px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] tracking-[0.18em] text-blue-200 font-bold">
                  LEARNING STATUS
                </p>
                <p className="text-[12px] font-bold">Active & Learning</p>
              </div>
              <span className="text-lg">🏆</span>
            </div>
          </div>
        </div>

        <p className="px-2 mb-2 text-[9px] tracking-[0.22em] font-black text-slate-400">
          LEARNING
        </p>

        <nav className="space-y-1">
          <Link to="/learning-hub" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaHome className="text-slate-400" /> Dashboard
          </Link>
          <Link to="/courses" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaBook className="text-slate-400" /> My Courses
          </Link>
          <Link to="/modules" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaBook className="text-slate-400" /> Course Modules
          </Link>
          <Link to="/live-sessions" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaVideo className="text-slate-400" /> Live Classes
          </Link>
          <Link
  to="/faculty"
  className={`${menuClass} ${
    location.pathname === "/faculty"
      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
      : "text-slate-700 hover:bg-slate-100"
  }`}
>
  <FaChalkboardTeacher
    className={
      location.pathname === "/faculty"
        ? "text-white"
        : "text-slate-400"
    }
  />
  Faculty
</Link>

          {/* Real collapsible assessment menu */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (!assignmentsOpen) {
                  setAssignmentsOpen(true);
                  navigate("/assignments?view=overview");
                } else {
                  setAssignmentsOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between ${menuClass} ${
                isAssignmentsPage
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-3">
                <FaClipboardList />
                Assignments
              </span>
              <FaChevronDown
                className={`text-xs transition-transform duration-200 ${
                  assignmentsOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {assignmentsOpen && (
              <div className="ml-4 mt-1 pl-3 border-l border-blue-100 space-y-0.5">
                {assignmentLink("overview", "Assessment Overview")}
                {assignmentLink("submit-assignment", "Submit Capstone")}
                {assignmentLink("assignment-evaluation", "Assignment Evaluation")}
                {assignmentLink("project-evaluation", "Project Evaluation")}
                {assignmentLink("mcq-evaluation", "Mini-Test Evaluation")}
                {assignmentLink("capstone-evaluation", "Capstone Evaluation")}
              </div>
            )}
          </div>

          <p className="px-2 pt-3 pb-1 text-[9px] tracking-[0.22em] font-black text-slate-400">
            PERFORMANCE & ACCOUNT
          </p>

          
          <Link to="/student-attendance" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaCalendarCheck className="text-slate-400" /> Attendance
          </Link>
          <Link to="/payment" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaMoneyBillWave className="text-slate-400" /> Payments
          </Link>
          <Link to="/certificates" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaCertificate className="text-slate-400" /> Certificates
          </Link>
          <Link to="/profile" className={`${menuClass} text-slate-700 hover:bg-slate-100`}>
            <FaUser className="text-slate-400" /> Profile
          </Link>
        </nav>

        <button
          onClick={logout}
          className="mt-3 w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold transition"
        >
          <FaSignOutAlt /> Logout
        </button>
      </aside>

      {/* IMPORTANT: robot area is outside the sidebar itself, below Logout */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 px-2 py-2">
        <div className="relative h-[270px] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-[#effbff] via-white to-[#e9eef8] shadow-sm">
          <div className="absolute top-3 left-0 right-0 text-center">
            <p className="text-[9px] tracking-[0.22em] font-black text-slate-500">
              ◈ SYNAPTECH AI LAB
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-[-28px] flex items-end justify-center gap-[-8px]">
            <div className="robot robot-small left-robot" />
            <div className="robot robot-tall center-robot" />
            <div className="robot robot-small right-robot" />
          </div>

          <div className="absolute top-[43px] left-1/2 -translate-x-1/2 w-1 h-8 bg-slate-300 rounded-full">
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          </div>
        </div>
      </div>

      <style>{`
        .robot { position: relative; flex: 0 0 auto; background: linear-gradient(180deg,#eaf3ff 0%,#b8c8dc 100%); border: 2px solid #8395ab; box-shadow: 0 8px 20px rgba(15,23,42,.18); }
        .robot::before { content:""; position:absolute; left:50%; transform:translateX(-50%); top:10px; width:55%; height:30%; border-radius:45%; background:#17243a; box-shadow: inset 0 0 0 4px #71839a; }
        .robot::after { content:"••"; position:absolute; left:50%; transform:translateX(-50%); top:17px; color:#45e8ff; font-size:18px; letter-spacing:5px; text-shadow:0 0 10px #22d3ee; }
        .robot-tall { width:82px; height:170px; border-radius:30px 30px 18px 18px; }
        .robot-tall::before { top:9px; height:28%; }
        .robot-tall::after { top:18px; }
        .robot-small { width:62px; height:125px; border-radius:25px 25px 15px 15px; }
        .robot-small::after { font-size:14px; top:15px; }
        .center-robot { animation: floatRobot 3.5s ease-in-out infinite; }
        .left-robot { transform:translateY(12px); animation:floatRobot 4.2s ease-in-out .4s infinite; }
        .right-robot { transform:translateY(18px); animation:floatRobot 4s ease-in-out .8s infinite; }
        @keyframes floatRobot { 0%,100% { margin-bottom:0; } 50% { margin-bottom:9px; } }
      `}</style>
    </div>
  );
}
