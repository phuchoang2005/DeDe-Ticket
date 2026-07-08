'use client';

import RequireAuth from '@/components/RequireAuth';
import { useInbox } from './_hooks/useInbox';
import FilterBar from './_components/FilterBar';
import FilterSidebar from './_components/FilterSidebar';
import NotificationGroup from './_components/NotificationGroup';

function NotificationsInner() {
  const { inbox, error, loading, filter, setFilter, items, filtered, groups, onClickItem, markAll } = useInbox();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Hộp thông báo</h1>
        <p className="text-sm text-ink-subtle mt-1">Sắp xếp theo thời gian gần nhất · poll mỗi 30 giây</p>
      </div>

      <FilterBar
        itemsCount={items.length}
        filter={filter}
        onFilter={setFilter}
        countsByType={inbox?.countsByType}
        onMarkAll={markAll}
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <FilterSidebar
          itemsCount={items.length}
          filter={filter}
          onFilter={setFilter}
          countsByType={inbox?.countsByType}
          onMarkAll={markAll}
        />

        <section className="card p-2 sm:p-4">
          {loading && <div className="p-4 text-ink-subtle">Đang tải…</div>}
          {error && <div className="p-4 text-danger-600">Lỗi: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-ink-subtle">Không có thông báo nào.</div>
          )}

          <NotificationGroup title="HÔM NAY" items={groups.today} onClick={onClickItem} />
          <NotificationGroup title="HÔM QUA" items={groups.yesterday} onClick={onClickItem} />
          <NotificationGroup title="TUẦN NÀY" items={groups.week} onClick={onClickItem} />
          <NotificationGroup title="CŨ HƠN" items={groups.older} onClick={onClickItem} />
        </section>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}
