import { formatVND } from '@/utils/format';
import { lockCountdown } from '@/utils/datetime';
import type { Seat } from '@/types';

export interface SeatSection {
  section: string;
  price: number;
  rows: { row: string; seats: Seat[] }[];
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-4 rounded border ${className}`} />
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}

/** Interactive seat map grouped by section/row. Emits `onToggle` per seat. */
export default function SeatMap({
  grouped,
  selected,
  now,
  onToggle,
}: {
  grouped: SeatSection[];
  selected: Set<number>;
  now: number;
  onToggle: (seat: Seat) => void;
}) {
  return (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg font-bold mb-1">Sơ đồ ghế ngồi</h2>
      <p className="text-sm text-ink-subtle mb-4">
        Click vào ghế trống để chọn. Ghế đang giữ hoặc đã bán không thể chọn.
      </p>

      <div className="mb-6">
        <div className="mx-auto w-2/3 h-8 rounded-t-full bg-brand-100 border border-b-0 border-brand-200 flex items-center justify-center text-xs font-bold text-brand-700 tracking-widest">
          SÂN KHẤU
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs mb-5">
        <Legend className="bg-white border-line" label="Trống" />
        <Legend className="bg-brand-600 border-brand-700" label="Đang chọn" />
        <Legend className="bg-warn-400 border-warn-700" label="Đang giữ (hiện đếm ngược)" />
        <Legend className="bg-ink-faint border-ink-muted" label="Đã bán" />
      </div>

      <div className="space-y-6">
        {grouped.map(({ section, rows, price }) => (
          <div key={section}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-ink">{section}</div>
              <div className="text-xs text-ink-subtle">{formatVND(price)} / ghế</div>
            </div>
            <div className="space-y-1.5 overflow-x-auto">
              {rows.map(({ row, seats }) => (
                <div key={row} className="flex items-center gap-1.5">
                  <div className="w-6 text-xs text-ink-subtle font-bold">{row}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {seats.map((s) => {
                      const isSel = selected.has(s.id);
                      const cls = isSel
                        ? 'bg-brand-600 text-white border-brand-700'
                        : s.status === 'AVAILABLE'
                          ? 'bg-white border-line hover:border-brand-600 text-ink-muted'
                          : s.status === 'LOCKED'
                            ? 'bg-warn-400 text-white border-warn-700 cursor-not-allowed'
                            : 'bg-ink-faint text-white border-ink-muted cursor-not-allowed';
                      const countdown =
                        s.status === 'LOCKED' && s.lockedUntil ? lockCountdown(s.lockedUntil, now) : null;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={s.status !== 'AVAILABLE'}
                          onClick={() => onToggle(s)}
                          title={
                            countdown
                              ? `${section} ${s.rowLabel}-${s.seatNumber} · Đang giữ, còn ${countdown}`
                              : `${section} ${s.rowLabel}-${s.seatNumber} · ${formatVND(s.price)}`
                          }
                          className={`w-8 h-8 text-[11px] font-semibold rounded border ${cls}`}
                        >
                          {countdown ?? s.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
