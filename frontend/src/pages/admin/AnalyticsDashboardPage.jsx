import { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/api';
import { formatVND } from '../../utils/format';

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(14);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsApi.report(days)
      .then(setReport)
      .catch((e) => setError(e.message || 'Lỗi tải dữ liệu'));
  }, [days]);

  if (error) return <div className="card p-6 text-danger-600">{error}</div>;
  if (!report) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;

  const kpi = report.kpis;
  const maxRev = Math.max(1, ...report.revenueByDay.map((p) => Number(p.revenue)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Báo cáo doanh thu & sự kiện</h1>
          <p className="text-xs text-ink-subtle mt-1">Live KPI · cache 60s · design-supplement.md §9</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)}
                    className={`chip ${days === n ? 'chip-active' : ''}`}>{n} ngày</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          caption={`DOANH THU ${days} NGÀY · SUM(PAYMENTS.amount status=SUCCESS)`}
          value={formatVND(kpi.totalRevenue)}
          accent="brand"
        />
        <KpiCard
          caption="VÉ ĐÃ BÁN · COUNT(TICKETS WHERE status IN VALID,USED)"
          value={kpi.ticketsSold.toLocaleString('vi-VN')}
          sub={`${(kpi.capacityFillRate * 100).toFixed(1)}% sức chứa`}
        />
        <KpiCard
          caption="TỶ LỆ THANH TOÁN THÀNH CÔNG"
          value={`${(kpi.paymentSuccessRate * 100).toFixed(1)}%`}
          sub="PO mục tiêu 98%"
          accent={kpi.paymentSuccessRate >= 0.98 ? 'brand' : 'warn'}
        />
        <KpiCard
          caption="TỶ LỆ CHECK-IN"
          value={`${(kpi.checkinRate * 100).toFixed(1)}%`}
          sub={`${kpi.checkinCount}/${kpi.ticketsSold} vé`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Doanh thu theo ngày</h2>
            <span className="text-xs text-ink-subtle">PAYMENTS · status=SUCCESS · DATE created_at</span>
          </div>
          <div className="flex items-end gap-2 h-48">
            {report.revenueByDay.map((p) => {
              const h = (Number(p.revenue) / maxRev) * 100;
              return (
                <div key={p.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="text-[10px] text-ink-subtle truncate w-full text-center">
                    {Number(p.revenue) > 0 ? Math.round(Number(p.revenue) / 1_000_000) + 'M' : ''}
                  </div>
                  <div className="w-full bg-brand-100 rounded-t" style={{ height: `${Math.max(2, h)}%` }}>
                    <div className="w-full bg-brand-600 rounded-t" style={{ height: '100%' }} />
                  </div>
                  <div className="text-[10px] text-ink-subtle">{shortDay(p.date)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Phễu thanh toán</h2>
            <span className="text-xs text-ink-subtle">PAYMENTS</span>
          </div>
          <FunnelBar label="Thành công" value={report.paymentFunnel.succeeded} total={total(report.paymentFunnel)} color="#157F19" />
          <FunnelBar label="Đang chờ" value={report.paymentFunnel.pending} total={total(report.paymentFunnel)} color="#FFB800" />
          <FunnelBar label="Thất bại" value={report.paymentFunnel.failed} total={total(report.paymentFunnel)} color="#C53030" />
          <div className="border-t border-line my-3" />
          <div className="text-sm font-bold text-ink mb-2">Đơn cần bù trừ (paid-no-ticket)</div>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="REFUND_PENDING" value={report.paymentFunnel.refundPending} cls="bg-warn-50 text-warn-700" />
            <Pill label="REFUNDED" value={report.paymentFunnel.refunded} cls="bg-brand-100 text-brand-700" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex justify-between border-b border-line pb-3 mb-4">
          <h2 className="font-bold text-ink">Sự kiện hàng đầu</h2>
          <span className="text-xs text-ink-subtle">JOIN EVENTS · ORDERS · TICKETS</span>
        </div>
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
            {report.topEvents.map((r) => (
              <tr key={r.eventId} className="border-t border-line">
                <td className="py-3">
                  <div className="font-bold text-ink">{r.title}</div>
                  <div className="text-xs text-ink-subtle">{r.category}</div>
                </td>
                <td className="py-3 text-right text-ink">{r.ticketsSold}</td>
                <td className="py-3 text-right font-bold text-brand-700">{formatVND(r.revenue)}</td>
                <td className="py-3 text-right text-ink-muted">{(r.checkinRate * 100).toFixed(1)}%</td>
                <td className="py-3 text-right">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ caption, value, sub, accent }) {
  const accentClass = accent === 'brand'
    ? 'text-brand-700'
    : accent === 'warn' ? 'text-warn-700' : 'text-ink';
  return (
    <div className="card p-5">
      <div className="text-[10px] text-ink-subtle uppercase tracking-wide leading-tight">{caption}</div>
      <div className={`text-2xl font-bold mt-2 ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-subtle mt-2">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span>{label}</span>
        <span>{value} · {pct.toFixed(1)}%</span>
      </div>
      <div className="h-6 rounded bg-surface-alt overflow-hidden">
        <div className="h-full" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

function Pill({ label, value, cls }) {
  return (
    <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-xs ${cls}`}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function total(funnel) {
  return funnel.succeeded + funnel.pending + funnel.failed;
}

function shortDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
