'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { feedbackApi } from '@/services/api';
import RequireAuth from '@/components/RequireAuth';

const CATEGORIES = [
  { value: 'GENERAL', label: 'Góp ý chung' },
  { value: 'EVENT', label: 'Về sự kiện' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'BUG_REPORT', label: 'Báo lỗi' },
  { value: 'SUGGESTION', label: 'Đề xuất' },
];

function FeedbackInner() {
  const router = useRouter();
  const [form, setForm] = useState({
    category: 'GENERAL',
    subject: '',
    body: '',
    rating: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await feedbackApi.submit({
        category: form.category,
        subject: form.subject,
        body: form.body,
        rating: form.rating ? Number(form.rating) : null,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Gửi phản hồi thất bại. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto card p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-bold text-ink">Cảm ơn phản hồi của bạn!</h1>
        <p className="text-ink-muted text-sm">
          Chúng tôi đã nhận được ý kiến của bạn và sẽ xem xét sớm nhất có thể.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={() => router.push('/')} className="btn-ghost">Về trang chủ</button>
          <button onClick={() => { setDone(false); setForm({ category: 'GENERAL', subject: '', body: '', rating: '' }); }}
                  className="btn-primary">Gửi thêm</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Gửi phản hồi</h1>
        <p className="text-ink-muted text-sm mt-1">
          Ý kiến của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Loại phản hồi</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="input w-full">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Tiêu đề <span className="text-danger-600">*</span></label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
            placeholder="Mô tả ngắn gọn vấn đề hoặc ý kiến..."
            maxLength={255}
            required
            className="input w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Nội dung chi tiết <span className="text-danger-600">*</span></label>
          <textarea
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder="Mô tả chi tiết phản hồi của bạn..."
            rows={5}
            required
            className="input w-full resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Đánh giá trải nghiệm (tùy chọn)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set('rating', form.rating === String(n) ? '' : String(n))}
                className={`w-10 h-10 rounded-full border text-base font-bold transition-colors ${
                  form.rating === String(n)
                    ? 'bg-brand-600 text-white border-brand-700'
                    : 'bg-white border-line text-ink-muted hover:border-brand-400'
                }`}>
                {n}
              </button>
            ))}
            {form.rating && (
              <span className="self-center text-xs text-ink-subtle ml-1">
                {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'][Number(form.rating)]}
              </span>
            )}
          </div>
        </div>

        {error && <div className="text-danger-600 text-sm">{error}</div>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang gửi…' : 'Gửi phản hồi'}
        </button>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <RequireAuth>
      <FeedbackInner />
    </RequireAuth>
  );
}
