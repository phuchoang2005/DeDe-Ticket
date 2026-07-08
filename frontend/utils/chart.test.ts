import { describe, expect, it } from 'vitest';
import { formatShort, niceCeil, shortDay } from './chart';

describe('niceCeil', () => {
  it('returns 1 for non-positive input', () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-5)).toBe(1);
  });

  it('rounds up to 1/2/5/10 × 10ⁿ', () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.5)).toBe(2);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(120)).toBe(200);
    expect(niceCeil(5000)).toBe(5000);
  });
});

describe('formatShort', () => {
  it('abbreviates thousands, millions and billions', () => {
    expect(formatShort(780)).toBe('780');
    expect(formatShort(1000)).toBe('1K');
    expect(formatShort(1_000_000)).toBe('1M');
    expect(formatShort(1_500_000)).toBe('1.5M');
    expect(formatShort(2_000_000_000)).toBe('2B');
  });
});

describe('shortDay', () => {
  it('formats as dd/MM', () => {
    expect(shortDay('2026-03-05T12:00:00')).toBe('05/03');
  });

  it('returns empty string for empty input', () => {
    expect(shortDay('')).toBe('');
  });
});
