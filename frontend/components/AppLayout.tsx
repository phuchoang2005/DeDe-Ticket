'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/store/AuthContext';
import { notificationApi } from '@/services/api';
import { usePolling } from '@/hooks/usePolling';
import Header from './layout/Header';
import MobileDrawer from './layout/MobileDrawer';
import Footer from './layout/Footer';

/** Application chrome: header, mobile drawer, unread polling and footer. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Poll the unread count while logged in; reset to zero on logout.
  usePolling(
    () =>
      notificationApi
        .unreadCount()
        .then((r) => setUnread(r.unreadCount))
        .catch(() => {}),
    30000,
    { enabled: !!user },
  );
  useEffect(() => {
    if (!user) setUnread(0);
  }, [user]);

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header user={user} unread={unread} onOpenDrawer={() => setDrawerOpen(true)} onLogout={handleLogout} />
      {drawerOpen && (
        <MobileDrawer user={user} unread={unread} onClose={() => setDrawerOpen(false)} onLogout={handleLogout} />
      )}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
