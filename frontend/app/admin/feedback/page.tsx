'use client';

import { useEffect, useState } from 'react';
import { adminFeedbackApi } from '@/services/api';
import RequireRole from '@/components/RequireRole';
import type { Feedback, FeedbackSummary, Paginated } from '@/types';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];
const STATUS_LABELS: Record<string, string> = { NEW: 'Mới', READ: 'Đã đọc', RESOLVED: 'Đã xử lý' };
const STATUS_CLASSES: Record<string, string> = {
  NEW: 'bg-danger-50 text-danger-600',
  READ: 'bg-warn-50 text-warn-700',
  RESOLVED: 'bg-brand-50 text-brand-700',
};
const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Chung',
  EVENT: 'Sự kiện',
  PAYMENT: 'Thanh toán',
  BUG_REPORT: 'Báo lỗi',
  SUGGESTION: 'Đề xuất',
};

function AdminFeedbackReportInner() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [page, setPage] = useState<Paginated<Feedback>>({ data: [], page: { page: 1, limit: 20, total: 0, hasMore: false } });
  const [filters, setFilters] = useState({ status: '', category: '', pageNum: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', adminNote: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    adminFeedbackApi.summary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, unknown> = { page: filters.pageNum, limit: 20 };
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    adminFeedbackApi.list(params)
      .then(setPage)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key: string, val: string) => setFilters((f) => ({ ...f, [key]: val, pageNum: 1 }));

  const openDetail = (fb: Feedback) => {
    setSelected(fb);
    setStatusUpdate({ status: fb.status, adminNote: fb.adminNote || '' });
    if (fb.status === 'NEW') {
      adminFeedbackApi.updateStatus(fb.id, { status: 'READ' }).then((updated) => {
        setSummary(null);
        adminFeedbackApi.summary().then(setSummary).catch(() => {});
        setPage((p) => ({
          ...p,
          data: p.data.map((x) => (x.id === updated.id ? updated : x)),
        }));
        setSelected(updated);
        setStatusUpdate({ status: updated.status, adminNote: updated.adminNote || '' });
      }).catch(() => {});
    }
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await adminFeedbackApi.updateStatus(selected.id, {
        status: statusUpdate.status,
        adminNote: statusUpdate.adminNote,
      });
      setSelected(updated);
      setPage((p) => ({
        ...p,
        data: p.data.map((x) => (x.id === updated.id ? updated : x)),
      }));
      adminFeedbackApi.summary().then(setSummary).catch(() => {});
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const pageMeta = page.page || { page: 1, limit: 20, total: 0, hasMore: false };

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
        <div className="p-4 border-b border-line flex flex-wrap gap-3 items-center">
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="input text-sm py-1.5 px-3 w-40">
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="READ">Đã đọc</option>
            <option value="RESOLVED">Đã xử lý</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value)}
            className="input text-sm py-1.5 px-3 w-44">
            <option value="">Tất cả loại</option>
            <option value="GENERAL">Chung</option>
            <option value="EVENT">Sự kiện</option>
            <option value="PAYMENT">Thanh toán</option>
            <option value="BUG_REPORT">Báo lỗi</option>
            <option value="SUGGESTION">Đề xuất</option>
          </select>
          <span className="ml-auto text-xs text-ink-subtle">
            {pageMeta.total} phản hồi
          </span>
        </div>

        {error && <div className="p-4 text-danger-600 text-sm">{error}</div>}
        {loading && <div className="p-8 text-center text-ink-subtle text-sm">Đang tải…</div>}

        {!loading && page.data.length === 0 && (
          <div className="p-8 text-center text-ink-subtle text-sm">Chưa có phản hồi nào.</div>
        )}

        {!loading && page.data.length > 0 && (
          <div className="divide-y divide-line">
            {page.data.map((fb) => (
              <button
                key={fb.id}
                type="button"
                onClick={() => openDetail(fb)}
                className="w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLASSES[fb.status] ?? 'bg-surface-alt text-ink-muted'}`}>
                        {STATUS_LABELS[fb.status] ?? fb.status}
                      </span>
                      <span className="text-[10px] text-ink-subtle">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </span>
                      {fb.rating && (
                        <span className="text-[10px] text-warn-700">{'★'.repeat(fb.rating)}</span>
                      )}
                    </div>
                    <div className="font-medium text-sm text-ink mt-0.5 truncate">{fb.subject}</div>
                    <div className="text-xs text-ink-subtle truncate">{fb.userEmail} · {new Date(fb.createdAt).toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {(pageMeta.hasMore || filters.pageNum > 1) && (
          <div className="p-3 border-t border-line flex justify-center gap-3">
            <button
              disabled={filters.pageNum <= 1}
              onClick={() => setFilters((f) => ({ ...f, pageNum: f.pageNum - 1 }))}
              className="chip">
              ← Trước
            </button>
            <span className="text-xs self-center text-ink-subtle">Trang {filters.pageNum}</span>
            <button
              disabled={!pageMeta.hasMore}
              onClick={() => setFilters((f) => ({ ...f, pageNum: f.pageNum + 1 }))}
              className="chip">
              Tiếp →
            </button>
          </div>
        )}
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-pop flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-bold text-ink text-lg">Chi tiết phản hồi #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-surface-alt text-ink-muted">
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <MetaRow label="Người gửi" value={selected.userEmail} />
              <MetaRow label="Loại" value={CATEGORY_LABELS[selected.category] ?? selected.category} />
              {selected.eventTitle && <MetaRow label="Sự kiện" value={selected.eventTitle} />}
              {selected.rating && (
                <MetaRow label="Đánh giá" value={'★'.repeat(selected.rating) + ' (' + selected.rating + '/5)'} />
              )}
              <MetaRow label="Ngày gửi" value={new Date(selected.createdAt).toLocaleString('vi-VN')} />
              <div>
                <div className="text-xs text-ink-subtle font-medium mb-1">Tiêu đề</div>
                <div className="text-sm font-semibold text-ink">{selected.subject}</div>
              </div>
              <div>
                <div className="text-xs text-ink-subtle font-medium mb-1">Nội dung</div>
                <div className="text-sm text-ink-muted whitespace-pre-wrap bg-surface-alt rounded-lg p-3">{selected.body}</div>
              </div>
              {selected.adminNote && (
                <div>
                  <div className="text-xs text-ink-subtle font-medium mb-1">Ghi chú admin</div>
                  <div className="text-sm text-ink-muted whitespace-pre-wrap">{selected.adminNote}</div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-line space-y-3">
              <div className="flex gap-3 items-center">
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate((s) => ({ ...s, status: e.target.value }))}
                  className="input text-sm py-1.5 px-3 flex-1">
                  <option value="NEW">Mới</option>
                  <option value="READ">Đã đọc</option>
                  <option value="RESOLVED">Đã xử lý</option>
                </select>
              </div>
              <textarea
                value={statusUpdate.adminNote}
                onChange={(e) => setStatusUpdate((s) => ({ ...s, adminNote: e.target.value }))}
                placeholder="Ghi chú admin (tùy chọn)…"
                rows={2}
                className="input w-full resize-none text-sm" />
              <button onClick={handleUpdateStatus} disabled={updating} className="btn-primary w-full">
                {updating ? 'Đang lưu…' : 'Cập nhật trạng thái'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ caption, value, accent }: { caption: string; value: React.ReactNode; accent?: string }) {
  const color = accent === 'danger' ? 'text-danger-600' : accent === 'brand' ? 'text-brand-700' : accent === 'warn' ? 'text-warn-700' : 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-subtle">{caption}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-ink-subtle w-28 shrink-0">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function AdminFeedbackReportPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AdminFeedbackReportInner />
    </RequireRole>
  );
}
