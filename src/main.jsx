
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./pages/AdminProtectedRoute";
import CreateAssignment from "./pages/CreateAssignment";
import ViewSubmissions from "./pages/ViewSubmissions";
import ViewMcqResults from "./pages/ViewMcqResults";
import AdminMcqResults from "./pages/AdminMcqResults";
import Payment from "./pages/Payment";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import ViewPayments from "./pages/ViewPayments";
import Certificates from "./pages/Certificates";
import CreateCertificate from "./pages/CreateCertificate";
import ViewCertificates from "./pages/ViewCertificates";
import UploadCourseMaterial from "./pages/UploadCourseMaterial";
import AssignBatch from "./pages/AssignBatch";
import Attendance from "./pages/Attendance";
import StudentAttendance from "./pages/StudentAttendance";
import CreateBatch from "./pages/CreateBatch";
import Modules from "./pages/Modules";
import ModuleDetails from "./pages/ModuleDetails";
import CreateMcqTest from "./pages/CreateMcqTest";
import Analytics from "./pages/Analytics";
import AdminAnalytics from "./pages/AdminAnalytics";
import InitializeAnalytics from "./pages/InitializeAnalytics";
import LearningHub from "./pages/LearningHub";
import Profile from "./pages/Profile";
import MiniTestQuiz from "./pages/MiniTestQuiz";
import MiniTestResult from "./pages/MiniTestResult";
import ManageLiveSessions from "./pages/ManageLiveSessions";
import FacultyManagement from "./pages/FacultyManagement";
import FacultyAssignments from "./pages/FacultyAssignments";
import Faculty from "./pages/Faculty";



import App from "./App";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminStudents from "./pages/AdminStudents";
import PaymentMigration from "./pages/PaymentMigration";
import FinanceDashboard from "./pages/FinanceDashboard";
import FinanceMigration from "./pages/FinanceMigration";
import FinanceFinalFeeMigration from "./pages/FinanceFinalFeeMigration";
import Courses from "./pages/Courses";
import Assignments from "./pages/Assignments";
import LiveSessions from "./pages/LiveSessions";
import CreateLiveSession from "./pages/CreateLiveSession";
import CreateRecording from "./pages/CreateRecording";
import CourseDetails from "./pages/CourseDetails";
import ProtectedRoute from "./pages/ProtectedRoute";
import ThankYou from "./pages/ThankYou";
import Results from "./pages/Results";
import PaymentStudentIdMigration from "./pages/PaymentStudentIdMigration";
import BackupData from "./pages/BackupData";
import { Toaster } from "react-hot-toast";


import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/create-live-session" element={<CreateLiveSession />}/>
        <Route path="/create-recording" element={<CreateRecording />} />
        <Route
  path="/create-mcq-test"
  element={
    <AdminProtectedRoute>
      <CreateMcqTest />
    </AdminProtectedRoute>
  }
/>
        <Route
  path="/create-batch"
  element={
    <AdminProtectedRoute>
      <CreateBatch />
    </AdminProtectedRoute>
  }
