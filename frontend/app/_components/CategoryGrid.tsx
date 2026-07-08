import Link from 'next/link';

const CATEGORIES = [
  { key: '🎵 Concert', label: 'Concert', emoji: '🎵', bg: 'bg-brand-100' },
  { key: '🎓 Seminar', label: 'Seminar', emoji: '🎓', bg: 'bg-warn-50' },
  { key: '🛠 Workshop', label: 'Workshop', emoji: '🛠', bg: 'bg-brand-100' },
  { key: '🎬 Festival', label: 'Festival', emoji: '🎬', bg: 'bg-brand-100' },
  { key: '🏆 Thể thao', label: 'Thể thao', emoji: '🏆', bg: 'bg-warn-50' },
  { key: '🎭 Nghệ thuật', label: 'Nghệ thuật', emoji: '🎭', bg: 'bg-brand-100' },
];

/** Category shortcut cards showing per-category event counts. */
export default function CategoryGrid({ counts }: { counts: Map<string, number> }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.key}
          href={`/events?category=${encodeURIComponent(c.key)}`}
          className="card p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-brand-600 hover:-translate-y-0.5 transition text-center"
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl ${c.bg}`}>
            {c.emoji}
          </div>
          <div className="text-xs sm:text-sm font-bold text-ink">{c.label}</div>
          <div className="text-[10px] sm:text-xs text-ink-subtle">{counts.get(c.key) || 0} sự kiện</div>
        </Link>
      ))}
    </div>
  );
}
