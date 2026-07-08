import { formatVND } from '@/utils/format';
import type { Order } from '@/types';

/** Read-only summary of the order's seats and total. */
export default function OrderSummaryCard({ order }: { order: Order }) {
  return (
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
  );
}
