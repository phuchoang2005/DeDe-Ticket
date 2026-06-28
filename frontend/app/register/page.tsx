'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-6 sm:p-8 mt-4 sm:mt-8">
      <div className="text-center mb-6">
        <div className="inline-block w-12 h-12 rounded-xl bg-brand-600 mb-3" />
        <h1 className="text-2xl font-bold text-ink">Tạo tài khoản Dề Dê</h1>
        <p className="text-sm text-ink-subtle mt-1">Để giữ ghế và nhận thông báo vé</p>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="field-label">Họ và tên</label>
          <input required value={form.fullName} onChange={update('fullName')} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" required value={form.email} onChange={update('email')} className="field-input" />
        </div>
        <div>
          <label className="field-label">Số điện thoại (tùy chọn)</label>
          <input value={form.phone} onChange={update('phone')} className="field-input" />
        </div>
        <div>
          <label className="field-label">Mật khẩu (≥ 6 ký tự)</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update('password')}
            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Mật khẩu phải có từ 6 đến 100 ký tự.')}
            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            className="field-input"
          />
        </div>
        {error && <div className="text-danger-600 text-sm">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-muted mt-6">
        Đã có tài khoản? <Link href="/login" className="text-brand-700 font-semibold hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}
