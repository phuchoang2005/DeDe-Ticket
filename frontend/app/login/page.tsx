'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Người dùng', email: 'demo@dede.test', password: 'demo1234', tag: 'bg-brand-100 text-brand-700' },
  { role: 'Ban tổ chức', email: 'organizer@dede.test', password: 'org12345', tag: 'bg-warn-50 text-warn-700' },
  { role: 'Quản trị viên', email: 'admin@dede.test', password: 'admin1234', tag: 'bg-danger-50 text-danger-600' },
];

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/';

  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.replace(from);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillAccount = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto card p-6 sm:p-8 mt-4 sm:mt-8">
      <div className="text-center mb-6">
        <div className="inline-block w-12 h-12 rounded-xl bg-brand-600 mb-3" />
        <h1 className="text-2xl font-bold text-ink">Chào mừng trở lại</h1>
        <p className="text-sm text-ink-subtle mt-1">Đăng nhập để đặt vé hoặc quản trị sự kiện</p>
      </div>

      <div className="mb-5 rounded-xl border border-line bg-surface-alt p-3 space-y-2">
        <div className="text-xs font-bold text-ink-subtle uppercase tracking-wide px-1">
          Tài khoản demo · bấm để điền sẵn
        </div>
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => fillAccount(acc)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left border transition ${
              email === acc.email
                ? 'bg-white border-brand-600 ring-1 ring-brand-600/20'
                : 'bg-white border-line hover:border-brand-200'
            }`}
          >
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${acc.tag}`}>{acc.role}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-ink font-medium truncate">{acc.email}</span>
              <span className="block text-[11px] text-ink-subtle">mật khẩu: {acc.password}</span>
            </span>
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Mật khẩu</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
        </div>
        {error && <div className="text-danger-600 text-sm">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-muted mt-6">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-brand-700 font-semibold hover:underline">
          Tạo tài khoản
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-ink-subtle">Đang tải…</div>}>
      <LoginInner />
    </Suspense>
  );
}
