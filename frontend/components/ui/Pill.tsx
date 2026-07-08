import type { ReactNode } from 'react';

/** Small label/value chip used inside cards (e.g. payment funnel breakdown). */
export default function Pill({ label, value, cls }: { label: string; value: ReactNode; cls: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-xs ${cls}`}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
