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

const PAGE_SIZE = 12;

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, hasMore: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const query = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  useEffect(() => {
    setLoading(true);
    const req = {
      page,
      limit: PAGE_SIZE,
      ...(category !== 'all' ? { category } : {}),
      ...(query.trim() ? { q: query.trim() } : {}),
    };
    eventApi
      .list(req)
      .then((r) => {
        setEvents(r.data || []);
        setMeta(r.page || { page: 1, limit: PAGE_SIZE, total: (r.data || []).length, hasMore: false });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, category, query]);

  const filtered = useMemo(
    () => (availableOnly ? events.filter((e) => e.availableSeats > 0) : events),
    [events, availableOnly],
  );

  const update = (mut) => {
    const next = new URLSearchParams(params);
    mut(next);
    setParams(next, { replace: true });
  };

  const setCategory = (key) => update((p) => {
    if (key === 'all') p.delete('category'); else p.set('category', key);
    p.delete('page');
  });
  const setQuery = (q) => update((p) => {
    if (!q.trim()) p.delete('q'); else p.set('q', q);
    p.delete('page');
  });
  const goPage = (n) => update((p) => {
    if (n <= 1) p.delete('page'); else p.set('page', String(n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Khám phá sự kiện</h1>
          <p className="text-sm text-ink-subtle mt-1">
            Sự kiện đã công bố · sắp xếp theo ngày diễn ra gần nhất
          </p>
        </div>
        <div className="relative w-full lg:w-[420px]">
          <input
            type="search"
            placeholder="Tìm theo tên sự kiện, nghệ sĩ, địa điểm…"
            defaultValue={query}
            onKeyDown={(e) => { if (e.key === 'Enter') setQuery(e.target.value); }}
            onBlur={(e) => setQuery(e.target.value)}
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
          <span className="font-bold text-ink">{meta.total}</span> sự kiện · trang {meta.page} / {totalPages}
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

      {totalPages > 1 && (
        <Pagination page={meta.page} totalPages={totalPages} onChange={goPage} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const numbers = pageNumbers(page, totalPages);
  return (
    <nav className="flex justify-center items-center gap-1.5 pt-2" aria-label="Phân trang">
      <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</PageBtn>
      {numbers.map((n, i) =>
        n === '…' ? (
          <span key={`g${i}`} className="px-2 text-ink-subtle">…</span>
        ) : (
          <PageBtn key={n} active={n === page} onClick={() => onChange(n)}>{n}</PageBtn>
        ),
      )}
      <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau ›</PageBtn>
    </nav>
  );
}

function PageBtn({ active, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[36px] h-9 px-3 rounded-lg text-sm border transition ${
        active
          ? 'bg-brand-600 text-white border-brand-600 font-bold'
          : disabled
            ? 'bg-white text-ink-faint border-line cursor-not-allowed'
            : 'bg-white text-ink-muted border-line hover:border-brand-600 hover:text-brand-700'
      }`}>
      {children}
    </button>
  );
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push('…');
  out.push(total);
  return out;
}
