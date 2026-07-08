import { meta } from '../_constants';

function FilterRow({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition ${
        active ? 'bg-brand-50 text-brand-700 font-bold' : 'text-ink-muted hover:bg-surface-alt'
      }`}
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className={active ? 'text-brand-700' : 'text-ink-subtle'}>{count}</span>
    </button>
  );
}

/** Desktop sidebar filter for notification types. */
export default function FilterSidebar({
  itemsCount,
  filter,
  onFilter,
  countsByType,
  onMarkAll,
}: {
  itemsCount: number;
  filter: string;
  onFilter: (type: string) => void;
  countsByType?: Record<string, number>;
  onMarkAll: () => void;
}) {
  return (
    <aside className="card p-4 h-fit hidden lg:block">
      <div className="text-sm font-bold text-ink mb-2">Loại thông báo</div>
      <FilterRow
        active={filter === 'ALL'}
        onClick={() => onFilter('ALL')}
        icon="📥"
        label="Tất cả"
        count={itemsCount}
      />
      {Object.entries(countsByType || {}).map(([type, cnt]) => (
        <FilterRow
          key={type}
          active={filter === type}
          onClick={() => onFilter(type)}
          icon={meta(type).icon}
          label={meta(type).label}
          count={cnt}
        />
      ))}
      <div className="border-t border-line my-3" />
      <button onClick={onMarkAll} className="btn-outline w-full text-sm">
        Đánh dấu đã đọc tất cả
      </button>
    </aside>
  );
}
