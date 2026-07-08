import Link from 'next/link';
import MenuIcon from '@/components/icons/MenuIcon';
import DesktopNav from './DesktopNav';
import NotificationBell from './NotificationBell';
import AccountMenu from './AccountMenu';
import type { User } from '@/types';

/** Sticky top bar: hamburger, logo, desktop nav and the account/auth cluster. */
export default function Header({
  user,
  unread,
  onOpenDrawer,
  onLogout,
}: {
  user: User | null;
  unread: number;
  onOpenDrawer: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="bg-white border-b border-line sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-alt text-ink-muted"
        >
          <MenuIcon />
        </button>

        <Link href="/" className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-8 h-8 rounded-lg bg-brand-600 shrink-0" />
          <span className="text-base font-bold text-ink truncate">Dề Dê</span>
        </Link>

        <DesktopNav user={user} />

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {user ? (
            <>
              <NotificationBell unread={unread} />
              <AccountMenu user={user} onLogout={onLogout} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-medium text-ink-muted hover:text-ink px-3 py-2"
              >
                Đăng nhập
              </Link>
              <Link href="/register" className="btn-primary text-sm px-3 py-2 sm:px-4 sm:py-2.5">
                Tạo tài khoản
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
