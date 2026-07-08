'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initials } from '@/utils/format';
import type { User } from '@/types';

/** Avatar button that opens the account dropdown; closes on navigation. */
export default function AccountMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-200 text-brand-700 font-bold text-sm flex items-center justify-center hover:ring-2 hover:ring-brand-200 hover:ring-offset-2"
      >
        {initials(user.fullName || user.email)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-xl shadow-pop z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <div className="text-sm font-semibold text-ink truncate">{user.fullName || 'Người dùng'}</div>
              <div className="text-xs text-ink-subtle truncate">{user.email}</div>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-alt"
            >
              Hồ sơ cá nhân
            </Link>
            <Link
              href="/tickets"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-alt"
            >
              Vé của tôi
            </Link>
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 border-t border-line"
            >
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
}
