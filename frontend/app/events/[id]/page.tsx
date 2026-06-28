'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventApi, orderApi } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { availabilityBadge, categoryTheme, formatDate, formatTime, formatVND } from '@/utils/format';
import type { EventSummary, Seat, SeatMap } from '@/types';

export default function EventDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSeats = useCallback(() => {
    eventApi
      .seats(id)
      .then((s) => {
        setSeatMap(s);
        // deselect any seats that are no longer AVAILABLE
        setSelected((prev) => {
          const availableIds = new Set(s.seats.filter((x) => x.status === 'AVAILABLE').map((x) => x.id));
          const next = new Set([...prev].filter((sid) => availableIds.has(sid)));
          return next.size === prev.size ? prev : next;
        });
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    Promise.all([eventApi.detail(id), eventApi.seats(id)])
      .then(([d, s]) => {
        setEvent(d);
        setSeatMap(s);
      })
      .catch((err) => setError(err.message));

    pollRef.current = setInterval(refreshSeats, 20_000);
    const clockTick = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(clockTick);
    };
  }, [id, refreshSeats]);

  const grouped = useMemo(() => {
    if (!seatMap) return [];
    const sections = new Map<string, Map<string, Seat[]>>();
    for (const s of seatMap.seats) {
      if (!sections.has(s.section)) sections.set(s.section, new Map());
      const rows = sections.get(s.section)!;
      if (!rows.has(s.rowLabel)) rows.set(s.rowLabel, []);
      rows.get(s.rowLabel)!.push(s);
    }
    return Array.from(sections.entries()).map(([section, rows]) => {
      const seatList = Array.from(rows.values()).flat();
      const price = seatList[0]?.price ?? 0;
      return {
        section,
        price,
        rows: Array.from(rows.entries()).map(([row, seats]) => ({ row, seats })),
      };
    });
  }, [seatMap]);

  const selectedSeats = useMemo(
    () => (seatMap ? seatMap.seats.filter((s) => selected.has(s.id)) : []),
    [seatMap, selected],
  );

  const total = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [selectedSeats],
  );

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  };

  const handleCheckout = async () => {
    if (selected.size === 0) return;
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(`/events/${id}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await orderApi.create({
        eventId: Number(id),
        seatIds: Array.from(selected),
      });
      router.push(`/checkout/${order.id}`);
    } catch (err: any) {
      setError(err.message);
      refreshSeats();
    } finally {
      setBusy(false);
    }
  };

  if (error && !event) return <div className="text-danger-600">Không thể tải: {error}</div>;
  if (!event || !seatMap) return <div className="text-ink-subtle">Đang tải…</div>;

  const eventCategories = event.categories || [];
  const primaryCategory = eventCategories[0]?.name || event.category || null;
  const cat = categoryTheme(primaryCategory);
  const badge = availabilityBadge(event.availableSeats, event.totalSeats);

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-brand-100">
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-1.5rem)]">
            {eventCategories.length > 0
              ? eventCategories.map((c) => (
                  <span key={c.id || c.name}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-white ${cat.tint}`}>
                    {c.name}
                  </span>
                ))
              : <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-white ${cat.tint}`}>Sự kiện</span>}
            {badge && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 grid md:grid-cols-[1fr_240px] gap-4 md:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink leading-tight">{event.title}</h1>
            <div className="text-ink-muted mt-2 text-sm sm:text-base">📍 {event.location}</div>
            <div className="text-ink-muted text-sm sm:text-base">📅 {formatDate(event.startTime)} · {formatTime(event.startTime)}</div>
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

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <Step idx={1} label="Chọn sự kiện" done />
        <StepLine />
        <Step idx={2} label="Chọn ghế" active />
        <StepLine />
        <Step idx={3} label="Thanh toán" />
      </div>

      {/* Seat selection */}
      <div className="grid md:grid-cols-[1fr_340px] gap-6">
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-1">Sơ đồ ghế ngồi</h2>
          <p className="text-sm text-ink-subtle mb-4">
            Click vào ghế trống để chọn. Ghế đang giữ hoặc đã bán không thể chọn.
          </p>

          {/* Stage */}
          <div className="mb-6">
            <div className="mx-auto w-2/3 h-8 rounded-t-full bg-brand-100 border border-b-0 border-brand-200 flex items-center justify-center text-xs font-bold text-brand-700 tracking-widest">
              SÂN KHẤU
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs mb-5">
            <Legend className="bg-white border-line" label="Trống" />
            <Legend className="bg-brand-600 border-brand-700" label="Đang chọn" textInverted />
            <Legend className="bg-warn-400 border-warn-700" label="Đang giữ (hiện đếm ngược)" textInverted />
            <Legend className="bg-ink-faint border-ink-muted" label="Đã bán" textInverted />
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {grouped.map(({ section, rows, price }) => (
              <div key={section}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-ink">{section}</div>
                  <div className="text-xs text-ink-subtle">{formatVND(price)} / ghế</div>
                </div>
                <div className="space-y-1.5 overflow-x-auto">
                  {rows.map(({ row, seats }) => (
                    <div key={row} className="flex items-center gap-1.5">
                      <div className="w-6 text-xs text-ink-subtle font-bold">{row}</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {seats.map((s) => {
                          const isSel = selected.has(s.id);
                          const cls = isSel
                            ? 'bg-brand-600 text-white border-brand-700'
                            : s.status === 'AVAILABLE'
                              ? 'bg-white border-line hover:border-brand-600 text-ink-muted'
                              : s.status === 'LOCKED'
                                ? 'bg-warn-400 text-white border-warn-700 cursor-not-allowed'
                                : 'bg-ink-faint text-white border-ink-muted cursor-not-allowed';
                          const countdown = s.status === 'LOCKED' && s.lockedUntil
                            ? lockCountdown(s.lockedUntil, now)
                            : null;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={s.status !== 'AVAILABLE'}
                              onClick={() => toggleSeat(s)}
                              title={countdown
                                ? `${section} ${s.rowLabel}-${s.seatNumber} · Đang giữ, còn ${countdown}`
                                : `${section} ${s.rowLabel}-${s.seatNumber} · ${formatVND(s.price)}`}
                              className={`w-8 h-8 text-[11px] font-semibold rounded border ${cls}`}>
                              {countdown ?? s.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="card p-6 h-fit md:sticky md:top-24 space-y-4 hidden md:block">
          <h3 className="font-bold text-ink">Đơn của bạn</h3>
          {selectedSeats.length === 0 ? (
            <p className="text-sm text-ink-subtle">Chưa chọn ghế nào.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {selectedSeats.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>
                    <span className="font-semibold">{s.section}</span> · {s.rowLabel}-{s.seatNumber}
                  </span>
                  <span className="text-ink-muted">{formatVND(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line pt-3 flex justify-between font-bold text-ink">
            <span>Tổng</span>
            <span className="text-brand-700">{formatVND(total)}</span>
          </div>
          {error && <div className="text-danger-600 text-sm">{error}</div>}
          <button
            type="button"
            disabled={selected.size === 0 || busy}
            onClick={handleCheckout}
            className="btn-primary w-full">
            {busy ? 'Đang giữ ghế…' : user ? 'Tiếp tục thanh toán' : 'Đăng nhập để tiếp tục'}
          </button>
          <p className="text-xs text-ink-subtle text-center">
            Ghế sẽ được giữ tối đa 10 phút sau khi bạn xác nhận.
          </p>
        </aside>
      </div>

      {/* Mobile sticky bottom checkout bar */}
      <div className="md:hidden fixed left-0 right-0 bottom-0 z-20 bg-white border-t border-line shadow-pop">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-ink-subtle leading-none">
              {selected.size === 0 ? 'Chưa chọn ghế' : `${selected.size} ghế`}
            </div>
            <div className="text-base font-bold text-brand-700 leading-tight truncate">
              {formatVND(total)}
            </div>
            {error && <div className="text-[11px] text-danger-600 truncate">{error}</div>}
          </div>
          <button
            type="button"
            disabled={selected.size === 0 || busy}
            onClick={handleCheckout}
            className="btn-primary shrink-0 text-sm">
            {busy ? 'Đang giữ…' : user ? 'Tiếp tục' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}

function lockCountdown(lockedUntil: string, nowMs: number): string | null {
  const secsLeft = Math.max(0, Math.floor((new Date(lockedUntil).getTime() - nowMs) / 1000));
  if (secsLeft <= 0) return null;
  const m = Math.floor(secsLeft / 60);
  const s = secsLeft % 60;
  return m > 0 ? `${m}p` : `${s}s`;
}

function Legend({ className, label, textInverted }: { className: string; label: string; textInverted?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-4 rounded border ${className}`} />
      <span className={textInverted ? 'text-ink-muted' : 'text-ink-muted'}>{label}</span>
    </div>
  );
}

function Step({ idx, label, active, done }: { idx: number; label: string; active?: boolean; done?: boolean }) {
  const cls = active
    ? 'bg-brand-600 text-white border-brand-600'
    : done
      ? 'bg-brand-100 text-brand-700 border-brand-200'
      : 'bg-white text-ink-subtle border-line';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center ${cls}`}>
        {idx}
      </span>
      <span className={`hidden sm:inline ${active ? 'font-bold text-ink' : 'text-ink-subtle'}`}>{label}</span>
    </div>
  );
}
function StepLine() {
  return <span className="h-px w-6 sm:w-12 bg-line" />;
}
