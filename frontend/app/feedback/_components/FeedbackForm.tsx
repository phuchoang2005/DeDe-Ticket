export interface FeedbackFormState {
  category: string;
  subject: string;
  body: string;
  rating: string;
}

const CATEGORIES = [
  { value: 'GENERAL', label: 'Góp ý chung' },
  { value: 'EVENT', label: 'Về sự kiện' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'BUG_REPORT', label: 'Báo lỗi' },
  { value: 'SUGGESTION', label: 'Đề xuất' },
];

const RATING_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'];

/** Feedback submission form (category, subject, body and optional 1–5 rating). */
export default function FeedbackForm({
  form,
  onField,
  busy,
  error,
  onSubmit,
}: {
  form: FeedbackFormState;
  onField: (field: keyof FeedbackFormState, value: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Loại phản hồi</label>
        <select value={form.category} onChange={(e) => onField('category', e.target.value)} className="input w-full">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Tiêu đề <span className="text-danger-600">*</span>
        </label>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => onField('subject', e.target.value)}
          placeholder="Mô tả ngắn gọn vấn đề hoặc ý kiến..."
          maxLength={255}
          required
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Nội dung chi tiết <span className="text-danger-600">*</span>
        </label>
        <textarea
          value={form.body}
          onChange={(e) => onField('body', e.target.value)}
          placeholder="Mô tả chi tiết phản hồi của bạn..."
          rows={5}
          required
          className="input w-full resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Đánh giá trải nghiệm (tùy chọn)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onField('rating', form.rating === String(n) ? '' : String(n))}
              className={`w-10 h-10 rounded-full border text-base font-bold transition-colors ${
                form.rating === String(n)
                  ? 'bg-brand-600 text-white border-brand-700'
                  : 'bg-white border-line text-ink-muted hover:border-brand-400'
              }`}
            >
              {n}
            </button>
          ))}
          {form.rating && (
            <span className="self-center text-xs text-ink-subtle ml-1">{RATING_LABELS[Number(form.rating)]}</span>
          )}
        </div>
      </div>

      {error && <div className="text-danger-600 text-sm">{error}</div>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Đang gửi…' : 'Gửi phản hồi'}
      </button>
    </form>
  );
}
