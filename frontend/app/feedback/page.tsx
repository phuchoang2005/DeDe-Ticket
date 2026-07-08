'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { feedbackApi } from '@/services/api';
import RequireAuth from '@/components/RequireAuth';
import FeedbackForm, { type FeedbackFormState } from './_components/FeedbackForm';
import FeedbackSuccess from './_components/FeedbackSuccess';

const EMPTY: FeedbackFormState = { category: 'GENERAL', subject: '', body: '', rating: '' };

function FeedbackInner() {
  const router = useRouter();
  const [form, setForm] = useState<FeedbackFormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setField = (field: keyof FeedbackFormState, value: string) => setForm((f) => ({ ...f, [field]: value }));

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
      <FeedbackSuccess
        onHome={() => router.push('/')}
        onAgain={() => {
          setDone(false);
          setForm(EMPTY);
        }}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Gửi phản hồi</h1>
        <p className="text-ink-muted text-sm mt-1">Ý kiến của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn.</p>
      </div>
      <FeedbackForm form={form} onField={setField} busy={busy} error={error} onSubmit={handleSubmit} />
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
