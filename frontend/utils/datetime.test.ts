import { describe, expect, it } from 'vitest';
import { lockCountdown, toLocalInput } from './datetime';

describe('toLocalInput', () => {
  it('returns empty string for missing input', () => {
    expect(toLocalInput()).toBe('');
    expect(toLocalInput('')).toBe('');
  });

  it('formats a local datetime for <input type="datetime-local">', () => {
    expect(toLocalInput('2026-03-05T09:07:00')).toBe('2026-03-05T09:07');
  });
});

describe('lockCountdown', () => {
  const now = Date.now();

  it('shows minutes when more than a minute remains', () => {
    expect(lockCountdown(new Date(now + 90_000).toISOString(), now)).toBe('1p');
  });

  it('shows seconds when under a minute remains', () => {
    expect(lockCountdown(new Date(now + 30_000).toISOString(), now)).toBe('30s');
  });

  it('returns null once expired', () => {
    expect(lockCountdown(new Date(now - 1_000).toISOString(), now)).toBeNull();
  });
});
