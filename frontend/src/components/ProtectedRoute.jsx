
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Wait until the login status is checked
  if (loading) {
    return <p>Checking authentication...</p>;
  }

  // Redirect users who are not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
