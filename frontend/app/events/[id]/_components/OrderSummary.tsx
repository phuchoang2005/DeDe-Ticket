import { formatVND } from '@/utils/format';
import type { Seat } from '@/types';

/** Desktop sticky order summary with the selected seats and checkout button. */
export default function OrderSummary({
  selectedSeats,
  total,
  error,
  busy,
  isAuthed,
  onCheckout,
}: {
  selectedSeats: Seat[];
  total: number;
  error: string | null;
  busy: boolean;
  isAuthed: boolean;
  onCheckout: () => void;
}) {
  return (
    <aside className="card p-6 h-fit md:sticky md:top-24 space-y-4 hidden md:block">
      <h3 className="font-bold text-ink">Đơn của bạn</h3>
      {selectedSeats.length === 0 ? (
        <p className="text-sm text-ink-subtle">Chưa chọn ghế nào.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {selectedSeats.map((s) => (
            <li key={s.id} className="flex justify-between">
              <span>
                <span className="font-semibold">{s.section}</span> · {s.rowLabel}-{s.seatNumber}
              </span>
              <span className="text-ink-muted">{formatVND(s.price)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line pt-3 flex justify-between font-bold text-ink">
        <span>Tổng</span>
        <span className="text-brand-700">{formatVND(total)}</span>
      </div>
      {error && <div className="text-danger-600 text-sm">{error}</div>}
      <button
        type="button"
        disabled={selectedSeats.length === 0 || busy}
        onClick={onCheckout}
        className="btn-primary w-full"
      >
        {busy ? 'Đang giữ ghế…' : isAuthed ? 'Tiếp tục thanh toán' : 'Đăng nhập để tiếp tục'}
      </button>
      <p className="text-xs text-ink-subtle text-center">Ghế sẽ được giữ tối đa 10 phút sau khi bạn xác nhận.</p>
    </aside>
  );
}
