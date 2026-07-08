import { DONUT_COLORS } from '@/utils/chartColors';

/** Donut chart of event counts per category with a legend. */
export default function CategoryDonut({ rows }: { rows: { category: string; eventCount: number }[] }) {
  const data = (rows || []).filter((r) => r.eventCount > 0);
  if (data.length === 0) {
    return <div className="text-ink-subtle text-sm py-8 text-center">Chưa có dữ liệu.</div>;
  }
  const total = data.reduce((acc, r) => acc + r.eventCount, 0);
  const size = 180,
    stroke = 28,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
          {data.map((row, i) => {
            const frac = row.eventCount / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={row.category}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              >
                <title>
                  {row.category}: {row.eventCount} sự kiện ({(frac * 100).toFixed(1)}%)
                </title>
              </circle>
            );
            offset += dash;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xs text-ink-subtle">Tổng</div>
          <div className="text-xl font-bold text-ink">{total}</div>
          <div className="text-[10px] text-ink-subtle">sự kiện</div>
        </div>
      </div>
      <div className="flex-1 min-w-[180px] space-y-1.5">
        {data.map((row, i) => (
          <div key={row.category} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="text-ink-muted truncate flex-1">{row.category}</span>
            <span className="text-ink font-medium">{row.eventCount}</span>
            <span className="text-ink-subtle text-xs w-12 text-right">
              {((row.eventCount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
