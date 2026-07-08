import type { ReactNode } from 'react';
import { SEAT_STATUS_FILL } from '@/utils/chartColors';
import type { Seat, Section } from '@/types';

function Stat({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className="bg-surface-alt rounded-xl p-3">
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-brand-700' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function groupSeatsByRow(seats: Seat[]): [string, Seat[]][] {
  const map = new Map<string, Seat[]>();
  for (const s of seats) {
    if (!map.has(s.rowLabel)) map.set(s.rowLabel, []);
    map.get(s.rowLabel)!.push(s);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

/** Right pane: editable section name/price, stats and the seat grid. */
export default function SectionDetail({
  section,
  seats,
  onUpdate,
  onRemove,
}: {
  section: Section | undefined;
  seats: Seat[];
  onUpdate: (oldName: string, name: string, price: number) => void;
  onRemove: (name: string) => void;
}) {
  if (!section) {
    return (
      <div className="card p-5 space-y-4">
        <div className="text-center py-12 text-ink-subtle">Chọn một khu vực để chỉnh sửa.</div>
      </div>
    );
  }
  const rowGroups = groupSeatsByRow(seats);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <input
            className="field-input max-w-[200px]"
            defaultValue={section.name}
            key={section.name + '-name'}
            onBlur={(e) => e.target.value !== section.name && onUpdate(section.name, e.target.value, section.price)}
          />
          <input
            type="number"
            className="field-input max-w-[160px]"
            defaultValue={section.price}
            key={section.name + '-price'}
            onBlur={(e) =>
              Number(e.target.value) !== Number(section.price) &&
              onUpdate(section.name, section.name, Number(e.target.value))
            }
          />
        </div>
        <button
          onClick={() => onRemove(section.name)}
          className="px-3 py-2 rounded-lg text-sm text-danger-600 bg-danger-50 border border-danger-200"
        >
          Xoá khu
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Số hàng" value={section.rowCount} />
        <Stat label="Tổng ghế" value={section.seatCount} />
        <Stat label="Đã bán" value={section.soldCount} highlight />
      </div>

      <div className="bg-brand-600 text-white text-center py-3 rounded-full font-bold">SÂN KHẤU</div>

      <div className="overflow-auto py-4">
        {rowGroups.map(([row, list]) => (
          <div key={row} className="flex items-center gap-2 mb-3">
            <div className="w-12 text-right">
              <div className="font-bold text-ink">{row}</div>
              <div className="text-[10px] text-ink-subtle">{list.length} ghế</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {list.map((s) => (
                <div
                  key={s.id}
                  title={`${s.rowLabel}${s.seatNumber} · ${s.status}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: SEAT_STATUS_FILL[s.status] || '#989393' }}
                >
                  {s.seatNumber}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line pt-3 text-xs text-ink-muted space-y-1">
        <div>• Mỗi ghế trong một khu vực phải có hàng và số duy nhất.</div>
        <div>• Khi nhiều người đặt cùng lúc, hệ thống tự khoá ghế để tránh trùng vé.</div>
        <div>• Không thể xoá khu vực đang có vé đã giữ chỗ hoặc đã thanh toán.</div>
      </div>
    </div>
  );
}
