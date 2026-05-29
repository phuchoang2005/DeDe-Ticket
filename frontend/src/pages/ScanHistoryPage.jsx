import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketApi } from '../services/api';
import { formatDateTime } from '../utils/format';

// Read-only check-in audit: who scanned which ticket, on what device, when.
// Backed by the check_ins table (successful check-ins only).
export default function ScanHistoryPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    setRows(null);
    ticketApi
      .scanHistory(200)
      .then(setRows)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

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

      {error && <div className="text-sm text-danger-600">Lỗi: {error}</div>}
      {!error && rows === null && <div className="text-sm text-ink-subtle">Đang tải…</div>}
      {rows && rows.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink-subtle">Chưa có lượt soát vé nào.</div>
      )}

      {rows && rows.length > 0 && (
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
                {rows.map((r) => (
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
            {rows.map((r) => (
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
