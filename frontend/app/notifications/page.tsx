'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notificationApi } from '@/services/api';
import { groupByDay, relativeFromNow, formatDateTime } from '@/utils/format';
import RequireAuth from '@/components/RequireAuth';
import type { Inbox, NotificationItem } from '@/types';

const TYPE_META: Record<string, { label: string; icon: string; tint: string }> = {
  TICKETS_ISSUED:        { label: 'Vé phát hành',         icon: '🎫', tint: 'bg-brand-100 text-brand-700' },
  EVENT_REMINDER:        { label: 'Nhắc nhở sự kiện',     icon: '⏰', tint: 'bg-warn-50 text-warn-700'   },
  REFUND_ISSUED:         { label: 'Hoàn tiền',            icon: '💰', tint: 'bg-danger-50 text-danger-600' },
  SEAT_RELEASED:         { label: 'Ghế đã giải phóng',    icon: '🪑', tint: 'bg-warn-50 text-warn-700'   },
  CHECKIN_CONFIRMATION:  { label: 'Xác nhận check-in',    icon: '✅', tint: 'bg-brand-100 text-brand-700' },
  OTP:                   { label: 'Mã OTP',               icon: '🔐', tint: 'bg-surface-alt text-ink-muted' },
  WELCOME:               { label: 'Chào mừng',            icon: '👋', tint: 'bg-brand-100 text-brand-700' },
  DEFAULT:               { label: 'Thông báo',            icon: '📥', tint: 'bg-surface-alt text-ink-muted' },
};
const meta = (t: string) => TYPE_META[t] || TYPE_META.DEFAULT;

function NotificationsInner() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const refresh = useCallback(() => {
    notificationApi
      .inbox()
      .then((r) => setInbox(r))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const items = inbox?.items || [];
  const filtered = filter === 'ALL' ? items : items.filter((it) => it.type === filter);
  const groups = useMemo(() => groupByDay(filtered, (it) => it.createdAt), [filtered]);

  const onClickItem = async (it: NotificationItem) => {
    if (it.readAt) return;
    try {
      await notificationApi.markRead(it.id);
      refresh();
    } catch {}
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Hộp thông báo</h1>
        <p className="text-sm text-ink-subtle mt-1">
          Sắp xếp theo thời gian gần nhất · poll mỗi 30 giây
        </p>
      </div>

      {/* Mobile chip filter */}
      <div className="lg:hidden -mx-4 sm:mx-0 overflow-x-auto">
        <div className="flex gap-2 px-4 sm:px-0 pb-2 w-max">
          <FilterChip
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            icon="📥"
            label={`Tất cả (${items.length})`}
          />
          {Object.entries(inbox?.countsByType || {}).map(([type, cnt]) => (
            <FilterChip
              key={type}
              active={filter === type}
              onClick={() => setFilter(type)}
              icon={meta(type).icon}
              label={`${meta(type).label} (${cnt})`}
            />
          ))}
          <button onClick={markAll} className="chip whitespace-nowrap">
            ✓ Đã đọc tất cả
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <aside className="card p-4 h-fit hidden lg:block">
          <div className="text-sm font-bold text-ink mb-2">Loại thông báo</div>
          <FilterRow
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            icon="📥"
            label="Tất cả"
            count={items.length}
          />
          {Object.entries(inbox?.countsByType || {}).map(([type, cnt]) => (
            <FilterRow
              key={type}
              active={filter === type}
              onClick={() => setFilter(type)}
              icon={meta(type).icon}
              label={meta(type).label}
              count={cnt}
            />
          ))}
          <div className="border-t border-line my-3" />
          <button onClick={markAll} className="btn-outline w-full text-sm">
            Đánh dấu đã đọc tất cả
          </button>
        </aside>

        <section className="card p-2 sm:p-4">
          {loading && <div className="p-4 text-ink-subtle">Đang tải…</div>}
          {error && <div className="p-4 text-danger-600">Lỗi: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-ink-subtle">Không có thông báo nào.</div>
          )}

          <Group title="HÔM NAY" items={groups.today} onClick={onClickItem} />
          <Group title="HÔM QUA" items={groups.yesterday} onClick={onClickItem} />
          <Group title="TUẦN NÀY" items={groups.week} onClick={onClickItem} />
          <Group title="CŨ HƠN" items={groups.older} onClick={onClickItem} />
        </section>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button onClick={onClick} className={`chip whitespace-nowrap ${active ? 'chip-active' : ''}`}>
      <span className="mr-1">{icon}</span>{label}
    </button>
  );
}

function FilterRow({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition ${
        active ? 'bg-brand-50 text-brand-700 font-bold' : 'text-ink-muted hover:bg-surface-alt'
      }`}>
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className={active ? 'text-brand-700' : 'text-ink-subtle'}>{count}</span>
    </button>
  );
}

function Group({ title, items, onClick }: { title: string; items: NotificationItem[]; onClick: (it: NotificationItem) => void }) {
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

function NotificationRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const m = meta(item.type);
  const unread = !item.readAt;
  const content = (
    <div className={`rounded-xl p-3 border flex items-start gap-3 transition ${
      unread ? 'bg-brand-50 border-brand-200' : 'bg-white border-line hover:bg-surface-alt'
    }`}>
      <div className="relative mt-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.tint}`}>{m.icon}</div>
        {unread && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={`text-sm leading-snug ${unread ? 'font-bold text-ink' : 'text-ink-muted'}`}>
            {item.title}
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block ${m.tint}`}>{item.type}</span>
        </div>
        {item.content && <div className="text-xs text-ink-muted mt-1 line-clamp-2">{item.content}</div>}
        <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-ink-subtle">
          <span>{item.channel} · {item.status} · {formatDateTime(item.sentAt || item.createdAt)}</span>
          <span>{relativeFromNow(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
  if (item.linkUrl) {
    return <Link href={item.linkUrl} onClick={onClick}>{content}</Link>;
  }
  return <button type="button" className="block w-full text-left" onClick={onClick}>{content}</button>;
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}
