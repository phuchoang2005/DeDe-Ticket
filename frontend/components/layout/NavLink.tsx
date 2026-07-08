'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Active-aware navigation link (replaces react-router's NavLink). */
export default function NavLink({
  href,
  end,
  className,
  children,
  onClick,
}: {
  href: string;
  end?: boolean;
  className: (state: { isActive: boolean }) => string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} onClick={onClick} className={className({ isActive })}>
      {children}
    </Link>
  );
}
