import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { notificationApi } from '../services/api';
import { initials } from '../utils/format';

const desktopNavLink = ({ isActive }) =>
  `text-sm font-medium px-3 py-2 ${isActive ? 'text-brand-600 font-bold' : 'text-ink-subtle hover:text-ink-muted'}`;

const drawerNavLink = ({ isActive }) =>
  `block px-4 py-3 text-base font-medium rounded-lg ${
    isActive ? 'bg-brand-50 text-brand-700 font-bold' : 'text-ink-muted hover:bg-surface-alt'
  }`;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawers on route change
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let mounted = true;
    const refresh = () =>
      notificationApi
        .unreadCount()
        .then((r) => mounted && setUnread(r.unreadCount))
        .catch(() => {});
    refresh();
    const t = setInterval(refresh, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    setDrawerOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6">
          {/* Hamburger on mobile */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-alt text-ink-muted">
            <MenuIcon />
          </button>

          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-8 h-8 rounded-lg bg-brand-600 shrink-0" />
            <span className="text-base font-bold text-ink truncate">Dề Dê</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 items-center">
            <NavLink to="/" end className={desktopNavLink}>Trang chủ</NavLink>
            <NavLink to="/events" className={desktopNavLink}>Sự kiện</NavLink>
            {user && <NavLink to="/tickets" className={desktopNavLink}>Vé của tôi</NavLink>}
            {user && <NavLink to="/notifications" className={desktopNavLink}>Thông báo</NavLink>}
            {user && (
              <Link to="/feedback" className="ml-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                Phản hồi
              </Link>
            )}
            {user && (user.roles?.includes('ADMIN') || user.roles?.includes('ORGANIZER') || user.roles?.includes('SCANNER')) && (
              <NavLink to="/scan" className={desktopNavLink}>Quét vé</NavLink>
            )}
            {user && (user.roles?.includes('ADMIN') || user.roles?.includes('ORGANIZER')) && (
              <>
                <NavLink to="/admin/events" className={desktopNavLink}>Quản trị sự kiện</NavLink>
                <NavLink to="/admin/analytics" className={desktopNavLink}>Báo cáo</NavLink>
                <NavLink to="/admin/feedback" className={desktopNavLink}>Phản hồi KH</NavLink>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-warn-50 text-warn-700 text-[10px] font-bold">
                  {(user.roles || []).join(' / ')}
                </span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="relative p-2 rounded-full hover:bg-surface-alt text-ink-muted">
                  <BellIcon />
                  {unread > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-label="Account menu"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-200 text-brand-700 font-bold text-sm flex items-center justify-center hover:ring-2 hover:ring-brand-200 hover:ring-offset-2">
                    {initials(user.fullName || user.email)}
                  </button>
                  {accountOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-xl shadow-pop z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-line">
                          <div className="text-sm font-semibold text-ink truncate">{user.fullName || 'Người dùng'}</div>
                          <div className="text-xs text-ink-subtle truncate">{user.email}</div>
                        </div>
                        <Link to="/profile" onClick={() => setAccountOpen(false)}
                              className="block px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-alt">Hồ sơ cá nhân</Link>
                        <Link to="/tickets" onClick={() => setAccountOpen(false)}
                              className="block px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-alt">Vé của tôi</Link>
                        <button onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 border-t border-line">
                          Đăng xuất
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-ink-muted hover:text-ink px-3 py-2">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn-primary text-sm px-3 py-2 sm:px-4 sm:py-2.5">
                  Tạo tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-ink/40 z-40" onClick={() => setDrawerOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 shadow-pop p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-8 h-8 rounded-lg bg-brand-600" />
                <span className="font-bold text-ink">Dề Dê</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                      className="p-2 rounded-lg hover:bg-surface-alt text-ink-muted">
                <CloseIcon />
              </button>
            </div>
            <nav className="space-y-1">
              <NavLink to="/" end className={drawerNavLink}>🏠 Trang chủ</NavLink>
              <NavLink to="/events" className={drawerNavLink}>🎟️ Sự kiện</NavLink>
              {user && <NavLink to="/tickets" className={drawerNavLink}>🎫 Vé của tôi</NavLink>}
              {user && (
                <NavLink to="/notifications" className={drawerNavLink}>
                  🔔 Thông báo
                  {unread > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-danger-600 text-white text-[10px] font-bold align-middle">
                      {unread}
                    </span>
                  )}
                </NavLink>
              )}
              {user && <NavLink to="/profile" className={drawerNavLink}>👤 Hồ sơ</NavLink>}
              {user && (
                <Link to="/feedback" onClick={() => setDrawerOpen(false)}
                      className="block px-4 py-3 text-base font-semibold rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100">
                  💬 Gửi phản hồi
                </Link>
              )}
              {user && (user.roles?.includes('ADMIN') || user.roles?.includes('ORGANIZER') || user.roles?.includes('SCANNER')) && (
                <NavLink to="/scan" className={drawerNavLink}>📷 Quét vé</NavLink>
              )}
              {user && (user.roles?.includes('ADMIN') || user.roles?.includes('ORGANIZER')) && (
                <>
                  <NavLink to="/admin/events" className={drawerNavLink}>🛠 Quản trị sự kiện</NavLink>
                  <NavLink to="/admin/analytics" className={drawerNavLink}>📊 Báo cáo</NavLink>
                  <NavLink to="/admin/feedback" className={drawerNavLink}>📋 Phản hồi KH</NavLink>
                </>
              )}
            </nav>
            <div className="mt-auto pt-4 border-t border-line">
              {user ? (
                <>
                  <div className="px-4 py-2">
                    <div className="text-sm font-semibold text-ink truncate">{user.fullName || 'Người dùng'}</div>
                    <div className="text-xs text-ink-subtle truncate">{user.email}</div>
                  </div>
                  <button onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-lg">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" onClick={() => setDrawerOpen(false)} className="btn-ghost w-full justify-center">
                    Đăng nhập
                  </Link>
                  <Link to="/register" onClick={() => setDrawerOpen(false)} className="btn-primary w-full justify-center">
                    Tạo tài khoản
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-ink-subtle flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <span>© 2026 Dề Dê Ticketing · ITPJ2602 Capstone</span>
          <span className="sm:text-right">Thanh toán đang ở chế độ giả lập — click thanh toán sẽ luôn thành công.</span>
        </div>
      </footer>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
