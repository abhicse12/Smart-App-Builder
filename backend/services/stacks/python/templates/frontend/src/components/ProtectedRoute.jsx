import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-8 text-center text-slate-500">Loading...</p>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
