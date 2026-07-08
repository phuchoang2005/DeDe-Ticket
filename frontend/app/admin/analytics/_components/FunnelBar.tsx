/** One horizontal bar in the payment funnel (value + percentage of total). */
export default function FunnelBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span>{label}</span>
        <span>
          {value} · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-6 rounded bg-surface-alt overflow-hidden">
        <div className="h-full" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
