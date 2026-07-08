import Link from 'next/link';
import { formatDate, formatTime, formatVND } from '@/utils/format';
import type { EventSummary } from '@/types';

/** Landing hero highlighting the featured event (or a fallback headline). */
export default function HomeHero({ featured }: { featured?: EventSummary }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-100 p-6 sm:p-10 lg:p-14">
      <div className="absolute -left-10 top-10 w-40 sm:w-60 h-40 sm:h-60 rounded-full bg-brand-600/10 blur-xl" />
      <div className="absolute right-10 -top-10 w-48 sm:w-72 h-48 sm:h-72 rounded-full bg-brand-600/10 blur-xl" />
      <div className="relative">
        <span className="inline-block px-3 py-1.5 rounded-full bg-white text-xs font-bold text-brand-700 shadow-sm">
          🔥 NỔI BẬT
        </span>
        {featured ? (
          <>
            <h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl lg:text-5xl font-bold text-ink leading-tight max-w-3xl">
              {featured.title}
            </h1>
            <div className="mt-3 space-y-1 text-ink-muted text-sm lg:text-base">
              <div>
                📅 {formatDate(featured.startTime)} · {formatTime(featured.startTime)}
              </div>
              <div>📍 {featured.location}</div>
              <div>
                🎫 Còn {featured.availableSeats}/{featured.totalSeats} vé · Từ{' '}
                <span className="font-semibold text-brand-700">{formatVND(featured.priceFrom)}</span>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link href={`/events/${featured.id}`} className="btn-primary justify-center">
                Đặt vé ngay →
              </Link>
              <Link href={`/events/${featured.id}`} className="btn-outline justify-center">
                Xem chi tiết
              </Link>
            </div>
          </>
        ) : (
          <h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl lg:text-5xl font-bold text-ink leading-tight">
            Tìm khoảnh khắc <span className="text-brand-700">live</span> của bạn
          </h1>
        )}
      </div>
    </section>
  );
}
