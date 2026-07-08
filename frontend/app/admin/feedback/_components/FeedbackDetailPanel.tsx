import type { ReactNode } from 'react';
import CloseIcon from '@/components/icons/CloseIcon';
import { CATEGORY_LABELS } from '../_constants';
import type { Feedback } from '@/types';

interface StatusUpdate {
  status: string;
  adminNote: string;
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-ink-subtle w-28 shrink-0">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

/** Slide-over showing a feedback's full detail and a status/note update form. */
export default function FeedbackDetailPanel({
  feedback,
  statusUpdate,
  updating,
  onClose,
  onChange,
  onSubmit,
}: {
  feedback: Feedback;
  statusUpdate: StatusUpdate;
  updating: boolean;
  onClose: () => void;
  onChange: (patch: Partial<StatusUpdate>) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-pop flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-bold text-ink text-lg">Chi tiết phản hồi #{feedback.id}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-muted">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <MetaRow label="Người gửi" value={feedback.userEmail} />
          <MetaRow label="Loại" value={CATEGORY_LABELS[feedback.category] ?? feedback.category} />
          {feedback.eventTitle && <MetaRow label="Sự kiện" value={feedback.eventTitle} />}
          {feedback.rating && (
            <MetaRow label="Đánh giá" value={'★'.repeat(feedback.rating) + ' (' + feedback.rating + '/5)'} />
          )}
          <MetaRow label="Ngày gửi" value={new Date(feedback.createdAt).toLocaleString('vi-VN')} />
          <div>
            <div className="text-xs text-ink-subtle font-medium mb-1">Tiêu đề</div>
            <div className="text-sm font-semibold text-ink">{feedback.subject}</div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle font-medium mb-1">Nội dung</div>
            <div className="text-sm text-ink-muted whitespace-pre-wrap bg-surface-alt rounded-lg p-3">
              {feedback.body}
            </div>
          </div>
          {feedback.adminNote && (
            <div>
              <div className="text-xs text-ink-subtle font-medium mb-1">Ghi chú admin</div>
              <div className="text-sm text-ink-muted whitespace-pre-wrap">{feedback.adminNote}</div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-line space-y-3">
          <div className="flex gap-3 items-center">
            <select
              value={statusUpdate.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="input text-sm py-1.5 px-3 flex-1"
            >
              <option value="NEW">Mới</option>
              <option value="READ">Đã đọc</option>
              <option value="RESOLVED">Đã xử lý</option>
            </select>
          </div>
          <textarea
            value={statusUpdate.adminNote}
            onChange={(e) => onChange({ adminNote: e.target.value })}
            placeholder="Ghi chú admin (tùy chọn)…"
            rows={2}
            className="input w-full resize-none text-sm"
          />
          <button onClick={onSubmit} disabled={updating} className="btn-primary w-full">
            {updating ? 'Đang lưu…' : 'Cập nhật trạng thái'}
          </button>
        </div>
      </div>
    </>
  );
}
