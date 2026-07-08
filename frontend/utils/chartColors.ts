/** Shared colour palettes for analytics/venue visualisations. */

export const DONUT_COLORS = ['#157F19', '#29D52F', '#B6E8BC', '#0E6313', '#FFB800', '#B45309', '#525252', '#989393'];

/** Section accent bars (venue editor, event editor ticket types). */
export const SECTION_BARS = ['#157F19', '#29D52F', '#B6E8BC', '#FFB800', '#0E6313'];

/** Seat status → fill colour (venue seat grid). */
export const SEAT_STATUS_FILL: Record<string, string> = {
  AVAILABLE: '#157F19',
  LOCKED: '#FFB800',
  SOLD: '#C53030',
};

/** Operational/security signal severity → dot, bar and tag styles. */
export const SEVERITY: Record<string, { dot: string; bar: string; tag: string }> = {
  ok: { dot: '#29D52F', bar: '#29D52F', tag: 'bg-brand-100 text-brand-700' },
  warn: { dot: '#FFB800', bar: '#FFB800', tag: 'bg-warn-50 text-warn-700' },
  danger: { dot: '#C53030', bar: '#C53030', tag: 'bg-danger-50 text-danger-600' },
};
