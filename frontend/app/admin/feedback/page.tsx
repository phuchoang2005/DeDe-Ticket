'use client';

import RequireRole from '@/components/RequireRole';
import KpiCard from '@/components/ui/KpiCard';
import { useAdminFeedback } from './_hooks/useAdminFeedback';
import FeedbackFilters from './_components/FeedbackFilters';
import FeedbackList from './_components/FeedbackList';
import FeedbackDetailPanel from './_components/FeedbackDetailPanel';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];

function AdminFeedbackReportInner() {
  const fb = useAdminFeedback();
  const { summary, page, filters, loading, error, selected, statusUpdate, updating, pageMeta } = fb;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Phản hồi người dùng</h1>
        <p className="text-xs text-ink-subtle mt-1">Xem và xử lý ý kiến từ khách hàng</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard caption="Tổng phản hồi" value={summary.total} />
          <KpiCard caption="Chưa đọc" value={summary.newCount} accent="danger" />
          <KpiCard caption="Đã xử lý" value={summary.resolvedCount} accent="brand" />
          <KpiCard
            caption="Điểm trung bình"
            value={summary.avgRating != null ? summary.avgRating.toFixed(1) + ' / 5' : '—'}
            accent="warn"
          />
        </div>
      )}

      <div className="card">
        <FeedbackFilters
          status={filters.status}
          category={filters.category}
          total={pageMeta.total}
          onFilter={fb.setFilter}
        />

        {error && <div className="p-4 text-danger-600 text-sm">{error}</div>}
        {loading && <div className="p-8 text-center text-ink-subtle text-sm">Đang tải…</div>}
        {!loading && page.data.length === 0 && (
          <div className="p-8 text-center text-ink-subtle text-sm">Chưa có phản hồi nào.</div>
        )}
        {!loading && page.data.length > 0 && <FeedbackList items={page.data} onOpen={fb.openDetail} />}

        {(pageMeta.hasMore || filters.pageNum > 1) && (
          <div className="p-3 border-t border-line flex justify-center gap-3">
            <button disabled={filters.pageNum <= 1} onClick={() => fb.changePage(-1)} className="chip">
              ← Trước
            </button>
            <span className="text-xs self-center text-ink-subtle">Trang {filters.pageNum}</span>
            <button disabled={!pageMeta.hasMore} onClick={() => fb.changePage(1)} className="chip">
              Tiếp →
            </button>
          </div>
        )}
      </div>

      {selected && (
        <FeedbackDetailPanel
          feedback={selected}
          statusUpdate={statusUpdate}
          updating={updating}
          onClose={() => fb.setSelected(null)}
          onChange={(patch) => fb.setStatusUpdate((s) => ({ ...s, ...patch }))}
          onSubmit={fb.handleUpdateStatus}
        />
      )}
    </div>
  );
}

export default function AdminFeedbackReportPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AdminFeedbackReportInner />
    </RequireRole>
  );
}
