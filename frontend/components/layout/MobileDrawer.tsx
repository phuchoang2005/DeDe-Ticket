'use client';

import Link from 'next/link';
import CloseIcon from '@/components/icons/CloseIcon';
import NavLink from './NavLink';
import { ADMIN_NAV, PRIMARY_NAV, drawerNavLink, isAdmin, showPrimary } from './navLinks';
import type { User } from '@/types';

/** Slide-in navigation drawer for mobile viewports. */
export default function MobileDrawer({
  user,
  unread,
  onClose,
  onLogout,
}: {
  user: User | null;
  unread: number;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="md:hidden fixed inset-0 bg-ink/40 z-40" onClick={onClose} />
      <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 shadow-pop p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-8 h-8 rounded-lg bg-brand-600" />
            <span className="font-bold text-ink">Dề Dê</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg hover:bg-surface-alt text-ink-muted"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="space-y-1">
          {PRIMARY_NAV.filter((i) => showPrimary(i, user)).map((i) => (
            <NavLink key={i.href} href={i.href} end={i.end} className={drawerNavLink}>
              {i.mobileLabel}
              {i.href === '/notifications' && unread > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-danger-600 text-white text-[10px] font-bold align-middle">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
          {user && (
            <NavLink href="/profile" className={drawerNavLink}>
              👤 Hồ sơ
            </NavLink>
          )}
          {user && (
            <Link
              href="/feedback"
              onClick={onClose}
              className="block px-4 py-3 text-base font-semibold rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100"
            >
              💬 Gửi phản hồi
            </Link>
          )}
          {isAdmin(user) &&
            ADMIN_NAV.map((i) => (
              <NavLink key={i.href} href={i.href} className={drawerNavLink}>
                {i.mobileLabel}
              </NavLink>
            ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-line">
          {user ? (
            <>
              <div className="px-4 py-2">
                <div className="text-sm font-semibold text-ink truncate">{user.fullName || 'Người dùng'}</div>
                <div className="text-xs text-ink-subtle truncate">{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-lg"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link href="/login" onClick={onClose} className="btn-ghost w-full justify-center">
                Đăng nhập
              </Link>
              <Link href="/register" onClick={onClose} className="btn-primary w-full justify-center">
                Tạo tài khoản
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
