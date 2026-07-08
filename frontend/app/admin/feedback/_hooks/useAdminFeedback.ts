import { useEffect, useState } from 'react';
import { adminFeedbackApi } from '@/services/api';
import type { Feedback, FeedbackSummary, Paginated } from '@/types';

const EMPTY_PAGE: Paginated<Feedback> = { data: [], page: { page: 1, limit: 20, total: 0, hasMore: false } };

/** Admin feedback inbox: summary, filtered/paginated list, detail + status updates. */
export function useAdminFeedback() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [page, setPage] = useState<Paginated<Feedback>>(EMPTY_PAGE);
  const [filters, setFilters] = useState({ status: '', category: '', pageNum: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', adminNote: '' });
  const [updating, setUpdating] = useState(false);

  const loadSummary = () =>
    adminFeedbackApi
      .summary()
      .then(setSummary)
      .catch(() => {});
  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, unknown> = { page: filters.pageNum, limit: 20 };
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    adminFeedbackApi
      .list(params)
      .then(setPage)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key: string, val: string) => setFilters((f) => ({ ...f, [key]: val, pageNum: 1 }));
  const changePage = (delta: number) => setFilters((f) => ({ ...f, pageNum: f.pageNum + delta }));

  const replaceInList = (updated: Feedback) =>
    setPage((p) => ({ ...p, data: p.data.map((x) => (x.id === updated.id ? updated : x)) }));

  const openDetail = (fb: Feedback) => {
    setSelected(fb);
    setStatusUpdate({ status: fb.status, adminNote: fb.adminNote || '' });
    if (fb.status === 'NEW') {
      adminFeedbackApi
        .updateStatus(fb.id, { status: 'READ' })
        .then((updated) => {
          setSummary(null);
          loadSummary();
          replaceInList(updated);
          setSelected(updated);
          setStatusUpdate({ status: updated.status, adminNote: updated.adminNote || '' });
        })
        .catch(() => {});
    }
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await adminFeedbackApi.updateStatus(selected.id, {
        status: statusUpdate.status,
        adminNote: statusUpdate.adminNote,
      });
      setSelected(updated);
      replaceInList(updated);
      loadSummary();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const pageMeta = page.page || { page: 1, limit: 20, total: 0, hasMore: false };

  return {
    summary,
    page,
    filters,
    loading,
    error,
    selected,
    statusUpdate,
    updating,
    pageMeta,
    setFilter,
    changePage,
    openDetail,
    handleUpdateStatus,
    setSelected,
    setStatusUpdate,
  };
}
