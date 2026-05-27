import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export default function ProtectedRoute({ children }) {

  const auth = getAuth();

  if (auth.currentUser === null) {

    return <Navigate to="/login" />;

  }

  return children;
}