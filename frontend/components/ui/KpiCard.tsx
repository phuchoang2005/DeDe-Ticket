import type { ReactNode } from 'react';

const ACCENTS: Record<string, string> = {
  brand: 'text-brand-700',
  warn: 'text-warn-700',
  danger: 'text-danger-600',
};

/** Compact dashboard metric card (revenue, counts, rates). */
export default function KpiCard({
  caption,
  value,
  sub,
  accent,
}: {
  caption: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-[10px] text-ink-subtle uppercase tracking-wide leading-tight">{caption}</div>
      <div className={`text-2xl font-bold mt-2 ${ACCENTS[accent ?? ''] ?? 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-ink-subtle mt-2">{sub}</div>}
    </div>
  );
}
