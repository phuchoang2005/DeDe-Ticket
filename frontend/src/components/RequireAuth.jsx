import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
