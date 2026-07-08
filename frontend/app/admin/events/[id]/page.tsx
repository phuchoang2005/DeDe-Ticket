'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireRole from '@/components/RequireRole';
import Alert from '@/components/ui/Alert';
import { useEventForm } from './_hooks/useEventForm';
import EventEditorHeader from './_components/EventEditorHeader';
import EventForm from './_components/EventForm';
import TicketTypesPanel from './_components/TicketTypesPanel';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];

function AdminEventEditorInner() {
  const params = useParams();
  const id = String(params.id);
  const { event, form, setForm, saving, message, save, publish, removeEvent, changeStatus } = useEventForm(id);

  if (!event) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;

  return (
    <div className="space-y-6">
      <div className="text-xs text-ink-subtle">
        <Link href="/admin/events" className="hover:text-ink-muted">
          Sự kiện
        </Link>{' '}
        › <span className="text-ink">Tạo / chỉnh sửa</span>
      </div>

      <EventEditorHeader event={event} onPublish={publish} onDelete={removeEvent} />
      <Alert message={message} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EventForm
          form={form}
          setForm={setForm}
          saving={saving}
          currentStatus={event.status}
          onSave={save}
          onChangeStatus={changeStatus}
        />
        <TicketTypesPanel event={event} />
      </div>
    </div>
  );
}

export default function AdminEventEditorPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AdminEventEditorInner />
    </RequireRole>
  );
}
