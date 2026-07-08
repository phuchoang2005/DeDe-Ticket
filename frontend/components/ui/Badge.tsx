import type { ReactNode } from 'react';

/**
 * Rounded status/label pill. Sizing/colour come from `className` so callers keep
 * their own status→colour maps (event status, feedback status, etc.).
 */
export default function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-block rounded-full font-bold ${className ?? ''}`}>{children}</span>;
}
