// Formats a backend ISO timestamp into a readable local Vietnamese date-time:
// "HH:mm:ss dd/MM/yyyy". The backend may send sub-millisecond precision
// (e.g. "2026-05-31T11:15:09.593077191Z") which the JS Date parser chokes on,
// so the fractional seconds are trimmed to milliseconds first. Output is in the
// device's local timezone. Unparseable input is returned unchanged.
export function formatDateTime(value) {
  if (!value) return '';
  const normalized =
    typeof value === 'string' ? value.replace(/(\.\d{3})\d+(Z|[+-]\d{2}:?\d{2})?$/, '$1$2') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  return `${time} ${day}`;
}
