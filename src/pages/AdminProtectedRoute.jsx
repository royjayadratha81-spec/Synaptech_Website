import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export default function AdminProtectedRoute({ children }) {

  const auth = getAuth();

  if (auth.currentUser === null) {
    return <Navigate to="/admin-login" />;
  }

  if (
    auth.currentUser.email !==
    "admin@synaptecheducation.in"
  ) {
    return <Navigate to="/" />;
  }

  return children;
}