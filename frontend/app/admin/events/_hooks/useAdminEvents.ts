import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/services/api';
import type { EventSummary } from '@/types';

/** Loads the admin event list and exposes filter/create/delete actions. */
export function useAdminEvents() {
  const router = useRouter();
  const [rows, setRows] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    adminApi
      .events()
      .then(setRows)
      .catch((e) => setError(e.message || 'Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter);

  const remove = async (row: EventSummary) => {
    if (!confirm(`Xoá sự kiện "${row.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await adminApi.deleteEvent(row.id);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e: any) {
      alert(e.message || 'Không thể xoá sự kiện');
    }
  };

  const create = async () => {
    try {
      const now = new Date();
      const start = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + 3 * 3600 * 1000);
      const ev = await adminApi.createEvent({
        title: 'Sự kiện mới',
        description: '',
        location: '',
        category: '🎵 Concert',
        organizer: '',
        imageUrl: '',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      router.push(`/admin/events/${ev.id}`);
    } catch (e: any) {
      alert(e.message || 'Không thể tạo sự kiện');
    }
  };

  return { rows, loading, error, filter, setFilter, filtered, remove, create };
}
