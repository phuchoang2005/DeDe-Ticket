import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/services/api';
import { toLocalInput } from '@/utils/datetime';
import type { AlertMessage } from '@/components/ui/Alert';
import type { EventSummary } from '@/types';

export interface EditorForm {
  title?: string;
  description?: string;
  location?: string;
  categories?: string[];
  organizer?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
}

/** Loads an event into an editable form and exposes save/publish/status/delete. */
export function useEventForm(id: string) {
  const router = useRouter();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [form, setForm] = useState<EditorForm>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<AlertMessage | null>(null);

  useEffect(() => {
    adminApi
      .event(id)
      .then((e) => {
        setEvent(e);
        setForm({
          title: e.title || '',
          description: e.description || '',
          location: e.location || '',
          categories: (e.categories || []).map((c) => c.name),
          organizer: e.organizer || '',
          imageUrl: e.imageUrl || '',
          startTime: toLocalInput(e.startTime),
          endTime: toLocalInput(e.endTime),
        });
      })
      .catch((err) => setMessage({ kind: 'error', text: err.message }));
  }, [id]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime as string).toISOString(),
        endTime: new Date(form.endTime as string).toISOString(),
      };
      setEvent(await adminApi.updateEvent(id, payload));
      setMessage({ kind: 'ok', text: 'Đã lưu thay đổi' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message || 'Lỗi lưu' });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string, okText = 'Đã đổi trạng thái: ' + status) => {
    try {
      setEvent(await adminApi.changeStatus(id, status));
      setMessage({ kind: 'ok', text: okText });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  const publish = () => changeStatus('PUBLISHED', 'Đã xuất bản');

  const removeEvent = async () => {
    if (!event) return;
    if (!confirm(`Xoá sự kiện "${event.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await adminApi.deleteEvent(id);
      router.push('/admin/events');
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message || 'Không thể xoá sự kiện' });
    }
  };

  return { event, form, setForm, saving, message, save, publish, removeEvent, changeStatus };
}
