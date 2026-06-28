import Link from 'next/link';
import { availabilityBadge, categoryTheme, formatDate, formatTime, formatVND } from '@/utils/format';
import type { EventSummary } from '@/types';

/** Event teaser card used on the home and listing pages. */
export default function EventCard({
  event,
  variant = 'default',
}: {
  event: EventSummary;
  variant?: 'default' | 'large';
}) {
  const categories = event.categories || [];
  const primaryCategory = categories[0]?.name || event.category || null;
  const cat = categoryTheme(primaryCategory);
  const badge = availabilityBadge(event.availableSeats, event.totalSeats);
  const isLarge = variant === 'large';

  return (
    <Link
      href={`/events/${event.id}`}
      className="group card overflow-hidden flex flex-col hover:shadow-pop transition-shadow">
      <div className={`relative ${isLarge ? 'aspect-[21/9]' : 'aspect-[16/10]'} bg-brand-100 overflow-hidden`}>
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-700 text-2xl font-bold">
            {primaryCategory}
          </div>
        )}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white shadow-sm ${cat.tint}`}>
          {primaryCategory || 'Sự kiện'}
          {categories.length > 1 && <span className="ml-1 text-ink-subtle">+{categories.length - 1}</span>}
        </span>
        {badge && (
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-ink leading-snug line-clamp-2">{event.title}</h3>
        <div className="text-sm text-ink-muted mt-1.5 flex items-center gap-1">
          <span>📅</span>
          <span>{formatDate(event.startTime)} · {formatTime(event.startTime)}</span>
        </div>
        <div className="text-sm text-ink-muted flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{event.location}</span>
        </div>
        {event.organizer && (
          <div className="text-xs text-ink-subtle mt-1">Tổ chức: {event.organizer}</div>
        )}
        <div className="mt-3 pt-3 border-t border-line/70 flex items-end justify-between">
          <div>
            <div className="text-xs text-ink-subtle">Từ</div>
            <div className="font-bold text-brand-700">{formatVND(event.priceFrom)}</div>
          </div>
          {event.totalSeats != null && event.availableSeats != null && (
            <div className={`text-xs ${badge && badge.label === 'SẮP HẾT' ? 'text-warn-700 font-semibold' : 'text-ink-subtle'}`}>
              Còn {event.availableSeats} / {event.totalSeats}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
