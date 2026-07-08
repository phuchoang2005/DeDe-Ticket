const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: '🎵 Concert', label: '🎵 Concert' },
  { key: '🎓 Seminar', label: '🎓 Seminar' },
  { key: '🛠 Workshop', label: '🛠 Workshop' },
  { key: '🎬 Festival', label: '🎬 Festival' },
  { key: '🏆 Thể thao', label: '🏆 Thể thao' },
  { key: '🎭 Nghệ thuật', label: '🎭 Nghệ thuật' },
];

/** Horizontal category filter chips for the event browser. */
export default function CategoryChips({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-ink-subtle">DANH MỤC</div>
      <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible">
        <div className="flex sm:flex-wrap gap-2 px-4 sm:px-0 pb-2 sm:pb-0 w-max sm:w-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className={`chip whitespace-nowrap ${active === c.key ? 'chip-active' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
