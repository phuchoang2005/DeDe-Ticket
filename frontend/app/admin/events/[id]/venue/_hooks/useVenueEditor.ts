import { useEffect, useState } from 'react';
import { adminApi } from '@/services/api';
import type { AlertMessage } from '@/components/ui/Alert';
import type { EventSummary, Seat } from '@/types';

export interface NewSection {
  name: string;
  price: number | string;
  rows: number | string;
  seatsPerRow: number | string;
}

const EMPTY_SECTION: NewSection = { name: '', price: 500000, rows: 2, seatsPerRow: 10 };

/** State + actions for the venue/section editor (load, add/update/delete, seat fetch). */
export function useVenueEditor(id: string) {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [message, setMessage] = useState<AlertMessage | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState<NewSection>(EMPTY_SECTION);

  const load = () =>
    adminApi.event(id).then((e) => {
      setEvent(e);
      if (!selectedSection && (e.sections || []).length) setSelectedSection(e.sections![0].name);
    });

  useEffect(() => {
    load().catch((err) => setMessage({ kind: 'error', text: err.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!event || !selectedSection) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/v1/events/${id}/seats`)
      .then((r) => r.json())
      .then((map) => setSeats((map.seats || []).filter((s: Seat) => s.section === selectedSection)))
      .catch(() => setSeats([]));
  }, [event, selectedSection, id]);

  const updateSection = async (oldName: string, name: string, price: number) => {
    try {
      const next = await adminApi.updateSection(id, oldName, { name, price });
      setEvent(next);
      setSelectedSection(name);
      setMessage({ kind: 'ok', text: 'Đã cập nhật khu vực' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  const removeSection = async (name: string) => {
    if (!confirm(`Xoá khu "${name}"?`)) return;
    try {
      const next = await adminApi.deleteSection(id, name);
      setEvent(next);
      const first = (next.sections || [])[0];
      setSelectedSection(first ? first.name : null);
      setMessage({ kind: 'ok', text: 'Đã xoá khu vực' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  const addSection = async () => {
    try {
      const payload = {
        ...newSection,
        price: Number(newSection.price),
        rows: Number(newSection.rows),
        seatsPerRow: Number(newSection.seatsPerRow),
      };
      const next = await adminApi.addSection(id, payload);
      setEvent(next);
      setSelectedSection(payload.name);
      setShowAdd(false);
      setNewSection(EMPTY_SECTION);
      setMessage({ kind: 'ok', text: 'Đã thêm khu vực' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  return {
    event,
    selectedSection,
    setSelectedSection,
    seats,
    message,
    showAdd,
    setShowAdd,
    newSection,
    setNewSection,
    updateSection,
    removeSection,
    addSection,
  };
}
