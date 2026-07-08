import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatVND } from '@/utils/format';
import type { EventSummary } from '@/types';

const BARS = ['#157F19', '#29D52F', '#B6E8BC', '#FFB800'];

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-ink-subtle">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

/** Read-only ticket-type/section summary with capacity and target revenue. */
export default function TicketTypesPanel({ event }: { event: EventSummary }) {
  const totalCapacity = event.totalSeats;
  const targetRevenue = (event.sections || []).reduce((acc, s) => acc + Number(s.price) * s.seatCount, 0);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="font-bold text-ink">Loại vé</h2>
        <span className="text-xs text-ink-subtle">{(event.sections || []).length} loại</span>
      </div>

      {(event.sections || []).map((s, idx) => (
        <div key={s.name} className="border border-line rounded-xl p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: BARS[idx % 4] }} />
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-ink">{s.name}</div>
            <Link href={`/admin/events/${event.id}/venue`} className="text-xs text-brand-700 hover:underline">
              ✎
            </Link>
          </div>
          <Row label="Giá" value={formatVND(s.price)} />
          <Row label="Số lượng" value={s.seatCount} />
          <Row label="Đã bán" value={s.soldCount} />
          <Row label="Số hàng" value={s.rowCount} />
        </div>
      ))}

      <Link
        href={`/admin/events/${event.id}/venue`}
        className="block text-center py-3 border-2 border-dashed border-line rounded-xl text-brand-700 font-bold hover:bg-brand-50"
      >
        + Thêm loại vé / khu vực
      </Link>

      <div className="border-t border-line pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">Tổng sức chứa</span>
          <span className="font-bold text-ink">{totalCapacity} vé</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Doanh thu mục tiêu</span>
          <span className="font-bold text-brand-700">{formatVND(targetRevenue)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-warn-50 border border-warn-50 p-3 text-xs text-warn-700">
        <div className="font-bold mb-1">⚠ Khi xuất bản</div>
        Toàn bộ ghế trong các khu vực sẽ được mở bán. Hạn chế chỉnh sửa khu vực sau khi đã có vé bán ra.
      </div>
    </div>
  );
}
