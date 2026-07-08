'use client';

import { Suspense } from 'react';
import EventCard from '@/components/EventCard';
import Pagination from '@/components/Pagination';
import { useEventList } from './_hooks/useEventList';
import CategoryChips from './_components/CategoryChips';
import SearchBar from './_components/SearchBar';

function EventListInner() {
  const {
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
  } = useEventList();

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Khám phá sự kiện</h1>
          <p className="text-sm text-ink-subtle mt-1">Sự kiện đã công bố · sắp xếp theo ngày diễn ra gần nhất</p>
        </div>
        <SearchBar defaultValue={query} onSearch={setQuery} />
      </div>

      <CategoryChips active={category} onSelect={setCategory} />

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
