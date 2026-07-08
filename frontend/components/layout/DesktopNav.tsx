import Link from 'next/link';
import NavLink from './NavLink';
import { ADMIN_NAV, PRIMARY_NAV, desktopNavLink, isAdmin, showPrimary } from './navLinks';
import type { User } from '@/types';

/** Horizontal navigation for desktop viewports. */
export default function DesktopNav({ user }: { user: User | null }) {
  return (
    <nav className="hidden md:flex gap-1 items-center">
      {PRIMARY_NAV.filter((i) => showPrimary(i, user)).map((i) => (
        <NavLink key={i.href} href={i.href} end={i.end} className={desktopNavLink}>
          {i.label}
        </NavLink>
      ))}
      {user && (
        <Link
          href="/feedback"
          className="ml-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
        >
          Phản hồi
        </Link>
      )}
      {isAdmin(user) && (
        <>
          {ADMIN_NAV.map((i) => (
            <NavLink key={i.href} href={i.href} className={desktopNavLink}>
              {i.label}
            </NavLink>
          ))}
          <span className="ml-1 px-2 py-0.5 rounded-full bg-warn-50 text-warn-700 text-[10px] font-bold">
            {(user!.roles || []).join(' / ')}
          </span>
        </>
      )}
    </nav>
  );
}
