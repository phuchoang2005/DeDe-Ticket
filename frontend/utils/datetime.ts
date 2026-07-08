/** Date/time helpers for form inputs and live countdowns. */

/** ISO string → value for an `<input type="datetime-local">` (local time, minute precision). */
export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Remaining seat-lock time as "5p" (minutes) or "42s", or null once expired. */
export function lockCountdown(lockedUntil: string, nowMs: number): string | null {
  const secsLeft = Math.max(0, Math.floor((new Date(lockedUntil).getTime() - nowMs) / 1000));
  if (secsLeft <= 0) return null;
  const m = Math.floor(secsLeft / 60);
  const s = secsLeft % 60;
  return m > 0 ? `${m}p` : `${s}s`;
}
