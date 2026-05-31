import { formatDateTime } from '../src/utils/datetime';

describe('formatDateTime', () => {
  test('formats a nanosecond ISO timestamp into HH:mm:ss dd/MM/yyyy with no raw artifacts', () => {
    const out = formatDateTime('2026-05-31T11:15:09.593077191Z');
    expect(out).toMatch(/^\d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
    expect(out).not.toContain('T');
    expect(out).not.toContain('Z');
    expect(out).not.toContain('593077191');
  });

  test('formats a plain ISO timestamp (no fractional seconds)', () => {
    expect(formatDateTime('2026-01-02T03:04:05Z')).toMatch(/^\d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
  });

  test('returns an empty string for empty input', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime(null)).toBe('');
  });

  test('returns the original string when it cannot be parsed', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
