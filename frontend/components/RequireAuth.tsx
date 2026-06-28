'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

/**
 * Client-side auth guard. Wrap a protected page's content in this component
 * (mirrors the old `<RequireAuth><Page/></RequireAuth>` element). Redirects to
 * `/login?from=<path>` when unauthenticated so the user returns after sign-in.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading…</div>;
  }
  if (!user) {
    return <div className="text-center py-16 text-slate-500">Đang chuyển hướng…</div>;
  }
  return <>{children}</>;
}
