'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { eventApi } from '@/services/api';
import { formatDate, formatTime, formatVND } from '@/utils/format';
import EventCard from '@/components/EventCard';
import type { EventSummary } from '@/types';

const CATEGORIES = [
  { key: '🎵 Concert', label: 'Concert', emoji: '🎵', bg: 'bg-brand-100' },
  { key: '🎓 Seminar', label: 'Seminar', emoji: '🎓', bg: 'bg-warn-50' },
  { key: '🛠 Workshop', label: 'Workshop', emoji: '🛠', bg: 'bg-brand-100' },
  { key: '🎬 Festival', label: 'Festival', emoji: '🎬', bg: 'bg-brand-100' },
  { key: '🏆 Thể thao', label: 'Thể thao', emoji: '🏆', bg: 'bg-warn-50' },
  { key: '🎭 Nghệ thuật', label: 'Nghệ thuật', emoji: '🎭', bg: 'bg-brand-100' },
];

export default function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [trending, setTrending] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventApi.list({ limit: 12 }).then((r) => r.data || []),
      eventApi.trending(6).catch(() => [] as EventSummary[]),
    ])
      .then(([list, trend]) => {
        setEvents(list);
        setTrending(trend || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const featured = trending[0] || events[0];
  const upcoming = events.slice(0, 6);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const names = (e.categories || []).map((c) => c.name);
      if (names.length === 0 && e.category) names.push(e.category);
      for (const n of names) map.set(n, (map.get(n) || 0) + 1);
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-10">
      {/* Hero */}
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
                <div>📅 {formatDate(featured.startTime)} · {formatTime(featured.startTime)}</div>
                <div>📍 {featured.location}</div>
                <div>🎫 Còn {featured.availableSeats}/{featured.totalSeats} vé · Từ <span className="font-semibold text-brand-700">{formatVND(featured.priceFrom)}</span></div>
              </div>
              <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link href={`/events/${featured.id}`} className="btn-primary justify-center">Đặt vé ngay →</Link>
                <Link href={`/events/${featured.id}`} className="btn-outline justify-center">Xem chi tiết</Link>
              </div>
            </>
          ) : (
            <h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl lg:text-5xl font-bold text-ink leading-tight">
              Tìm khoảnh khắc <span className="text-brand-700">live</span> của bạn
            </h1>
          )}
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionHeader title="Duyệt theo danh mục" subtitle="Chọn loại sự kiện bạn quan tâm" linkTo="/events" />
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/events?category=${encodeURIComponent(c.key)}`}
              className="card p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-brand-600 hover:-translate-y-0.5 transition text-center">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl ${c.bg}`}>
                {c.emoji}
              </div>
              <div className="text-xs sm:text-sm font-bold text-ink">{c.label}</div>
              <div className="text-[10px] sm:text-xs text-ink-subtle">{categoryCounts.get(c.key) || 0} sự kiện</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <SectionHeader title="🔥 Sự kiện xu hướng" subtitle="Quy mô lớn nhất · sắp diễn ra sớm" linkTo="/events" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {trending.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <SectionHeader title="Sắp diễn ra" subtitle="6 sự kiện gần nhất" linkTo="/events" />
        {loading && <div className="text-ink-subtle mt-4">Đang tải…</div>}
        {error && <div className="text-danger-600 mt-4">Không thể tải sự kiện: {error}</div>}
        {!loading && !error && upcoming.length === 0 && (
          <div className="text-ink-subtle mt-4">Chưa có sự kiện nào được công bố.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, linkTo }: { title: string; subtitle?: string; linkTo?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-subtle mt-0.5">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link href={linkTo} className="text-sm font-semibold text-brand-700 hover:underline">
          Xem tất cả →
        </Link>
      )}
    </div>
  );
}
