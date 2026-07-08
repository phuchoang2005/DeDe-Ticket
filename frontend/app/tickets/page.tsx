'use client';

import { Suspense } from 'react';
import Pagination from '@/components/Pagination';
import RequireAuth from '@/components/RequireAuth';
import { useMyTickets } from './_hooks/useMyTickets';
import TicketRow from './_components/TicketRow';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'VALID', label: 'Còn hiệu lực' },
  { key: 'USED', label: 'Đã sử dụng' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

function MyTicketsInner() {
  const { tickets, counts, meta, error, loading, tab, justPaid, remove, setTabAndReset, goPage, totalPages } =
    useMyTickets();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Vé của tôi</h1>
        <p className="text-sm text-ink-subtle mt-1">Tất cả vé đã mua từ tài khoản của bạn · {counts.all || 0} vé</p>
      </div>

      {justPaid && (
        <div className="rounded-xl bg-brand-50 border border-brand-200 text-brand-700 p-4 text-sm flex items-center gap-2">
          ✅ Thanh toán đơn #{justPaid} thành công. Vé của bạn ở dưới đây.
        </div>
      )}

      <div className="card p-2 overflow-x-auto">
        <div className="flex gap-1 w-max sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTabAndReset(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-alt'
              }`}
            >
              {t.label} ({counts[t.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-ink-subtle">Đang tải…</div>}
      {error && <div className="text-danger-600">Lỗi: {error}</div>}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-ink-subtle">Chưa có vé nào trong mục này.</div>
      )}

      <div className="space-y-4">
        {tickets.map((t) => (
          <TicketRow key={t.id} ticket={t} onDelete={() => remove(t.id)} />
        ))}
      </div>

      <Pagination page={meta.page} totalPages={totalPages} onChange={goPage} />
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="text-ink-subtle">Đang tải…</div>}>
        <MyTicketsInner />
      </Suspense>
    </RequireAuth>
  );
}
