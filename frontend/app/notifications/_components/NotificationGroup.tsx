import Link from 'next/link';
import { formatDateTime, relativeFromNow } from '@/utils/format';
import { meta } from '../_constants';
import type { NotificationItem } from '@/types';

function NotificationRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const m = meta(item.type);
  const unread = !item.readAt;
  const content = (
    <div
      className={`rounded-xl p-3 border flex items-start gap-3 transition ${
        unread ? 'bg-brand-50 border-brand-200' : 'bg-white border-line hover:bg-surface-alt'
      }`}
    >
      <div className="relative mt-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.tint}`}>{m.icon}</div>
        {unread && (
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={`text-sm leading-snug ${unread ? 'font-bold text-ink' : 'text-ink-muted'}`}>{item.title}</div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block ${m.tint}`}>
            {item.type}
          </span>
        </div>
        {item.content && <div className="text-xs text-ink-muted mt-1 line-clamp-2">{item.content}</div>}
        <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-ink-subtle">
          <span>
            {item.channel} · {item.status} · {formatDateTime(item.sentAt || item.createdAt)}
          </span>
          <span>{relativeFromNow(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
  if (item.linkUrl)
    return (
      <Link href={item.linkUrl} onClick={onClick}>
        {content}
      </Link>
    );
  return (
    <button type="button" className="block w-full text-left" onClick={onClick}>
      {content}
    </button>
  );
}

/** A dated group of notification rows (hidden when empty). */
export default function NotificationGroup({
  title,
  items,
  onClick,
}: {
  title: string;
  items: NotificationItem[];
  onClick: (it: NotificationItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="px-2 py-2 text-xs font-bold text-ink-subtle">{title}</div>
      <div className="space-y-2">
        {items.map((it) => (
          <NotificationRow key={it.id} item={it} onClick={() => onClick(it)} />
        ))}
      </div>
    </div>
  );
}
