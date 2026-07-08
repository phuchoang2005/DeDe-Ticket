import type { NewSection } from '../_hooks/useVenueEditor';

/** Modal form for creating a new section (name, price, rows, seats/row). */
export default function AddSectionModal({
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: NewSection;
  onChange: (v: NewSection) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
        <h3 className="font-bold text-ink text-lg">Thêm khu vực mới</h3>
        <label className="block">
          <span className="field-label">Tên khu</span>
          <input
            className="field-input"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="field-label">Giá (VNĐ)</span>
          <input
            type="number"
            className="field-input"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Số hàng</span>
            <input
              type="number"
              className="field-input"
              value={value.rows}
              onChange={(e) => onChange({ ...value, rows: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="field-label">Ghế / hàng</span>
            <input
              type="number"
              className="field-input"
              value={value.seatsPerRow}
              onChange={(e) => onChange({ ...value, seatsPerRow: e.target.value })}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button className="btn-ghost" onClick={onCancel}>
            Huỷ
          </button>
          <button className="btn-primary" onClick={onSubmit}>
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
