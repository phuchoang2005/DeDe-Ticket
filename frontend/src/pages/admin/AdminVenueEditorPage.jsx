import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { formatVND } from '../../utils/format';

const BARS = ['#157F19', '#29D52F', '#B6E8BC', '#FFB800', '#0E6313'];

const STATUS_FILL = {
  AVAILABLE: '#157F19',
  LOCKED: '#FFB800',
  SOLD: '#C53030',
};

export default function AdminVenueEditorPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [seats, setSeats] = useState([]);
  const [message, setMessage] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState({ name: '', price: 500000, rows: 2, seatsPerRow: 10 });

  const load = () => adminApi.event(id).then((e) => {
    setEvent(e);
    if (!selectedSection && (e.sections || []).length) {
      setSelectedSection(e.sections[0].name);
    }
  });

  useEffect(() => { load().catch((err) => setMessage({ kind: 'error', text: err.message })); }, [id]);

  useEffect(() => {
    if (!event || !selectedSection) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/v1/events/${id}/seats`)
      .then((r) => r.json())
      .then((map) => setSeats((map.seats || []).filter((s) => s.section === selectedSection)))
      .catch(() => setSeats([]));
  }, [event, selectedSection, id]);

  const updateSection = async (oldName, name, price) => {
    try {
      const next = await adminApi.updateSection(id, oldName, { name, price });
      setEvent(next);
      setSelectedSection(name);
      setMessage({ kind: 'ok', text: 'Đã cập nhật khu vực' });
    } catch (e) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  const removeSection = async (name) => {
    if (!confirm(`Xoá khu "${name}"?`)) return;
    try {
      const next = await adminApi.deleteSection(id, name);
      setEvent(next);
      const first = (next.sections || [])[0];
      setSelectedSection(first ? first.name : null);
      setMessage({ kind: 'ok', text: 'Đã xoá khu vực' });
    } catch (e) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  const addSection = async () => {
    try {
      const payload = { ...newSection, price: Number(newSection.price), rows: Number(newSection.rows), seatsPerRow: Number(newSection.seatsPerRow) };
      const next = await adminApi.addSection(id, payload);
      setEvent(next);
      setSelectedSection(payload.name);
      setShowAdd(false);
      setNewSection({ name: '', price: 500000, rows: 2, seatsPerRow: 10 });
      setMessage({ kind: 'ok', text: 'Đã thêm khu vực' });
    } catch (e) {
      setMessage({ kind: 'error', text: e.message });
    }
  };

  if (!event) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;
  const section = (event.sections || []).find((s) => s.name === selectedSection);
  const rowGroups = groupSeatsByRow(seats);

  return (
    <div className="space-y-6">
      <div className="text-xs text-ink-subtle">
        <Link to="/admin/events" className="hover:text-ink-muted">Sự kiện</Link> ›{' '}
        <Link to={`/admin/events/${id}`} className="hover:text-ink-muted">{event.title}</Link> ›{' '}
        <span className="text-ink">Sơ đồ chỗ ngồi</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-ink">{event.title} · Sơ đồ chỗ ngồi</h1>
        <p className="text-xs text-ink-subtle mt-1">
          EVENT.id = {event.id} · {event.totalSeats} ghế · materialize EVENT_SEATS
        </p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.kind === 'ok' ? 'bg-brand-100 text-brand-700' : 'bg-danger-50 text-danger-600'
        }`}>{message.text}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="font-bold text-ink">Cây khu vực</div>
            <span className="text-xs text-ink-subtle">SECTIONS</span>
          </div>

          {(event.sections || []).map((s, idx) => (
            <button
              key={s.name}
              onClick={() => setSelectedSection(s.name)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedSection === s.name
                  ? 'bg-brand-50 border-brand-600'
                  : 'bg-white border-line hover:border-brand-200'
              }`}>
              <div className="flex items-start gap-2">
                <div className="w-2 h-8 rounded" style={{ background: BARS[idx % BARS.length] }} />
                <div className="flex-1">
                  <div className="font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-subtle">
                    {s.rowCount} hàng · {s.seatCount} ghế · {formatVND(s.price)}
                  </div>
                </div>
              </div>
            </button>
          ))}

          <button onClick={() => setShowAdd(true)}
                  className="w-full py-3 border-2 border-dashed border-line rounded-xl text-brand-700 font-bold hover:bg-brand-50">
            + Thêm khu vực
          </button>

          <div className="border-t border-line pt-3 space-y-1 text-xs text-ink-subtle">
            <div>Schema: VENUES · SECTIONS · SEATS</div>
            <div>Mỗi event lấy snapshot vào EVENT_SEATS</div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          {section ? (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  <input
                    className="field-input max-w-[200px]"
                    defaultValue={section.name}
                    key={section.name + '-name'}
                    onBlur={(e) => e.target.value !== section.name && updateSection(section.name, e.target.value, section.price)}
                  />
                  <input
                    type="number"
                    className="field-input max-w-[160px]"
                    defaultValue={section.price}
                    key={section.name + '-price'}
                    onBlur={(e) => Number(e.target.value) !== Number(section.price) && updateSection(section.name, section.name, Number(e.target.value))}
                  />
                </div>
                <button onClick={() => removeSection(section.name)}
                        className="px-3 py-2 rounded-lg text-sm text-danger-600 bg-danger-50 border border-danger-200">
                  Xoá khu
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Số hàng" value={section.rowCount} />
                <Stat label="Tổng ghế" value={section.seatCount} />
                <Stat label="Đã bán" value={section.soldCount} highlight />
              </div>

              <div className="bg-brand-600 text-white text-center py-3 rounded-full font-bold">
                SÂN KHẤU
              </div>

              <div className="overflow-auto py-4">
                {rowGroups.map(([row, list]) => (
                  <div key={row} className="flex items-center gap-2 mb-3">
                    <div className="w-12 text-right">
                      <div className="font-bold text-ink">{row}</div>
                      <div className="text-[10px] text-ink-subtle">{list.length} ghế</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {list.map((s) => (
                        <div key={s.id}
                             title={`${s.rowLabel}${s.seatNumber} · ${s.status}`}
                             className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                             style={{ background: STATUS_FILL[s.status] || '#989393' }}>
                          {s.seatNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-line pt-3 text-xs text-ink-muted space-y-1">
                <div>• SEATS.UNIQUE(section, row_label, seat_number) — không cho phép trùng</div>
                <div>• Mỗi EVENT_SEATS có cột version cho optimistic locking (design-supplement.md §1)</div>
                <div>• Xoá SECTION đang được tham chiếu sẽ bị từ chối</div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-ink-subtle">Chọn một khu vực để chỉnh sửa.</div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-ink text-lg">Thêm khu vực mới</h3>
            <label className="block">
              <span className="field-label">Tên khu</span>
              <input className="field-input" value={newSection.name}
                     onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="field-label">Giá (VNĐ)</span>
              <input type="number" className="field-input" value={newSection.price}
                     onChange={(e) => setNewSection({ ...newSection, price: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Số hàng</span>
                <input type="number" className="field-input" value={newSection.rows}
                       onChange={(e) => setNewSection({ ...newSection, rows: e.target.value })} />
              </label>
              <label className="block">
                <span className="field-label">Ghế / hàng</span>
                <input type="number" className="field-input" value={newSection.seatsPerRow}
                       onChange={(e) => setNewSection({ ...newSection, seatsPerRow: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Huỷ</button>
              <button className="btn-primary" onClick={addSection}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-surface-alt rounded-xl p-3">
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-brand-700' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function groupSeatsByRow(seats) {
  const map = new Map();
  for (const s of seats) {
    if (!map.has(s.rowLabel)) map.set(s.rowLabel, []);
    map.get(s.rowLabel).push(s);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}
