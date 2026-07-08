import { useRouter } from 'next/navigation';
import { formatVND, formatDateTime } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import type { EventSummary } from '@/types';

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-warn-50 text-warn-700',
  PUBLISHED: 'bg-brand-100 text-brand-700',
  CANCELLED: 'bg-danger-50 text-danger-600',
  COMPLETED: 'bg-surface-panel text-ink-muted',
};

/** Admin event table: click a row to edit, or delete non-published events. */
export default function EventsTable({
  rows,
  onRemove,
}: {
  rows: EventSummary[];
  onRemove: (row: EventSummary) => void;
}) {
  const router = useRouter();
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-ink-subtle text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Sự kiện</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-right">Ghế</th>
            <th className="px-4 py-3 font-medium text-right">Đã bán</th>
            <th className="px-4 py-3 font-medium text-right">Doanh thu</th>
            <th className="px-4 py-3 font-medium">Bắt đầu</th>
            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-line hover:bg-surface-alt cursor-pointer"
              onClick={() => router.push(`/admin/events/${r.id}`)}
            >
              <td className="px-4 py-3">
                <div className="font-semibold text-ink">{r.title}</div>
                <div className="text-xs text-ink-subtle">
                  {r.location} · {(r.categories || []).map((c) => c.name).join(', ') || '—'}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={`px-2 py-1 text-xs ${STATUS_CLASS[r.status || ''] || 'bg-surface-panel text-ink-muted'}`}
                >
                  {r.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-ink">{r.totalSeats}</td>
              <td className="px-4 py-3 text-right text-ink">{r.soldSeats}</td>
              <td className="px-4 py-3 text-right font-bold text-brand-700">{formatVND(r.revenue)}</td>
              <td className="px-4 py-3 text-ink-muted">{formatDateTime(r.startTime)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(r);
                  }}
                  disabled={r.status === 'PUBLISHED'}
                  title={
                    r.status === 'PUBLISHED'
                      ? 'Không thể xoá sự kiện đang công bố. Huỷ hoặc kết thúc trước.'
                      : 'Xoá sự kiện'
                  }
                  className={`px-2 py-1 rounded-md text-xs ${
                    r.status === 'PUBLISHED'
                      ? 'text-ink-faint cursor-not-allowed'
                      : 'text-danger-600 hover:bg-danger-50'
                  }`}
                >
                  Xoá
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">
                Không có sự kiện
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
