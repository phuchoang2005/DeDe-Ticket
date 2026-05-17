import { useEffect, useState } from 'react';
import { userApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { initials } from '../utils/format';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [status, setStatus] = useState({ kind: null, message: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || '', phone: user.phone || '' });
  }, [user]);

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: null, message: null });
    try {
      const updated = await userApi.update(form);
      setUser(updated);
      setStatus({ kind: 'success', message: 'Đã cập nhật thông tin.' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-ink">Hồ sơ của bạn</h1>

      <div className="card p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-200 text-brand-700 font-bold text-xl sm:text-2xl flex items-center justify-center shrink-0">
          {initials(user.fullName || user.email)}
        </div>
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold text-ink truncate">{user.fullName || 'Người dùng'}</div>
          <div className="text-sm text-ink-subtle truncate">{user.email}</div>
          <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
            Vai trò: {user.role}
          </div>
        </div>
      </div>

      <form className="card p-4 sm:p-6 space-y-4" onSubmit={submit}>
        <h2 className="font-bold text-ink">Thông tin cá nhân</h2>
        <div>
          <label className="field-label">Họ và tên</label>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="field-input" />
        </div>
        <div>
          <label className="field-label">Số điện thoại</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field-input" />
        </div>
        {status.message && (
          <div className={status.kind === 'success' ? 'text-brand-700 text-sm' : 'text-danger-600 text-sm'}>
            {status.message}
          </div>
        )}
        <button disabled={busy} className="btn-primary">
          {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
