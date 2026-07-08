'use client';

import EventCard from '@/components/EventCard';
import { useHomeEvents } from './_hooks/useHomeEvents';
import HomeHero from './_components/HomeHero';
import SectionHeader from './_components/SectionHeader';
import CategoryGrid from './_components/CategoryGrid';

export default function HomePage() {
  const { trending, error, loading, featured, upcoming, categoryCounts } = useHomeEvents();

  return (
    <div className="space-y-10">
      <HomeHero featured={featured} />

      <section>
        <SectionHeader title="Duyệt theo danh mục" subtitle="Chọn loại sự kiện bạn quan tâm" linkTo="/events" />
        <CategoryGrid counts={categoryCounts} />
      </section>

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
