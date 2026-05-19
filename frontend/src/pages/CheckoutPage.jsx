import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { orderApi } from '../services/api';
import { formatVND } from '../utils/format';

const METHODS = [
  { key: 'MOMO', label: 'MoMo', desc: 'Ví điện tử' },
  { key: 'VNPAY', label: 'VNPay', desc: 'Thẻ ATM nội địa' },
  { key: 'MOCK', label: 'Thẻ Visa/Mastercard', desc: 'Giả lập' },
];

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('MOMO');
  const paidRef = useRef(false);

  useEffect(() => {
    orderApi.get(id).then(setOrder).catch((err) => setError(err.message));
  }, [id]);

  // Release seat locks when user navigates away (SPA navigation) without paying.
  // Browser close / hard refresh: sweeper releases after 10-min TTL.
  useEffect(() => {
    return () => {
      if (!paidRef.current) {
        orderApi.cancel(id).catch(() => {});
      }
    };
  }, [id]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const paid = await orderApi.pay(id, method);
      paidRef.current = true;
      setOrder(paid);
      navigate('/tickets', { state: { justPaidOrder: paid.id } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !order) return <div className="text-danger-600">Không thể tải: {error}</div>;
  if (!order) return <div className="text-ink-subtle">Đang tải…</div>;

  const isPaid = order.status === 'PAID';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Thanh toán</h1>
        <Link to={`/events/${order.eventId}`} className="text-sm text-brand-700 hover:underline">
          ← Quay lại sự kiện
        </Link>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <Step idx={1} label="Chọn sự kiện" done />
        <StepLine />
        <Step idx={2} label="Chọn ghế" done />
        <StepLine />
        <Step idx={3} label="Thanh toán" active />
      </div>

      <section className="card p-4 sm:p-6">
        <h2 className="font-bold text-ink">Đơn hàng #{order.id}</h2>
        <div className="text-sm text-ink-subtle mt-0.5">{order.eventTitle}</div>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((it) => (
            <li key={it.id} className="py-2.5 flex justify-between text-sm">
              <span>
                <span className="font-semibold">{it.section}</span> · {it.rowLabel}-{it.seatNumber}
              </span>
              <span className="text-ink-muted">{formatVND(it.price)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t border-line">
          <span>Tổng cộng</span>
          <span className="text-brand-700">{formatVND(order.totalAmount)}</span>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="font-bold text-ink mb-1">Phương thức thanh toán</h2>
        <p className="text-xs text-ink-subtle mb-4">
          Sandbox của các cổng thanh toán chưa được kết nối — bấm thanh toán sẽ tự động thành công.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {METHODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              disabled={isPaid}
              className={`text-left p-4 rounded-lg border transition ${
                method === m.key
                  ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200'
                  : 'border-line hover:border-brand-400'
              } disabled:opacity-60`}>
              <div className="font-semibold text-ink">{m.label}</div>
              <div className="text-xs text-ink-subtle mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
        {error && <div className="text-danger-600 text-sm mt-4">{error}</div>}
        {isPaid ? (
          <div className="mt-5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 p-3 text-sm">
            ✅ Đơn hàng đã thanh toán. <Link to="/tickets" className="font-semibold underline">Xem vé của bạn →</Link>
          </div>
        ) : (
          <button onClick={pay} disabled={busy} className="btn-primary w-full mt-5">
            {busy ? 'Đang xử lý…' : `Thanh toán ${formatVND(order.totalAmount)}`}
          </button>
        )}
      </section>
    </div>
  );
}

function Step({ idx, label, active, done }) {
  const cls = active
    ? 'bg-brand-600 text-white border-brand-600'
    : done
      ? 'bg-brand-100 text-brand-700 border-brand-200'
      : 'bg-white text-ink-subtle border-line';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center ${cls}`}>{idx}</span>
      <span className={active ? 'font-bold text-ink' : 'text-ink-subtle'}>{label}</span>
    </div>
  );
}
function StepLine() {
  return <span className="h-px w-12 bg-line" />;
}
