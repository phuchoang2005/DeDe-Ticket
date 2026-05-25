import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ticketApi } from '../services/api';
import { dayCard, formatVND } from '../utils/format';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'VALID', label: 'Còn hiệu lực' },
  { key: 'USED', label: 'Đã sử dụng' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const location = useLocation();
  const justPaid = location.state?.justPaidOrder;

  const reload = () => {
    setLoading(true);
    ticketApi
      .list()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Xoá vé này? Ghế sẽ được trả về kho và đơn vé sẽ chuyển sang trạng thái "Đã huỷ".')) return;
    try {
      await ticketApi.delete(id);
      reload();
    } catch (err) {
      window.alert('Không thể xoá vé: ' + (err.message || 'lỗi không xác định'));
    }
  };

  const counts = useMemo(() => {
    const c = { all: tickets.length, VALID: 0, USED: 0, CANCELLED: 0 };
    for (const t of tickets) if (c[t.status] != null) c[t.status]++;
    return c;
  }, [tickets]);

  const filtered = useMemo(
    () => (tab === 'all' ? tickets : tickets.filter((t) => t.status === tab)),
    [tickets, tab],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Vé của tôi</h1>
        <p className="text-sm text-ink-subtle mt-1">Tất cả vé đã mua từ tài khoản của bạn</p>
      </div>

      {justPaid && (
        <div className="rounded-xl bg-brand-50 border border-brand-200 text-brand-700 p-4 text-sm flex items-center gap-2">
          ✅ Thanh toán đơn #{justPaid} thành công. Vé của bạn ở dưới đây.
        </div>
      )}

      <div className="card p-2 overflow-x-auto">
        <div className="flex gap-1 w-max sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-alt'
              }`}>
              {t.label} ({t.key === 'all' ? counts.all : counts[t.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-ink-subtle">Đang tải…</div>}
      {error && <div className="text-danger-600">Lỗi: {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-ink-subtle">Chưa có vé nào trong mục này.</div>
      )}

      <div className="space-y-4">
        {filtered.map((t) => (
          <TicketRow key={t.id} ticket={t} onDelete={() => remove(t.id)} />
        ))}
      </div>
    </div>
  );
}

function TicketRow({ ticket, onDelete }) {
  const d = dayCard(ticket.eventStartTime);
  const isValid = ticket.status === 'VALID';
  const canDelete = ticket.status !== 'USED' && ticket.status !== 'CANCELLED';
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  };
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="card overflow-hidden flex hover:shadow-pop transition">
      <div
        className={`w-20 sm:w-32 shrink-0 p-3 sm:p-4 flex flex-col items-center justify-center text-center ${
          isValid ? 'bg-brand-100 text-brand-700' : 'bg-surface-panel text-ink-muted'
        }`}>
        <div className="text-2xl sm:text-4xl font-bold leading-none">{d.day}</div>
        <div className="text-[10px] sm:text-[11px] mt-1 font-semibold tracking-wider">{d.monthYear}</div>
        <div className="text-[11px] sm:text-xs mt-1 text-ink-muted">{d.time}</div>
        <div className={`mt-2 sm:mt-3 text-[10px] font-bold tracking-wider ${isValid ? 'text-brand-700' : 'text-ink-subtle'}`}>
          {ticket.status}
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-4 min-w-0">
        <div className="text-sm sm:text-base font-bold text-ink leading-snug line-clamp-2">{ticket.eventTitle}</div>
        <div className="text-xs sm:text-sm text-ink-muted mt-0.5 truncate">{ticket.eventLocation}</div>
        <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3">
          <Tag tone="green">{ticket.section} · {ticket.rowLabel}-{ticket.seatNumber}</Tag>
          <Tag>{formatVND(ticket.price)}</Tag>
        </div>
        <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-ink-subtle truncate">
          QR: <code className="font-mono">{ticket.qrCode.slice(0, 16)}…</code>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between p-3 sm:p-4 gap-2">
        <div className="hidden sm:block text-brand-700 text-sm font-semibold">Xem vé →</div>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-danger-600 border border-danger-200 hover:bg-danger-50 px-2 py-1 rounded font-semibold whitespace-nowrap">
            Xoá vé
          </button>
        )}
      </div>
    </Link>
  );
}

function Tag({ children, tone }) {
  const cls = tone === 'green'
    ? 'bg-brand-100 text-brand-700 font-bold'
    : 'bg-white border border-line text-ink-muted';
  return <span className={`text-xs px-2 py-1 rounded ${cls}`}>{children}</span>;
}
