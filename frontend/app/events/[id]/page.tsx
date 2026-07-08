'use client';

import { useParams } from 'next/navigation';
import Stepper from '@/components/ui/Stepper';
import { useEventSeats } from './_hooks/useEventSeats';
import EventHero from './_components/EventHero';
import SeatMap from './_components/SeatMap';
import OrderSummary from './_components/OrderSummary';
import CheckoutBar from './_components/CheckoutBar';

const STEPS = ['Chọn sự kiện', 'Chọn ghế', 'Thanh toán'];

export default function EventDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const {
    event,
    seatMap,
    selected,
    grouped,
    selectedSeats,
    total,
    error,
    now,
    busy,
    isAuthed,
    toggleSeat,
    handleCheckout,
  } = useEventSeats(id);

  if (error && !event) return <div className="text-danger-600">Không thể tải: {error}</div>;
  if (!event || !seatMap) return <div className="text-ink-subtle">Đang tải…</div>;

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      <EventHero event={event} />
      <Stepper steps={STEPS} current={2} />
      <div className="grid md:grid-cols-[1fr_340px] gap-6">
        <SeatMap grouped={grouped} selected={selected} now={now} onToggle={toggleSeat} />
        <OrderSummary
          selectedSeats={selectedSeats}
          total={total}
          error={error}
          busy={busy}
          isAuthed={isAuthed}
          onCheckout={handleCheckout}
        />
      </div>
      <CheckoutBar
        count={selected.size}
        total={total}
        error={error}
        busy={busy}
        isAuthed={isAuthed}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
