import type { User } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  end?: boolean;
  authOnly?: boolean;
}

/** Primary nav shown to everyone (auth-only items hidden when logged out). */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Trang chủ', mobileLabel: '🏠 Trang chủ', end: true },
  { href: '/events', label: 'Sự kiện', mobileLabel: '🎟️ Sự kiện' },
  { href: '/tickets', label: 'Vé của tôi', mobileLabel: '🎫 Vé của tôi', authOnly: true },
  { href: '/notifications', label: 'Thông báo', mobileLabel: '🔔 Thông báo', authOnly: true },
];

/** Admin/organizer-only nav. */
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/events', label: 'Quản trị sự kiện', mobileLabel: '🛠 Quản trị sự kiện' },
  { href: '/admin/analytics', label: 'Báo cáo', mobileLabel: '📊 Báo cáo' },
  { href: '/admin/feedback', label: 'Phản hồi KH', mobileLabel: '📋 Phản hồi KH' },
];

export const isAdmin = (user: User | null): boolean =>
  !!user && (user.roles?.includes('ADMIN') || user.roles?.includes('ORGANIZER'));

export const showPrimary = (item: NavItem, user: User | null): boolean => (item.authOnly ? !!user : true);

export const desktopNavLink = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium px-3 py-2 ${isActive ? 'text-brand-600 font-bold' : 'text-ink-subtle hover:text-ink-muted'}`;

export const drawerNavLink = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-3 text-base font-medium rounded-lg ${
    isActive ? 'bg-brand-50 text-brand-700 font-bold' : 'text-ink-muted hover:bg-surface-alt'
  }`;
