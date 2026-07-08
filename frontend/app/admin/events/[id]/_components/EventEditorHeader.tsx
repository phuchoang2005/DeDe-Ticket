import Link from 'next/link';
import { formatVND } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import type { EventSummary } from '@/types';

/** Title row with status badge and preview/publish/delete actions. */
export default function EventEditorHeader({
  event,
  onPublish,
  onDelete,
}: {
  event: EventSummary;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const isPublished = event.status === 'PUBLISHED';
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-ink">{event.title}</h1>
          <Badge className="px-3 py-1 text-xs bg-warn-50 text-warn-700">● {event.status}</Badge>
        </div>
        <p className="text-xs text-ink-subtle mt-1">
          Mã sự kiện #{event.id} · {event.totalSeats} ghế · {event.soldSeats} đã bán · Doanh thu{' '}
          {formatVND(event.revenue)}
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Link href={`/events/${event.id}`} className="btn-ghost text-sm">
          Xem trước
        </Link>
        {event.status === 'DRAFT' && (
          <button onClick={onPublish} className="btn-primary text-sm">
            Xuất bản
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isPublished}
          title={isPublished ? 'Không thể xoá sự kiện đang công bố. Huỷ hoặc kết thúc trước.' : 'Xoá sự kiện'}
          className={`px-3 py-2 rounded-lg text-sm border ${
            isPublished
              ? 'text-ink-faint bg-surface-panel border-line cursor-not-allowed'
              : 'text-danger-600 bg-danger-50 border-danger-200 hover:bg-danger-100'
          }`}
        >
          Xoá sự kiện
        </button>
      </div>
    </div>
  );
}
