import Link from 'next/link';
import type { ReactNode } from 'react';
import { dayCard, formatVND } from '@/utils/format';
import type { Ticket } from '@/types';

function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = tone === 'green' ? 'bg-brand-100 text-brand-700 font-bold' : 'bg-white border border-line text-ink-muted';
  return <span className={`text-xs px-2 py-1 rounded ${cls}`}>{children}</span>;
}

/** Ticket card linking to detail, with a date stub, seat tags and delete action. */
export default function TicketRow({ ticket, onDelete }: { ticket: Ticket; onDelete: () => void }) {
  const d = dayCard(ticket.eventStartTime);
  const isValid = ticket.status === 'VALID';
  const canDelete = ticket.status !== 'USED' && ticket.status !== 'CANCELLED';
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  };
  return (
    <Link href={`/tickets/${ticket.id}`} className="card overflow-hidden flex hover:shadow-pop transition">
      <div
        className={`w-20 sm:w-32 shrink-0 p-3 sm:p-4 flex flex-col items-center justify-center text-center ${
          isValid ? 'bg-brand-100 text-brand-700' : 'bg-surface-panel text-ink-muted'
        }`}
      >
        <div className="text-2xl sm:text-4xl font-bold leading-none">{d.day}</div>
        <div className="text-[10px] sm:text-[11px] mt-1 font-semibold tracking-wider">{d.monthYear}</div>
        <div className="text-[11px] sm:text-xs mt-1 text-ink-muted">{d.time}</div>
        <div
          className={`mt-2 sm:mt-3 text-[10px] font-bold tracking-wider ${isValid ? 'text-brand-700' : 'text-ink-subtle'}`}
        >
          {ticket.status}
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-4 min-w-0">
        <div className="text-sm sm:text-base font-bold text-ink leading-snug line-clamp-2">{ticket.eventTitle}</div>
        <div className="text-xs sm:text-sm text-ink-muted mt-0.5 truncate">{ticket.eventLocation}</div>
        <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3">
          <Tag tone="green">
            {ticket.section} · {ticket.rowLabel}-{ticket.seatNumber}
          </Tag>
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
            className="text-xs text-danger-600 border border-danger-200 hover:bg-danger-50 px-2 py-1 rounded font-semibold whitespace-nowrap"
          >
            Xoá vé
          </button>
        )}
      </div>
    </Link>
  );
}
