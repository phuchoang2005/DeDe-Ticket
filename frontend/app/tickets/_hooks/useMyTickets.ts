import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ticketApi } from '@/services/api';
import type { PageMeta, Ticket } from '@/types';

const PAGE_SIZE = 8;

/** Loads the current user's tickets with tab filtering, pagination and deletion. */
export function useMyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0, VALID: 0, USED: 0, CANCELLED: 0 });
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: PAGE_SIZE, total: 0, hasMore: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const justPaid = useSearchParams().get('justPaid');

  const reload = () => {
    setLoading(true);
    const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
    if (tab !== 'all') params.status = tab;
    ticketApi
      .list(params)
      .then((r) => {
        setTickets(r.data || []);
        if (r.page) setMeta(r.page);
        if (r.counts) setCounts(r.counts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab]);

  const remove = async (id: number) => {
    if (!window.confirm('Xoá vé này? Ghế sẽ được trả về kho và đơn vé sẽ chuyển sang trạng thái "Đã huỷ".')) return;
    try {
      await ticketApi.delete(id);
      reload();
    } catch (err: any) {
      window.alert('Không thể xoá vé: ' + (err.message || 'lỗi không xác định'));
    }
  };

  const setTabAndReset = (t: string) => {
    setTab(t);
    setPage(1);
  };
  const goPage = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return { tickets, counts, meta, error, loading, tab, justPaid, remove, setTabAndReset, goPage, totalPages };
}
