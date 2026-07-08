'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireRole from '@/components/RequireRole';
import Alert from '@/components/ui/Alert';
import { useVenueEditor } from './_hooks/useVenueEditor';
import SectionTree from './_components/SectionTree';
import SectionDetail from './_components/SectionDetail';
import AddSectionModal from './_components/AddSectionModal';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];

function AdminVenueEditorInner() {
  const params = useParams();
  const id = String(params.id);
  const v = useVenueEditor(id);

  if (!v.event) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;
  const section = (v.event.sections || []).find((s) => s.name === v.selectedSection);

  return (
    <div className="space-y-6">
      <div className="text-xs text-ink-subtle">
        <Link href="/admin/events" className="hover:text-ink-muted">
          Sự kiện
        </Link>{' '}
        ›{' '}
        <Link href={`/admin/events/${id}`} className="hover:text-ink-muted">
          {v.event.title}
        </Link>{' '}
        › <span className="text-ink">Sơ đồ chỗ ngồi</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-ink">{v.event.title} · Sơ đồ chỗ ngồi</h1>
        <p className="text-xs text-ink-subtle mt-1">
          Mã sự kiện #{v.event.id} · {v.event.totalSeats} ghế
        </p>
      </div>

      <Alert message={v.message} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <SectionTree
          event={v.event}
          selectedSection={v.selectedSection}
          onSelect={v.setSelectedSection}
          onAdd={() => v.setShowAdd(true)}
        />
        <SectionDetail section={section} seats={v.seats} onUpdate={v.updateSection} onRemove={v.removeSection} />
      </div>

      {v.showAdd && (
        <AddSectionModal
          value={v.newSection}
          onChange={v.setNewSection}
          onCancel={() => v.setShowAdd(false)}
          onSubmit={v.addSection}
        />
      )}
    </div>
  );
}

export default function AdminVenueEditorPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AdminVenueEditorInner />
    </RequireRole>
  );
}
