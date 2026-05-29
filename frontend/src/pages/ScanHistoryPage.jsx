import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketApi } from '../services/api';
import { formatDateTime } from '../utils/format';

// Read-only check-in audit: who scanned which ticket, on what device, when.
// The backend scopes rows by role (SCANNER sees only their own; ADMIN/ORGANIZER
// see all). Filtering below runs client-side over the returned rows.
const EMPTY_FILTERS = { from: '', to: '', eventId: '', scannerId: '', deviceId: '' };

export default function ScanHistoryPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = () => {
    setError(null);
    setRows(null);
    ticketApi
      .scanHistory(500)
      .then(setRows)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  // Distinct dropdown options derived from the loaded rows.
  const options = useMemo(() => {
    const events = new Map();
    const scanners = new Map();
    const devices = new Set();
    for (const r of rows || []) {
      if (r.eventId != null) events.set(r.eventId, r.eventTitle || `#${r.eventId}`);
      if (r.scannedById != null) scanners.set(r.scannedById, r.scannedByName || r.scannedByEmail);
      if (r.deviceId) devices.add(r.deviceId);
    }
    return {
      events: [...events].map(([id, title]) => ({ id, title })),
      scanners: [...scanners].map(([id, name]) => ({ id, name })),
      devices: [...devices].sort(),
    };
  }, [rows]);

  // Only worth showing the scanner filter when more than one scanner appears
  // (i.e. for ADMIN/ORGANIZER; a SCANNER only ever sees themselves).
  const showScannerFilter = options.scanners.length > 1;

  const filtered = useMemo(() => {
    if (!rows) return [];
    const fromTs = filters.from ? new Date(filters.from).getTime() : null;
    const toTs = filters.to ? new Date(filters.to).getTime() : null;
    return rows.filter((r) => {
      const ts = new Date(r.checkedInAt).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      if (filters.eventId && String(r.eventId) !== filters.eventId) return false;
      if (filters.scannerId && String(r.scannedById) !== filters.scannerId) return false;
      if (filters.deviceId && r.deviceId !== filters.deviceId) return false;
      return true;
    });
  }, [rows, filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Lịch sử soát vé</h1>
          <p className="text-sm text-ink-subtle mt-0.5">
            Bản ghi các lần check-in thành công, kèm người quét và thiết bị.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={load} className="btn-ghost text-sm px-3 py-1.5">Làm mới</button>
          <Link to="/scan" className="btn-primary text-sm px-3 py-1.5">Quét vé</Link>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <section className="card p-3 sm:p-4">
          {/* flex-wrap + flex-1 lets every control grow to fill the row (no
              right-side gap when the scanner filter is hidden); datetime fields
              get a wider min-width so the time part is never clipped. */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink-subtle flex-1 min-w-[200px]">
              Từ thời điểm
              <input type="datetime-local" value={filters.from} onChange={set('from')} className="filter-input" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-subtle flex-1 min-w-[200px]">
              Đến thời điểm
              <input type="datetime-local" value={filters.to} onChange={set('to')} className="filter-input" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-subtle flex-1 min-w-[150px]">
              Sự kiện
              <select value={filters.eventId} onChange={set('eventId')} className="filter-input">
                <option value="">Tất cả</option>
                {options.events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </label>
            {showScannerFilter && (
              <label className="flex flex-col gap-1 text-xs text-ink-subtle flex-1 min-w-[150px]">
                Người quét
                <select value={filters.scannerId} onChange={set('scannerId')} className="filter-input">
                  <option value="">Tất cả</option>
                  {options.scanners.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-ink-subtle flex-1 min-w-[150px]">
              Thiết bị
              <select value={filters.deviceId} onChange={set('deviceId')} className="filter-input">
                <option value="">Tất cả</option>
                {options.devices.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-ink-subtle">
            <span>{filtered.length} / {rows.length} lượt</span>
            {hasFilters && (
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-brand-700 hover:underline">
                Xóa bộ lọc
              </button>
            )}
          </div>
        </section>
      )}

      {error && <div className="text-sm text-danger-600">Lỗi: {error}</div>}
      {!error && rows === null && <div className="text-sm text-ink-subtle">Đang tải…</div>}
      {rows && rows.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink-subtle">Chưa có lượt soát vé nào.</div>
      )}
      {rows && rows.length > 0 && filtered.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink-subtle">Không có lượt nào khớp bộ lọc.</div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-ink-subtle text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Thời điểm</th>
                  <th className="text-left font-semibold px-4 py-2.5">Sự kiện</th>
                  <th className="text-left font-semibold px-4 py-2.5">Ghế</th>
                  <th className="text-left font-semibold px-4 py-2.5">Người quét</th>
                  <th className="text-left font-semibold px-4 py-2.5">Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap">{formatDateTime(r.checkedInAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-ink font-medium">{r.eventTitle}</div>
                      <div className="text-ink-subtle text-xs font-mono">Ticket #{r.ticketId}</div>
                    </td>
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap">
                      {r.section} · {r.rowLabel}-{r.seatNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-ink">{r.scannedByName || '—'}</div>
                      <div className="text-ink-subtle text-xs">{r.scannedByEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-subtle text-xs font-mono break-all">{r.deviceId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="text-ink font-medium">{r.eventTitle}</div>
                <div className="text-xs text-ink-subtle font-mono">Ticket #{r.ticketId}</div>
                <dl className="mt-2 grid grid-cols-[88px_1fr] gap-y-1 text-sm">
                  <dt className="text-ink-subtle">Thời điểm</dt><dd className="text-ink">{formatDateTime(r.checkedInAt)}</dd>
                  <dt className="text-ink-subtle">Ghế</dt><dd className="text-ink">{r.section} · {r.rowLabel}-{r.seatNumber}</dd>
                  <dt className="text-ink-subtle">Người quét</dt><dd className="text-ink">{r.scannedByName || r.scannedByEmail}</dd>
                  <dt className="text-ink-subtle">Thiết bị</dt><dd className="text-ink-subtle font-mono break-all text-xs">{r.deviceId || '—'}</dd>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
