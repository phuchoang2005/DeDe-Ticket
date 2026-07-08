import FilterChip from '@/components/ui/FilterChip';
import { meta } from '../_constants';

/** Mobile horizontal chip filter for notification types. */
export default function FilterBar({
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
    <div className="lg:hidden -mx-4 sm:mx-0 overflow-x-auto">
      <div className="flex gap-2 px-4 sm:px-0 pb-2 w-max">
        <FilterChip
          active={filter === 'ALL'}
          onClick={() => onFilter('ALL')}
          icon="📥"
          label={`Tất cả (${itemsCount})`}
        />
        {Object.entries(countsByType || {}).map(([type, cnt]) => (
          <FilterChip
            key={type}
            active={filter === type}
            onClick={() => onFilter(type)}
            icon={meta(type).icon}
            label={`${meta(type).label} (${cnt})`}
          />
        ))}
        <button onClick={onMarkAll} className="chip whitespace-nowrap">
          ✓ Đã đọc tất cả
        </button>
      </div>
    </div>
  );
}
