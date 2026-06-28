'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/services/api';
import { formatVND } from '@/utils/format';
import RequireRole from '@/components/RequireRole';
import type { EventSummary } from '@/types';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
const CATEGORIES = ['🎵 Concert', '🎓 Seminar', '🛠 Workshop', '🎬 Festival', '🏆 Thể thao', '🎭 Nghệ thuật'];

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditorForm {
  title?: string;
  description?: string;
  location?: string;
  categories?: string[];
  organizer?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
}

function AdminEventEditorInner() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [form, setForm] = useState<EditorForm>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: string; text: string } | null>(null);

  const load = () =>
    adminApi.event(id).then((e) => {
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
    });

  useEffect(() => {
    load().catch((err) => setMessage({ kind: 'error', text: err.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const updated = await adminApi.updateEvent(id, payload);
      setEvent(updated);
      setMessage({ kind: 'ok', text: 'Đã lưu thay đổi' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message || 'Lỗi lưu' });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    try {
      const next = await adminApi.changeStatus(id, 'PUBLISHED');
      setEvent(next);
      setMessage({ kind: 'ok', text: 'Đã xuất bản' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

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

  const changeStatus = async (status: string) => {
    try {
      const next = await adminApi.changeStatus(id, status);
      setEvent(next);
      setMessage({ kind: 'ok', text: 'Đã đổi trạng thái: ' + status });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  if (!event) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;

  const totalCapacity = event.totalSeats;
  const targetRevenue = (event.sections || []).reduce((acc, s) => acc + Number(s.price) * s.seatCount, 0);

  return (
    <div className="space-y-6">
      <div className="text-xs text-ink-subtle">
        <Link href="/admin/events" className="hover:text-ink-muted">Sự kiện</Link> ›{' '}
        <span className="text-ink">Tạo / chỉnh sửa</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{event.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn-50 text-warn-700">
              ● {event.status}
            </span>
          </div>
          <p className="text-xs text-ink-subtle mt-1">
            Mã sự kiện #{event.id} · {event.totalSeats} ghế · {event.soldSeats} đã bán · Doanh thu {formatVND(event.revenue)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/events/${event.id}`} className="btn-ghost text-sm">Xem trước</Link>
          {event.status === 'DRAFT' && (
            <button onClick={publish} className="btn-primary text-sm">Xuất bản</button>
          )}
          <button
            onClick={removeEvent}
            disabled={event.status === 'PUBLISHED'}
            title={event.status === 'PUBLISHED'
              ? 'Không thể xoá sự kiện đang công bố. Huỷ hoặc kết thúc trước.'
              : 'Xoá sự kiện'}
            className={`px-3 py-2 rounded-lg text-sm border ${
              event.status === 'PUBLISHED'
                ? 'text-ink-faint bg-surface-panel border-line cursor-not-allowed'
                : 'text-danger-600 bg-danger-50 border-danger-200 hover:bg-danger-100'
            }`}>
            Xoá sự kiện
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.kind === 'ok' ? 'bg-brand-100 text-brand-700' : 'bg-danger-50 text-danger-600'
        }`}>{message.text}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-bold text-ink">Thông tin sự kiện</h2>
          </div>

          <Field label="Tiêu đề" required>
            <input className="field-input" value={form.title || ''}
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>

          <Field label="Mô tả">
            <textarea className="field-input min-h-[120px]" value={form.description || ''}
                      maxLength={4000}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="text-xs text-ink-subtle text-right mt-1">{(form.description || '').length} / 4000 ký tự</div>
          </Field>

          <Field label="Địa điểm hiển thị">
            <input className="field-input" value={form.location || ''}
                   onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>

          <Field label="Ảnh bìa">
            <input className="field-input" value={form.imageUrl || ''}
                   onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </Field>

          <Field label="Đơn vị tổ chức">
            <input className="field-input" value={form.organizer || ''}
                   onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bắt đầu" required>
              <input type="datetime-local" className="field-input" value={form.startTime || ''}
                     onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label="Kết thúc" required>
              <input type="datetime-local" className="field-input" value={form.endTime || ''}
                     onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>

          <Field label="Trạng thái">
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => changeStatus(s)}
                        className={`chip ${event.status === s ? 'chip-active' : ''}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Danh mục (chọn nhiều)">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => {
                const selected = (form.categories || []).includes(c);
                return (
                  <button key={c}
                          onClick={() => {
                            const cur = new Set(form.categories || []);
                            if (selected) cur.delete(c); else cur.add(c);
                            setForm({ ...form, categories: Array.from(cur) });
                          }}
                          className={`chip ${selected ? 'chip-active' : ''}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex justify-end pt-2 border-t border-line">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Đang lưu…' : 'Lưu & tiếp tục →'}
            </button>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-bold text-ink">Loại vé</h2>
            <span className="text-xs text-ink-subtle">{(event.sections || []).length} loại</span>
          </div>

          {(event.sections || []).map((s, idx) => (
            <div key={s.name} className="border border-line rounded-xl p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5"
                   style={{ background: ['#157F19', '#29D52F', '#B6E8BC', '#FFB800'][idx % 4] }} />
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-ink">{s.name}</div>
                <Link href={`/admin/events/${event.id}/venue`} className="text-xs text-brand-700 hover:underline">✎</Link>
              </div>
              <Row label="Giá" value={formatVND(s.price)} />
              <Row label="Số lượng" value={s.seatCount} />
              <Row label="Đã bán" value={s.soldCount} />
              <Row label="Số hàng" value={s.rowCount} />
            </div>
          ))}

          <Link href={`/admin/events/${event.id}/venue`}
                className="block text-center py-3 border-2 border-dashed border-line rounded-xl text-brand-700 font-bold hover:bg-brand-50">
            + Thêm loại vé / khu vực
          </Link>

          <div className="border-t border-line pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Tổng sức chứa</span>
              <span className="font-bold text-ink">{totalCapacity} vé</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Doanh thu mục tiêu</span>
              <span className="font-bold text-brand-700">{formatVND(targetRevenue)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-warn-50 border border-warn-50 p-3 text-xs text-warn-700">
            <div className="font-bold mb-1">⚠ Khi xuất bản</div>
            Toàn bộ ghế trong các khu vực sẽ được mở bán. Hạn chế chỉnh sửa khu vực sau khi đã có vé bán ra.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="field-label">
        {label} {required && <span className="text-danger-600">*</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-ink-subtle">{label}</span>
      <span className="text-ink font-medium">{value}</span>
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
