import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { eventApi, orderApi } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { usePolling } from '@/hooks/usePolling';
import type { EventSummary, Seat, SeatMap } from '@/types';

/**
 * Owns the event-detail seat map: initial load, 20s availability polling, a 1s
 * clock for lock countdowns, seat selection (pruning seats that stop being
 * available) and order creation.
 */
export function useEventSeats(id: string) {
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const refreshSeats = useCallback(() => {
    eventApi
      .seats(id)
      .then((s) => {
        setSeatMap(s);
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

    const clockTick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(clockTick);
  }, [id]);

  usePolling(refreshSeats, 20_000, { immediate: false });

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
      return { section, price, rows: Array.from(rows.entries()).map(([row, seats]) => ({ row, seats })) };
    });
  }, [seatMap]);

  const selectedSeats = useMemo(
    () => (seatMap ? seatMap.seats.filter((s) => selected.has(s.id)) : []),
    [seatMap, selected],
  );
  const total = useMemo(() => selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0), [selectedSeats]);

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
      const order = await orderApi.create({ eventId: Number(id), seatIds: Array.from(selected) });
      router.push(`/checkout/${order.id}`);
    } catch (err: any) {
      setError(err.message);
      refreshSeats();
    } finally {
      setBusy(false);
    }
  };

  return {
    event,
    seatMap,
    selected,
    grouped,
    selectedSeats,
    total,
    error,
    now,
    busy,
    isAuthed: !!user,
    toggleSeat,
    handleCheckout,
  };
}
