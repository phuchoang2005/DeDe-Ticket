import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('demo@dede.test');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-6 sm:p-8 mt-4 sm:mt-8">
      <div className="text-center mb-6">
        <div className="inline-block w-12 h-12 rounded-xl bg-brand-600 mb-3" />
        <h1 className="text-2xl font-bold text-ink">Chào mừng trở lại</h1>
        <p className="text-sm text-ink-subtle mt-1">
          Tài khoản demo: <code className="text-brand-700">demo@dede.test</code> / <code className="text-brand-700">demo1234</code>
        </p>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="field-label">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Mật khẩu</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
        </div>
        {error && <div className="text-danger-600 text-sm">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-muted mt-6">
        Chưa có tài khoản? <Link to="/register" className="text-brand-700 font-semibold hover:underline">Tạo tài khoản</Link>
      </p>
    </div>
  );
}