/>
        <Route
  path="/view-submissions"
  element={
    <AdminProtectedRoute>
      <ViewSubmissions />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/view-mcq-results"
  element={
    <AdminProtectedRoute>
      <AdminMcqResults />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/view-payments"
  element={
    <ViewPayments />
  }
/>
<Route
  path="/payment-studentid-migration"
  element={<PaymentStudentIdMigration />}
/>
<Route path="/view-certificates" element={<ViewCertificates />} />
<Route
  path="/attendance"
  element={
    <AdminProtectedRoute>
      <Attendance />
    </AdminProtectedRoute>
  }
/>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminProtectedRoute> <Admin /> </AdminProtectedRoute>}/>
        <Route
  path="/admin/faculty"
  element={
    <AdminProtectedRoute>
      <FacultyManagement />
    </AdminProtectedRoute>
  }
/>
        <Route
  path="/admin/faculty-assignments"
  element={
    <AdminProtectedRoute>
      <FacultyAssignments />
    </AdminProtectedRoute>
  }
/>
        <Route
    path="/admin/students"
    element={
        <AdminProtectedRoute>
            <AdminStudents />
        </AdminProtectedRoute>
    }
/>
<Route
    path="/payment-migration"
    element={
        <AdminProtectedRoute>
            <PaymentMigration />
        </AdminProtectedRoute>
    }
/>
<Route
    path="/finance"
    element={
        <AdminProtectedRoute>
            <FinanceDashboard />
        </AdminProtectedRoute>
    }
/>
<Route
    path="/finance-migration"
    element={
        <AdminProtectedRoute>
            <FinanceMigration />
        </AdminProtectedRoute>
    }
/>
        <Route
  path="/admin-analytics"
  element={
    <AdminProtectedRoute>
      <AdminAnalytics />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/initialize-analytics"
  element={
    <AdminProtectedRoute>
      <InitializeAnalytics />
    </AdminProtectedRoute>
  }
/>
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/terms" element={<Terms />} />
        <Route
  path="/certificates"
  element={<Certificates />}
/>
<Route
  path="/create-certificate"
  element={
    <AdminProtectedRoute>
      <CreateCertificate />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/upload-course-material"
  element={
    <AdminProtectedRoute>
      <UploadCourseMaterial />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/assign-batch"
  element={
    <AdminProtectedRoute>
      <AssignBatch />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/finance-finalfee-migration"
  element={<FinanceFinalFeeMigration />}
/>
<Route path="/privacy" element={<Privacy />} />

<Route path="/refund-policy" element={<RefundPolicy />} />

<Route path="/contact" element={<Contact />} />

        <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/faculty"
  element={
    <ProtectedRoute>
      <Faculty />
    </ProtectedRoute>
  }
/>

<Route
  path="/courses"
  element={
    <ProtectedRoute>
      <Courses />
    </ProtectedRoute>
  }
/>
<Route
  path="/learning-hub"
  element={
    <ProtectedRoute>
      <LearningHub />
    </ProtectedRoute>
  }
/>
<Route
  path="/student-attendance"
  element={
    <ProtectedRoute>
      <StudentAttendance />
    </ProtectedRoute>
  }
/>
<Route
  path="/manage-live-sessions"
  element={
    <AdminProtectedRoute>
      <ManageLiveSessions />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/modules"
  element={
    <ProtectedRoute>
      <Modules />
    </ProtectedRoute>
  }
/>
<Route
  path="/module/:moduleId"
  element={
    <ProtectedRoute>
      <ModuleDetails />
    </ProtectedRoute>
  }
/>
<Route
  path="/mini-test/:testId/take"
  element={
    <ProtectedRoute>
      <MiniTestQuiz />
    </ProtectedRoute>
  }
/>

<Route
  path="/mini-test/:testId/result/:resultId"
  element={
    <ProtectedRoute>
      <MiniTestResult />
    </ProtectedRoute>
  }
/>

<Route
  path="/courses/:id"
  element={
    <ProtectedRoute>
      <CourseDetails />
    </ProtectedRoute>
  }
/>

<Route
  path="/assignments"
  element={
    <ProtectedRoute>
      <Assignments />
    </ProtectedRoute>
  }
/>
<Route
  path="/results"
  element={
    <ProtectedRoute>
      <Results />
    </ProtectedRoute>
  }
/>
<Route
  path="/payment"
  element={
    <ProtectedRoute>
      <Payment />
    </ProtectedRoute>
  }
/>
<Route
  path="/live-sessions"
  element={
    <ProtectedRoute>
      <LiveSessions />
    </ProtectedRoute>
  }
/>
<Route
  path="/analytics"
  element={
    <ProtectedRoute>
      <Analytics />
    </ProtectedRoute>
  }
/>
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
<Route
  path="/create-assignment"
  element={
    <AdminProtectedRoute>
      <CreateAssignment />
    </AdminProtectedRoute>
  }
/>
<Route
  path="/backup-data"
  element={
    <AdminProtectedRoute>
      <BackupData />
    </AdminProtectedRoute>
  }
/>
      </Routes>
      <Toaster
      position="top-right"
      reverseOrder={false}
    />
    </BrowserRouter>
  </React.StrictMode>
);
