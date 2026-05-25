import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  availabilityBadge,
  categoryTheme,
  dayCard,
  formatDate,
  formatTime,
  formatVND,
  groupByDay,
  initials,
  relativeFromNow,
} from './format';

afterEach(() => {
  vi.useRealTimers();
});

describe('format utilities', () => {
  it('formatVND_givenInvalidOrZeroInput_returnsStableLabels', () => {
    expect(formatVND(null)).toBe('');
    expect(formatVND('abc')).toBe('');
    expect(formatVND(0)).toBe('Miễn phí');
  });

  it.each([
    [125000, '125.000đ'],
    ['2500000', '2.500.000đ'],
    [-50000, '-50.000đ'],
    [1999.5, '1.999,5đ'],
  ])('formatVND_givenAmount%p_formatsVietnameseDong', (amount, expected) => {
    expect(formatVND(amount)).toBe(expected);
  });

  it('availabilityBadge_givenSoldOutOrLowInventory_returnsBusinessLabels', () => {
    expect(availabilityBadge(0, 100)).toEqual({
      label: 'HẾT VÉ',
      cls: 'bg-danger-50 text-danger-600',
    });
    expect(availabilityBadge(5, 100)).toEqual({
      label: 'SẮP HẾT',
      cls: 'bg-warn-50 text-warn-700',
    });
    expect(availabilityBadge(40, 100)).toEqual({
      label: 'CÒN VÉ',
      cls: 'bg-brand-100 text-brand-700',
    });
  });

  it.each([
    [null, 100],
    [10, null],
    [10, 0],
  ])('availabilityBadge_givenIncompleteInventory_%p_%p_returnsNull', (available, total) => {
    expect(availabilityBadge(available, total)).toBeNull();
  });

  it.each([
    [9, 100, 'SẮP HẾT'],
    [10, 100, 'CÒN VÉ'],
    [1, 9, 'CÒN VÉ'],
  ])('availabilityBadge_givenThreshold_%i_%i_returnsExpectedLabel', (available, total, label) => {
    expect(availabilityBadge(available, total).label).toBe(label);
  });

  it('initials_givenVietnameseDisplayName_returnsTwoLetterInitials', () => {
    expect(initials('Nguyen Van An')).toBe('NA');
    expect(initials('De')).toBe('DE');
    expect(initials('   ')).toBe('ND');
  });

  it.each([
    ['Tran Thi Bich Ngoc', 'TN'],
    ['minh', 'MI'],
    ['Đặng Duy', 'ĐD'],
    [null, 'ND'],
    ['', 'ND'],
  ])('initials_givenName%p_returns%p', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('groupByDay_givenDates_groupsIntoStableBuckets', () => {
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));

    const rows = [
      { id: 1, at: '2026-05-25T01:00:00Z' },
      { id: 2, at: '2026-05-24T01:00:00Z' },
      { id: 3, at: '2026-05-20T01:00:00Z' },
      { id: 4, at: '2026-05-01T01:00:00Z' },
    ];

    const grouped = groupByDay(rows, (row) => row.at);

    expect(grouped.today.map((row) => row.id)).toEqual([1]);
    expect(grouped.yesterday.map((row) => row.id)).toEqual([2]);
    expect(grouped.week.map((row) => row.id)).toEqual([3]);
    expect(grouped.older.map((row) => row.id)).toEqual([4]);

  });

  it.each([
    ['concert night', 'green'],
    ['Đêm nhạc mùa hè', 'green'],
    ['seminar leadership', 'amber'],
    ['hội thảo bảo mật', 'amber'],
    ['workshop design', 'green'],
    ['festival city', 'green'],
    ['lễ hội ánh sáng', 'green'],
    ['sport day', 'amber'],
    ['thể thao học đường', 'amber'],
    ['art expo', 'green'],
    ['nghệ thuật sân khấu', 'green'],
    ['unknown category', 'green'],
  ])('categoryTheme_givenCategory%p_returnsTone%p', (category, tone) => {
    expect(categoryTheme(category).tone).toBe(tone);
  });

  it.each([
    ['2026-05-25T11:59:45Z', 'vài giây trước'],
    ['2026-05-25T11:59:00Z', '1 phút trước'],
    ['2026-05-25T10:00:00Z', '2 giờ trước'],
    ['2026-05-23T12:00:00Z', 'Hôm kia'],
  ])('relativeFromNow_givenPastTime%p_returnsReadableVietnameseLabel', (iso, expected) => {
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));

    expect(relativeFromNow(iso)).toBe(expected);
  });

  it('relativeFromNow_givenMissingDate_returnsEmptyString', () => {
    expect(relativeFromNow(null)).toBe('');
  });

  it('dayCard_givenIso_returnsStableParts', () => {
    const card = dayCard('2026-05-25T09:30:00Z');

    expect(card.day).toMatch(/^\d{2}$/);
    expect(card.monthYear).toContain('2026');
    expect(card.time).toMatch(/\d{2}:\d{2}/);
  });

  it('dayCard_givenMissingIso_returnsEmptyParts', () => {
    expect(dayCard(null)).toEqual({ day: '', monthYear: '', time: '' });
  });

  it.each([
    [formatDate, null],
    [formatTime, null],
  ])('dateFormatter_givenMissingIso_returnsEmptyString', (formatter, value) => {
    expect(formatter(value)).toBe('');
  });
});

describe('load test script guardrails', () => {
  it('scenarioA_script_containsBrowseEndpointsAndThresholds', async () => {
    const fs = await import('node:fs/promises');
    const script = await fs.readFile(new URL('../../../tests/load/scenario-a-browse.js', import.meta.url), 'utf8');

    expect(script).toContain('/v1/events?limit=10');
    expect(script).toContain('/v1/events/${EVENT_ID}');
    expect(script).toContain('/v1/events/${EVENT_ID}/seats');
    expect(script).toContain('p(95)<${P95_MS}');
    expect(script).toContain('rate<${ERROR_RATE}');
  });

  it.each(['BASE_URL', 'EVENT_ID', 'VUS', 'RAMP_DURATION', 'HOLD_DURATION', 'P95_MS', 'ERROR_RATE'])(
    'scenarioA_script_exposesEnvOverride_%s',
    async (name) => {
      const fs = await import('node:fs/promises');
      const script = await fs.readFile(new URL('../../../tests/load/scenario-a-browse.js', import.meta.url), 'utf8');

      expect(script).toContain(`__ENV.${name}`);
    },
  );
});
