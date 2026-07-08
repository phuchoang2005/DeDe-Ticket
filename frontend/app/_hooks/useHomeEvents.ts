import { useEffect, useMemo, useState } from 'react';
import { eventApi } from '@/services/api';
import type { EventSummary } from '@/types';

/** Loads the home page's event list + trending, deriving featured/upcoming/category counts. */
export function useHomeEvents() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [trending, setTrending] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventApi.list({ limit: 12 }).then((r) => r.data || []),
      eventApi.trending(6).catch(() => [] as EventSummary[]),
    ])
      .then(([list, trend]) => {
        setEvents(list);
        setTrending(trend || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const featured = trending[0] || events[0];
  const upcoming = events.slice(0, 6);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const names = (e.categories || []).map((c) => c.name);
      if (names.length === 0 && e.category) names.push(e.category);
      for (const n of names) map.set(n, (map.get(n) || 0) + 1);
    }
    return map;
  }, [events]);

  return { events, trending, error, loading, featured, upcoming, categoryCounts };
}
