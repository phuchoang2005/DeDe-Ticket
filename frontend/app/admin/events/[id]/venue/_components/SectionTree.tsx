import { formatVND } from '@/utils/format';
import { SECTION_BARS } from '@/utils/chartColors';
import type { EventSummary } from '@/types';

/** Left rail: list of sections plus an "add section" button. */
export default function SectionTree({
  event,
  selectedSection,
  onSelect,
  onAdd,
}: {
  event: EventSummary;
  selectedSection: string | null;
  onSelect: (name: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="font-bold text-ink">Cây khu vực</div>
        <span className="text-xs text-ink-subtle">{(event.sections || []).length} khu</span>
      </div>

      {(event.sections || []).map((s, idx) => (
        <button
          key={s.name}
          onClick={() => onSelect(s.name)}
          className={`w-full text-left p-3 rounded-xl border transition-colors ${
            selectedSection === s.name ? 'bg-brand-50 border-brand-600' : 'bg-white border-line hover:border-brand-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="w-2 h-8 rounded" style={{ background: SECTION_BARS[idx % SECTION_BARS.length] }} />
            <div className="flex-1">
              <div className="font-bold text-ink">{s.name}</div>
              <div className="text-xs text-ink-subtle">
                {s.rowCount} hàng · {s.seatCount} ghế · {formatVND(s.price)}
              </div>
            </div>
          </div>
        </button>
      ))}

      <button
        onClick={onAdd}
        className="w-full py-3 border-2 border-dashed border-line rounded-xl text-brand-700 font-bold hover:bg-brand-50"
      >
        + Thêm khu vực
      </button>

      <div className="border-t border-line pt-3 space-y-1 text-xs text-ink-subtle">
        <div>Mỗi khu vực bao gồm nhiều hàng và số ghế cố định.</div>
        <div>Sau khi xuất bản, hệ thống tự sinh sơ đồ chỗ ngồi cho từng vé.</div>
      </div>
    </div>
  );
}
