import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-6 sm:p-8 mt-4 sm:mt-8">
      <div className="text-center mb-6">
        <img src="/icon-on-green.png" alt="Dề Dê" className="inline-block w-12 h-12 rounded-xl object-cover mb-3" />
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
            onInvalid={(e) => e.target.setCustomValidity('Mật khẩu phải có từ 6 đến 100 ký tự.')}
            onInput={(e) => e.target.setCustomValidity('')}
            className="field-input"
          />
        </div>
        {error && <div className="text-danger-600 text-sm">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-muted mt-6">
        Đã có tài khoản? <Link to="/login" className="text-brand-700 font-semibold hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}
