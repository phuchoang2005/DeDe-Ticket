import Link from 'next/link';
import BellIcon from '@/components/icons/BellIcon';

/** Header bell linking to the inbox, with an unread-count badge. */
export default function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative p-2 rounded-full hover:bg-surface-alt text-ink-muted"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-600 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
