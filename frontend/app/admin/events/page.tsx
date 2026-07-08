'use client';

import Link from 'next/link';
import RequireRole from '@/components/RequireRole';
import { useAdminEvents } from './_hooks/useAdminEvents';
import EventsTable from './_components/EventsTable';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];
const STATUS_FILTERS = ['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];

function AdminEventsListInner() {
  const { rows, loading, error, filter, setFilter, filtered, remove, create } = useAdminEvents();

  if (loading) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;
  if (error) return <div className="card p-6 text-danger-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Quản lý sự kiện</h1>
          <p className="text-sm text-ink-subtle mt-1">{rows.length} sự kiện</p>
        </div>
        <button onClick={create} className="btn-primary">
          + Tạo sự kiện mới
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? 'chip-active' : ''}`}>
            {s === 'ALL' ? 'Tất cả' : s}
          </button>
        ))}
      </div>

      <EventsTable rows={filtered} onRemove={remove} />

      <div className="flex gap-3 text-sm">
        <Link href="/admin/analytics" className="btn-outline">
          📊 Bảng phân tích
        </Link>
      </div>
    </div>
  );
}

export default function AdminEventsListPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AdminEventsListInner />
    </RequireRole>
  );
}
