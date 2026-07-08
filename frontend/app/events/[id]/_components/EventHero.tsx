import { availabilityBadge, categoryTheme, formatDate, formatTime, formatVND } from '@/utils/format';
import type { EventSummary } from '@/types';

/** Event hero card: cover image, category badges, title, meta and price range. */
export default function EventHero({ event }: { event: EventSummary }) {
  const eventCategories = event.categories || [];
  const primaryCategory = eventCategories[0]?.name || event.category || null;
  const cat = categoryTheme(primaryCategory);
  const badge = availabilityBadge(event.availableSeats, event.totalSeats);

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-brand-100">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-1.5rem)]">
          {eventCategories.length > 0 ? (
            eventCategories.map((c) => (
              <span
                key={c.id || c.name}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-white ${cat.tint}`}
              >
                {c.name}
              </span>
            ))
          ) : (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-white ${cat.tint}`}>Sự kiện</span>
          )}
          {badge && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-6 grid md:grid-cols-[1fr_240px] gap-4 md:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink leading-tight">{event.title}</h1>
          <div className="text-ink-muted mt-2 text-sm sm:text-base">📍 {event.location}</div>
          <div className="text-ink-muted text-sm sm:text-base">
            📅 {formatDate(event.startTime)} · {formatTime(event.startTime)}
          </div>
          {event.organizer && <div className="text-ink-subtle text-sm mt-1">Tổ chức: {event.organizer}</div>}
          <p className="mt-4 text-sm sm:text-base text-ink-muted whitespace-pre-line">{event.description}</p>
        </div>
        <div className="md:border-l md:border-line md:pl-6 md:self-center pt-4 md:pt-0 border-t md:border-t-0 border-line">
          <div className="flex md:block items-center justify-between md:justify-start">
            <div>
              <div className="text-xs text-ink-subtle">Giá vé từ</div>
              <div className="text-xl sm:text-2xl font-bold text-brand-700">{formatVND(event.priceFrom)}</div>
              <div className="text-xs text-ink-subtle md:mt-2">đến {formatVND(event.priceTo)}</div>
            </div>
            <div className="md:mt-3 text-sm text-ink-muted">
              Còn <span className="font-bold text-ink">{event.availableSeats}</span>/{event.totalSeats} vé
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
