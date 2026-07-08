import { formatVND } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import type { AnalyticsReport } from '@/types';

/** Ranked table of top events by revenue. */
export default function TopEventsTable({ rows }: { rows: AnalyticsReport['topEvents'] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-ink-subtle text-left">
        <tr>
          <th className="py-2 font-medium">Sự kiện</th>
          <th className="py-2 font-medium text-right">Vé bán</th>
          <th className="py-2 font-medium text-right">Doanh thu</th>
          <th className="py-2 font-medium text-right">Check-in</th>
          <th className="py-2 font-medium text-right">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.eventId} className="border-t border-line">
            <td className="py-3">
              <div className="font-bold text-ink">{r.title}</div>
              <div className="text-xs text-ink-subtle">{r.category}</div>
            </td>
            <td className="py-3 text-right text-ink">{r.ticketsSold}</td>
            <td className="py-3 text-right font-bold text-brand-700">{formatVND(r.revenue)}</td>
            <td className="py-3 text-right text-ink-muted">{(r.checkinRate * 100).toFixed(1)}%</td>
            <td className="py-3 text-right">
              <Badge className="px-2 py-1 text-xs bg-brand-100 text-brand-700">{r.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
