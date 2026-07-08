import { formatVND } from '@/utils/format';
import { formatShort, niceCeil, shortDay } from '@/utils/chart';

/** Hand-rolled SVG line/area chart of daily revenue. */
export default function RevenueLineChart({ points }: { points: { date: string; revenue: number }[] }) {
  const W = 720,
    H = 240,
    PAD_L = 48,
    PAD_R = 12,
    PAD_T = 16,
    PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const data = (points || []).map((p) => ({ date: p.date, value: Number(p.revenue) }));
  if (data.length === 0) {
    return <div className="text-ink-subtle text-sm py-12 text-center">Chưa có dữ liệu doanh thu.</div>;
  }
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const niceMax = niceCeil(maxV);
  const xFor = (i: number) => PAD_L + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const yFor = (v: number) => PAD_T + innerH - (v / niceMax) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.value)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${PAD_T + innerH} L ${xFor(0)} ${PAD_T + innerH} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map((p) => ({
    y: PAD_T + innerH - p * innerH,
    label: formatShort(niceMax * p),
  }));

  const xTickIdxs =
    data.length <= 7
      ? data.map((_, i) => i)
      : [
          0,
          Math.floor(data.length / 4),
          Math.floor(data.length / 2),
          Math.floor((3 * data.length) / 4),
          data.length - 1,
        ];

  const last = data.length - 1;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Doanh thu theo ngày">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={g.y} y2={g.y} stroke="#F0F0F0" strokeDasharray="3 3" />
            <text x={PAD_L - 6} y={g.y + 3} textAnchor="end" fontSize="10" fill="#989393">
              {g.label}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + innerH} stroke="#E3E3E3" />
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="#E3E3E3" />

        <path d={areaPath} fill="#157F19" fillOpacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke="#157F19"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const isLast = i === last;
          return (
            <g key={i}>
              <circle
                cx={xFor(i)}
                cy={yFor(d.value)}
                r={isLast ? 5 : 3}
                fill="#157F19"
                stroke={isLast ? 'white' : 'none'}
                strokeWidth={isLast ? 2 : 0}
              >
                <title>
                  {shortDay(d.date)} · {formatVND(d.value)}
                </title>
              </circle>
            </g>
          );
        })}

        {xTickIdxs.map((idx) => (
          <text key={idx} x={xFor(idx)} y={H - 8} fontSize="10" fill="#989393" textAnchor="middle">
            {shortDay(data[idx].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
