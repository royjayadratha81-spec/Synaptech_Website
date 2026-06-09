
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./pages/AdminProtectedRoute";
import CreateAssignment from "./pages/CreateAssignment";
import ViewSubmissions from "./pages/ViewSubmissions";
import Payment from "./pages/Payment";

import App from "./App";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Courses from "./pages/Courses";
import Assignments from "./pages/Assignments";
import LiveSessions from "./pages/LiveSessions";
import CreateLiveSession from "./pages/CreateLiveSession";
import CreateRecording from "./pages/CreateRecording";
import CourseDetails from "./pages/CourseDetails";
import ProtectedRoute from "./pages/ProtectedRoute";
import ThankYou from "./pages/ThankYou";
import Results from "./pages/Results";


import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/create-live-session" element={<CreateLiveSession />}/>
        <Route path="/create-recording" element={<CreateRecording />} />
        <Route
  path="/view-submissions"
  element={
    <AdminProtectedRoute>
      <ViewSubmissions />
    </AdminProtectedRoute>
  }
/>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminProtectedRoute> <Admin /> </AdminProtectedRoute>}/>
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/thank-you" element={<ThankYou />} />

        <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
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
  path="/create-assignment"
  element={
    <AdminProtectedRoute>
      <CreateAssignment />
    </AdminProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
