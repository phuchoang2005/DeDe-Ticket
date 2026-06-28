'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

/**
 * Client-side role guard. Redirects to login when unauthenticated; renders an
 * access-denied panel when the user lacks every required role; otherwise renders
 * the protected content.
 */
export default function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="text-center py-16 text-ink-subtle">Đang tải…</div>;
  }
  if (!user) {
    return <div className="text-center py-16 text-ink-subtle">Đang chuyển hướng…</div>;
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
  return <>{children}</>;
}
