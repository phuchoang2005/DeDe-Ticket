import type { Dispatch, SetStateAction } from 'react';
import FormField from '@/components/ui/FormField';
import type { EditorForm } from '../_hooks/useEventForm';

const STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
const CATEGORIES = ['🎵 Concert', '🎓 Seminar', '🛠 Workshop', '🎬 Festival', '🏆 Thể thao', '🎭 Nghệ thuật'];

/** Editable event details form (info, schedule, status and categories). */
export default function EventForm({
  form,
  setForm,
  saving,
  currentStatus,
  onSave,
  onChangeStatus,
}: {
  form: EditorForm;
  setForm: Dispatch<SetStateAction<EditorForm>>;
  saving: boolean;
  currentStatus?: string;
  onSave: () => void;
  onChangeStatus: (status: string) => void;
}) {
  const toggleCategory = (c: string) => {
    const cur = new Set(form.categories || []);
    if (cur.has(c)) cur.delete(c);
    else cur.add(c);
    setForm({ ...form, categories: Array.from(cur) });
  };

  return (
    <div className="lg:col-span-2 card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="font-bold text-ink">Thông tin sự kiện</h2>
      </div>

      <FormField label="Tiêu đề" required>
        <input
          className="field-input"
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </FormField>

      <FormField label="Mô tả">
        <textarea
          className="field-input min-h-[120px]"
          value={form.description || ''}
          maxLength={4000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="text-xs text-ink-subtle text-right mt-1">{(form.description || '').length} / 4000 ký tự</div>
      </FormField>

      <FormField label="Địa điểm hiển thị">
        <input
          className="field-input"
          value={form.location || ''}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </FormField>

      <FormField label="Ảnh bìa">
        <input
          className="field-input"
          value={form.imageUrl || ''}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
      </FormField>

      <FormField label="Đơn vị tổ chức">
        <input
          className="field-input"
          value={form.organizer || ''}
          onChange={(e) => setForm({ ...form, organizer: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Bắt đầu" required>
          <input
            type="datetime-local"
            className="field-input"
            value={form.startTime || ''}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </FormField>
        <FormField label="Kết thúc" required>
          <input
            type="datetime-local"
            className="field-input"
            value={form.endTime || ''}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Trạng thái">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onChangeStatus(s)}
              className={`chip ${currentStatus === s ? 'chip-active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Danh mục (chọn nhiều)">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className={`chip ${(form.categories || []).includes(c) ? 'chip-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      </FormField>

      <div className="flex justify-end pt-2 border-t border-line">
        <button onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Đang lưu…' : 'Lưu & tiếp tục →'}
        </button>
      </div>
    </div>
  );
}
