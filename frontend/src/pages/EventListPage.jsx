import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eventApi } from '../services/api';
import EventCard from '../components/EventCard';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: '🎵 Concert', label: '🎵 Concert' },
  { key: '🎓 Seminar', label: '🎓 Seminar' },
  { key: '🛠 Workshop', label: '🛠 Workshop' },
  { key: '🎬 Festival', label: '🎬 Festival' },
  { key: '🏆 Thể thao', label: '🏆 Thể thao' },
  { key: '🎭 Nghệ thuật', label: '🎭 Nghệ thuật' },
];

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';

  useEffect(() => {
    eventApi
      .list()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (availableOnly && !(e.availableSeats > 0)) return false;
      if (q && !(e.title.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, query, category, availableOnly]);

  const setCategory = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'all') next.delete('category');
    else next.set('category', key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Khám phá sự kiện</h1>
          <p className="text-sm text-ink-subtle mt-1">
            Chỉ hiển thị sự kiện đã công bố · sắp xếp theo ngày diễn ra gần nhất
          </p>
        </div>
        <div className="relative w-full lg:w-[420px]">
          <input
            type="search"
            placeholder="Tìm theo tên sự kiện, nghệ sĩ, địa điểm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">🔍</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-ink-subtle">DANH MỤC</div>
        <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible">
          <div className="flex sm:flex-wrap gap-2 px-4 sm:px-0 pb-2 sm:pb-0 w-max sm:w-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`chip whitespace-nowrap ${category === c.key ? 'chip-active' : ''}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          <span className="text-ink-muted">Chỉ hiển thị sự kiện còn vé</span>
        </label>
        <div className="ml-auto text-ink-subtle text-xs">
          <span className="font-bold text-ink">{filtered.length}</span> sự kiện phù hợp · cache 30s
        </div>
      </div>

      {loading && <div className="text-ink-subtle">Đang tải…</div>}
      {error && <div className="text-danger-600">Lỗi: {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-ink-subtle">Không có sự kiện nào phù hợp với bộ lọc.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filtered.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
