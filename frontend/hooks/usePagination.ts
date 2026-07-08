import { useState } from 'react';

/** 1-based page counter with next/prev/reset helpers for paginated lists. */
export function usePagination(initial = 1) {
  const [page, setPage] = useState(initial);
  return {
    page,
    setPage,
    next: () => setPage((p) => p + 1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    reset: () => setPage(1),
  };
}
