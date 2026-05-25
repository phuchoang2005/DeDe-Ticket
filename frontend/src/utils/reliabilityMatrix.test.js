import { describe, expect, it, vi } from 'vitest';

import { availabilityBadge, categoryTheme, formatVND, groupByDay, initials, relativeFromNow } from './format';

describe('frontend reliability matrix', () => {
  it.each(Array.from({ length: 120 }, (_, i) => {
    const amount = i * 12500;
    return [amount, amount === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(amount)}đ`];
  }))('formatVND_matrix_amount_%i', (amount, expected) => {
    expect(formatVND(amount)).toBe(expected);
  });

  it.each(Array.from({ length: 101 }, (_, available) => {
    const label = available === 0 ? 'HẾT VÉ' : available < 10 ? 'SẮP HẾT' : 'CÒN VÉ';
    return [available, 100, label];
  }))('availabilityBadge_matrix_%i_of_%i', (available, total, label) => {
    expect(availabilityBadge(available, total).label).toBe(label);
  });

  it.each([
    ['concert rock', 'green'],
    ['concert acoustic', 'green'],
    ['đêm nhạc trẻ', 'green'],
    ['seminar cloud', 'amber'],
    ['seminar product', 'amber'],
    ['hội thảo dữ liệu', 'amber'],
    ['workshop ux', 'green'],
    ['workshop backend', 'green'],
    ['festival food', 'green'],
    ['lễ hội văn hóa', 'green'],
    ['sport marathon', 'amber'],
    ['thể thao điện tử', 'amber'],
    ['art gallery', 'green'],
    ['nghệ thuật số', 'green'],
    ['family day', 'green'],
    ['startup meetup', 'green'],
    ['security day', 'green'],
    ['education fair', 'green'],
    ['community talk', 'green'],
    ['charity gala', 'green'],
  ])('categoryTheme_matrix_%s', (category, tone) => {
    expect(categoryTheme(category).tone).toBe(tone);
  });

  it.each(Array.from({ length: 80 }, (_, i) => {
    const first = `User${i}`;
    const last = `Seat${79 - i}`;
    return [`${first} Middle ${last}`, `${first[0]}${last[0]}`.toUpperCase()];
  }))('initials_matrix_%s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it.each(Array.from({ length: 60 }, (_, i) => {
    const dayOffset = i % 12;
    return [i, dayOffset];
  }))('groupByDay_matrix_item_%i_offset_%i', (id, dayOffset) => {
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    const date = new Date('2026-05-25T12:00:00Z');
    date.setDate(date.getDate() - dayOffset);

    const grouped = groupByDay([{ id, at: date.toISOString() }], (row) => row.at);

    if (dayOffset === 0) expect(grouped.today).toHaveLength(1);
    else if (dayOffset === 1) expect(grouped.yesterday).toHaveLength(1);
    else if (dayOffset <= 7) expect(grouped.week).toHaveLength(1);
    else expect(grouped.older).toHaveLength(1);
    vi.useRealTimers();
  });

  it.each(Array.from({ length: 45 }, (_, i) => {
    const secondsAgo = 30 + i * 60;
    return [secondsAgo];
  }))('relativeFromNow_matrix_secondsAgo_%i', (secondsAgo) => {
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    const date = new Date(Date.now() - secondsAgo * 1000);

    expect(relativeFromNow(date.toISOString())).not.toBe('');
    vi.useRealTimers();
  });
});

describe('load script reliability matrix', () => {
  const scriptPromise = import('node:fs/promises').then((fs) =>
    fs.readFile(new URL('../../../tests/load/scenario-a-browse.js', import.meta.url), 'utf8'),
  );

  it.each([
    'ramping-vus',
    'browse_baseline',
    'http_req_duration{type:user}',
    'http_req_failed',
    'events list returns 200',
    'event detail returns 200',
    'seat map returns 200',
    'events list has data array',
    'seat map has seats array',
    'sleep(Math.random() * 2)',
  ])('scenarioA_contains_required_fragment_%s', async (fragment) => {
    await expect(scriptPromise).resolves.toContain(fragment);
  });

  it.each(Array.from({ length: 40 }, (_, i) => [`ENV_GUARD_${i}`, ['BASE_URL', 'EVENT_ID', 'VUS', 'P95_MS'][i % 4]]))(
    'scenarioA_env_matrix_%s_%s',
    async (_caseName, envName) => {
      await expect(scriptPromise).resolves.toContain(`__ENV.${envName}`);
    },
  );
});
