'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { eventApi } from '@/services/api';
import EventCard from '@/components/EventCard';
import Pagination from '@/components/Pagination';
import type { EventSummary, PageMeta } from '@/types';

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

function EventListInner() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: PAGE_SIZE, total: 0, hasMore: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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
    () => (availableOnly ? events.filter((e) => (e.availableSeats ?? 0) > 0) : events),
    [events, availableOnly],
  );

  const update = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    mut(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setCategory = (key: string) =>
    update((p) => {
      if (key === 'all') p.delete('category');
      else p.set('category', key);
      p.delete('page');
    });
  const setQuery = (q: string) =>
    update((p) => {
      if (!q.trim()) p.delete('q');
      else p.set('q', q);
      p.delete('page');
    });
  const goPage = (n: number) =>
    update((p) => {
      if (n <= 1) p.delete('page');
      else p.set('page', String(n));
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') setQuery((e.target as HTMLInputElement).value);
            }}
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

      {totalPages > 1 && <Pagination page={meta.page} totalPages={totalPages} onChange={goPage} />}
    </div>
  );
}

export default function EventListPage() {
  return (
    <Suspense fallback={<div className="text-ink-subtle">Đang tải…</div>}>
      <EventListInner />
    </Suspense>
  );
}
