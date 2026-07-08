import { useCallback, useMemo, useState } from 'react';
import { notificationApi } from '@/services/api';
import { groupByDay } from '@/utils/format';
import { usePolling } from '@/hooks/usePolling';
import type { Inbox, NotificationItem } from '@/types';

/** Fetches the inbox (polling every 30s), filters by type and marks read. */
export function useInbox() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const refresh = useCallback(() => {
    notificationApi
      .inbox()
      .then((r) => setInbox(r))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  usePolling(refresh, 30000);

  const items = inbox?.items || [];
  const filtered = filter === 'ALL' ? items : items.filter((it) => it.type === filter);
  const groups = useMemo(() => groupByDay(filtered, (it) => it.createdAt), [filtered]);

  const onClickItem = async (it: NotificationItem) => {
    if (it.readAt) return;
    try {
      await notificationApi.markRead(it.id);
      refresh();
    } catch {}
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    refresh();
  };

  return { inbox, error, loading, filter, setFilter, items, filtered, groups, onClickItem, markAll };
}
