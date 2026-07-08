import Link from 'next/link';
import { formatVND } from '@/utils/format';
import type { Order } from '@/types';

const METHODS = [
  { key: 'MOMO', label: 'MoMo', desc: 'Ví điện tử' },
  { key: 'VNPAY', label: 'VNPay', desc: 'Thẻ ATM nội địa' },
  { key: 'MOCK', label: 'Thẻ Visa/Mastercard', desc: 'Giả lập' },
];

/** Payment method picker + pay button (mock gateway — always succeeds). */
export default function PaymentMethods({
  order,
  method,
  onSelect,
  isPaid,
  busy,
  error,
  onPay,
}: {
  order: Order;
  method: string;
  onSelect: (key: string) => void;
  isPaid: boolean;
  busy: boolean;
  error: string | null;
  onPay: () => void;
}) {
  return (
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
            onClick={() => onSelect(m.key)}
            disabled={isPaid}
            className={`text-left p-4 rounded-lg border transition ${
              method === m.key
                ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200'
                : 'border-line hover:border-brand-400'
            } disabled:opacity-60`}
          >
            <div className="font-semibold text-ink">{m.label}</div>
            <div className="text-xs text-ink-subtle mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>
      {error && <div className="text-danger-600 text-sm mt-4">{error}</div>}
      {isPaid ? (
        <div className="mt-5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 p-3 text-sm">
          ✅ Đơn hàng đã thanh toán.{' '}
          <Link href="/tickets" className="font-semibold underline">
            Xem vé của bạn →
          </Link>
        </div>
      ) : (
        <button onClick={onPay} disabled={busy} className="btn-primary w-full mt-5">
          {busy ? 'Đang xử lý…' : `Thanh toán ${formatVND(order.totalAmount)}`}
        </button>
      )}
    </section>
  );
}
