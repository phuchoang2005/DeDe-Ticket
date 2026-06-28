'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ticketApi } from '@/services/api';
import { dayCard, formatDateTime, formatVND } from '@/utils/format';
import RequireAuth from '@/components/RequireAuth';
import type { Ticket } from '@/types';

function TicketDetailInner() {
  const params = useParams();
  const id = String(params.id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ticketApi.get(id).then(setTicket).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="text-danger-600">Lỗi: {error}</div>;
  if (!ticket) return <div className="text-ink-subtle">Đang tải…</div>;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(ticket.qrCode)}`;
  const d = dayCard(ticket.eventStartTime);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/tickets" className="text-sm text-brand-700 hover:underline">← Quay lại Vé của tôi</Link>

      <div className="card overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col sm:grid sm:grid-cols-[120px_1fr] gap-4 sm:gap-5 border-b border-line">
          <div className="rounded-xl bg-brand-100 text-brand-700 p-3 sm:p-4 flex sm:flex-col items-center justify-center gap-4 sm:gap-1 text-center">
            <div className="text-3xl sm:text-4xl font-bold leading-none">{d.day}</div>
            <div className="text-left sm:text-center">
              <div className="text-[11px] font-semibold tracking-wider">{d.monthYear}</div>
              <div className="text-xs text-ink-muted">{d.time}</div>
              <div className="mt-1 sm:mt-2 text-[10px] font-bold tracking-wider">{ticket.status}</div>
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink leading-snug">{ticket.eventTitle}</h1>
            <div className="text-ink-muted mt-1 text-sm sm:text-base">📍 {ticket.eventLocation}</div>
            <div className="text-ink-muted text-sm sm:text-base">📅 {formatDateTime(ticket.eventStartTime)}</div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-brand-100 text-brand-700 font-bold px-2 py-1 rounded">
                {ticket.section} · {ticket.rowLabel}-{ticket.seatNumber}
              </span>
              <span className="bg-white border border-line text-ink-muted px-2 py-1 rounded">
                {formatVND(ticket.price)}
              </span>
            </div>
          </div>
        </div>

        {/* perforated divider */}
        <div className="relative h-px bg-line" />

        <div className="p-4 sm:p-6 text-center">
          <div className="text-xs text-ink-subtle mb-3">QR · vui lòng xuất trình tại cổng</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code" className="mx-auto rounded-lg border border-line shadow-sm max-w-full h-auto" />
          <div className="font-mono text-xs text-ink-muted mt-3 break-all">{ticket.qrCode}</div>
          <div className="text-xs text-ink-subtle mt-1">Phát hành: {formatDateTime(ticket.issuedAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <RequireAuth>
      <TicketDetailInner />
    </RequireAuth>
  );
}
