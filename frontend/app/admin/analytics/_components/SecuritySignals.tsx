import { SEVERITY } from '@/utils/chartColors';

type Signal = { code: string; label: string; count: number; severity: string };

/** Severity-tinted bar list of operational/security signals. */
export default function SecuritySignals({ signals }: { signals: Signal[] }) {
  const maxV = Math.max(1, ...signals.map((s) => Number(s.count)));
  return (
    <div className="space-y-3">
      {signals.map((s) => {
        const sev = SEVERITY[s.severity] || SEVERITY.ok;
        const pct = (Number(s.count) / maxV) * 100;
        return (
          <div key={s.code}>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-2 text-ink-muted">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: sev.dot }} />
                {s.label}
              </span>
              <span className="font-bold text-ink">{s.count} lần</span>
            </div>
            <div className="h-2 rounded bg-surface-alt overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.max(2, pct)}%`, background: sev.bar }} />
            </div>
          </div>
        );
      })}
      <div className="text-xs text-ink-subtle pt-2 border-t border-line">
        Chỉ số bất thường sẽ chuyển sang màu cam hoặc đỏ — kiểm tra ngay khi có tín hiệu cảnh báo.
      </div>
    </div>
  );
}
