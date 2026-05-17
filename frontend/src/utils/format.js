const vndFmt = new Intl.NumberFormat('vi-VN');

export const formatVND = (amount) => {
  if (amount == null) return '';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Miễn phí';
  return vndFmt.format(n) + 'đ';
};

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('vi-VN', { month: 'short' });

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '');
export const formatTime = (iso) => (iso ? timeFmt.format(new Date(iso)) : '');
export const formatDateTime = (iso) =>
  iso ? `${dateFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))}` : '';

export const dayCard = (iso) => {
  if (!iso) return { day: '', monthYear: '', time: '' };
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    monthYear: monthFmt.format(d).toUpperCase() + ' ' + d.getFullYear(),
    time: timeFmt.format(d),
  };
};

const rtf = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });
const TABLE = [
  { unit: 'year', secs: 31536000 },
  { unit: 'month', secs: 2592000 },
  { unit: 'day', secs: 86400 },
  { unit: 'hour', secs: 3600 },
  { unit: 'minute', secs: 60 },
];
export const relativeFromNow = (iso) => {
  if (!iso) return '';
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 30) return 'vài giây trước';
  for (const { unit, secs } of TABLE) {
    if (diffSec >= secs) return rtf.format(-Math.round(diffSec / secs), unit);
  }
  return rtf.format(-Math.round(diffSec), 'second');
};

export const groupByDay = (items, getDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { today: [], yesterday: [], week: [], older: [] };
  for (const it of items) {
    const dt = new Date(getDate(it));
    const day = new Date(dt);
    day.setHours(0, 0, 0, 0);
    if (day.getTime() === today.getTime()) groups.today.push(it);
    else if (day.getTime() === yesterday.getTime()) groups.yesterday.push(it);
    else if (day >= weekAgo) groups.week.push(it);
    else groups.older.push(it);
  }
  return groups;
};

export const categoryTheme = (raw) => {
  const c = (raw || '').toLowerCase();
  if (c.includes('concert') || c.includes('nhạc')) return { tone: 'green', tint: 'bg-brand-100 text-brand-700' };
  if (c.includes('seminar') || c.includes('hội thảo')) return { tone: 'amber', tint: 'bg-warn-50 text-warn-700' };
  if (c.includes('workshop')) return { tone: 'green', tint: 'bg-brand-100 text-brand-700' };
  if (c.includes('festival') || c.includes('lễ hội')) return { tone: 'green', tint: 'bg-brand-100 text-brand-700' };
  if (c.includes('thể thao') || c.includes('sport')) return { tone: 'amber', tint: 'bg-warn-50 text-warn-700' };
  if (c.includes('nghệ thuật') || c.includes('art')) return { tone: 'green', tint: 'bg-brand-100 text-brand-700' };
  return { tone: 'green', tint: 'bg-surface-panel text-ink-muted' };
};

export const availabilityBadge = (available, total) => {
  if (available == null || total == null) return null;
  if (total === 0) return null;
  if (available === 0) return { label: 'HẾT VÉ', cls: 'bg-danger-50 text-danger-600' };
  const pct = available / total;
  if (pct < 0.1) return { label: 'SẮP HẾT', cls: 'bg-warn-50 text-warn-700' };
  return { label: 'CÒN VÉ', cls: 'bg-brand-100 text-brand-700' };
};

export const initials = (name) => {
  if (!name) return 'ND';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ND';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
