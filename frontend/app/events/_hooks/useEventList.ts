import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { eventApi } from '@/services/api';
import type { EventSummary, PageMeta } from '@/types';

const PAGE_SIZE = 12;

/** URL-param-driven event browsing: fetch, category/search/page sync and filtering. */
export function useEventList() {
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

  return {
    meta,
    error,
    loading,
    availableOnly,
    setAvailableOnly,
    category,
    query,
    filtered,
    setCategory,
    setQuery,
    goPage,
    totalPages,
  };
}
