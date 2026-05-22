import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center py-16 text-ink-subtle">Đang tải…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  const userRoles = user.roles || [];
  const hasAny = roles.some((r) => userRoles.includes(r));
  if (!hasAny) {
    return (
      <div className="card p-8 text-center">
        <div className="text-lg font-bold text-ink mb-2">Không có quyền truy cập</div>
        <div className="text-sm text-ink-subtle">
          Trang này yêu cầu vai trò {roles.join(' hoặc ')}. Tài khoản của bạn: {userRoles.join(', ') || '(không có)'}.
        </div>
      </div>
    );
  }
  return children;
}
