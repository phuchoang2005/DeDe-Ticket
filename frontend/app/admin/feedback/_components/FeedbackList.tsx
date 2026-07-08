import Badge from '@/components/ui/Badge';
import { CATEGORY_LABELS, STATUS_CLASSES, STATUS_LABELS } from '../_constants';
import type { Feedback } from '@/types';

/** Clickable list of feedback rows (status badge, category, rating, subject). */
export default function FeedbackList({ items, onOpen }: { items: Feedback[]; onOpen: (fb: Feedback) => void }) {
  return (
    <div className="divide-y divide-line">
      {items.map((fb) => (
        <button
          key={fb.id}
          type="button"
          onClick={() => onOpen(fb)}
          className="w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={`text-[10px] px-2 py-0.5 ${STATUS_CLASSES[fb.status] ?? 'bg-surface-alt text-ink-muted'}`}
                >
                  {STATUS_LABELS[fb.status] ?? fb.status}
                </Badge>
                <span className="text-[10px] text-ink-subtle">{CATEGORY_LABELS[fb.category] ?? fb.category}</span>
                {fb.rating && <span className="text-[10px] text-warn-700">{'★'.repeat(fb.rating)}</span>}
              </div>
              <div className="font-medium text-sm text-ink mt-0.5 truncate">{fb.subject}</div>
              <div className="text-xs text-ink-subtle truncate">
                {fb.userEmail} · {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
