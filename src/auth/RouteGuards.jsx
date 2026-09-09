import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export const RequireAuth = ({ children }) => {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

export const RequireRole = ({ children, role }) => {
  const { loading, user } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const username = (user.username || localStorage.getItem('username') || '').toLowerCase();
  const userRole = (user.role || localStorage.getItem('role') || '').toUpperCase();
  const isAdmin = username === 'admin' || username === 'deepanshu' || userRole === 'ADMIN';

  if (role === 'ADMIN' && !isAdmin) return <Navigate to="/forbidden" replace />;
  if (role !== 'ADMIN' && userRole !== role.toUpperCase()) return <Navigate to="/forbidden" replace />;
  return children;
};
