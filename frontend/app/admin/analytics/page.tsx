'use client';

import { useEffect, useState } from 'react';
import { analyticsApi } from '@/services/api';
import { formatVND } from '@/utils/format';
import RequireRole from '@/components/RequireRole';
import type { AnalyticsReport } from '@/types';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];
const DONUT_COLORS = ['#157F19', '#29D52F', '#B6E8BC', '#0E6313', '#FFB800', '#B45309', '#525252', '#989393'];
const SEVERITY: Record<string, { dot: string; bar: string; tag: string }> = {
  ok: { dot: '#29D52F', bar: '#29D52F', tag: 'bg-brand-100 text-brand-700' },
  warn: { dot: '#FFB800', bar: '#FFB800', tag: 'bg-warn-50 text-warn-700' },
  danger: { dot: '#C53030', bar: '#C53030', tag: 'bg-danger-50 text-danger-600' },
};

function AnalyticsDashboardInner() {
  const [days, setDays] = useState(14);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi.report(days)
      .then(setReport)
      .catch((e) => setError(e.message || 'Lỗi tải dữ liệu'));
  }, [days]);

  if (error) return <div className="card p-6 text-danger-600">{error}</div>;
  if (!report) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;

  const kpi = report.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Báo cáo doanh thu & sự kiện</h1>
          <p className="text-xs text-ink-subtle mt-1">Cập nhật trực tiếp · làm mới mỗi phút</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)}
                    className={`chip ${days === n ? 'chip-active' : ''}`}>{n} ngày</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard caption={`Doanh thu ${days} ngày`} value={formatVND(kpi.totalRevenue)} accent="brand" />
        <KpiCard caption="Vé đã bán" value={kpi.ticketsSold.toLocaleString('vi-VN')}
                 sub={`${(kpi.capacityFillRate * 100).toFixed(1)}% sức chứa`} />
        <KpiCard caption="Tỉ lệ thanh toán thành công" value={`${(kpi.paymentSuccessRate * 100).toFixed(1)}%`}
                 sub="Mục tiêu 98%"
                 accent={kpi.paymentSuccessRate >= 0.98 ? 'brand' : 'warn'} />
        <KpiCard caption="Tỉ lệ check-in" value={`${(kpi.checkinRate * 100).toFixed(1)}%`}
                 sub={`${kpi.checkinCount}/${kpi.ticketsSold} vé`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Doanh thu theo ngày</h2>
            <span className="text-xs text-ink-subtle">{days} ngày gần đây</span>
          </div>
          <RevenueLineChart points={report.revenueByDay} />
        </div>

        <div className="card p-6">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Phễu thanh toán</h2>
          </div>
          <FunnelBar label="Thành công" value={report.paymentFunnel.succeeded} total={total(report.paymentFunnel)} color="#157F19" />
          <FunnelBar label="Đang chờ" value={report.paymentFunnel.pending} total={total(report.paymentFunnel)} color="#FFB800" />
          <FunnelBar label="Thất bại" value={report.paymentFunnel.failed} total={total(report.paymentFunnel)} color="#C53030" />
          <div className="border-t border-line my-3" />
          <div className="text-sm font-bold text-ink mb-2">Đơn cần bù trừ</div>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="Chờ hoàn tiền" value={report.paymentFunnel.refundPending} cls="bg-warn-50 text-warn-700" />
            <Pill label="Đã hoàn tiền" value={report.paymentFunnel.refunded} cls="bg-brand-100 text-brand-700" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Phân bổ theo danh mục</h2>
            <span className="text-xs text-ink-subtle">{(report.categoryBreakdown || []).length} danh mục</span>
          </div>
          <CategoryDonut rows={report.categoryBreakdown || []} />
        </div>

        <div className="card p-6">
          <div className="flex justify-between border-b border-line pb-3 mb-4">
            <h2 className="font-bold text-ink">Tín hiệu vận hành & bảo mật</h2>
          </div>
          <SecuritySignals signals={report.securitySignals || []} />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex justify-between border-b border-line pb-3 mb-4">
          <h2 className="font-bold text-ink">Sự kiện hàng đầu</h2>
          <span className="text-xs text-ink-subtle">Theo doanh thu</span>
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

function RevenueLineChart({ points }: { points: { date: string; revenue: number }[] }) {
  const W = 720, H = 240, PAD_L = 48, PAD_R = 12, PAD_T = 16, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const data = (points || []).map((p) => ({ date: p.date, value: Number(p.revenue) }));
  if (data.length === 0) {
    return <div className="text-ink-subtle text-sm py-12 text-center">Chưa có dữ liệu doanh thu.</div>;
  }
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const niceMax = niceCeil(maxV);
  const xFor = (i: number) => PAD_L + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const yFor = (v: number) => PAD_T + innerH - (v / niceMax) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.value)}`).join(' ');
  const areaPath =
    `${linePath} L ${xFor(data.length - 1)} ${PAD_T + innerH} L ${xFor(0)} ${PAD_T + innerH} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map((p) => ({
    y: PAD_T + innerH - p * innerH,
    label: formatShort(niceMax * p),
  }));

  const xTickIdxs = data.length <= 7
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((3 * data.length) / 4), data.length - 1];

  const last = data.length - 1;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Doanh thu theo ngày">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={g.y} y2={g.y} stroke="#F0F0F0" strokeDasharray="3 3" />
            <text x={PAD_L - 6} y={g.y + 3} textAnchor="end" fontSize="10" fill="#989393">{g.label}</text>
          </g>
        ))}
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + innerH} stroke="#E3E3E3" />
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="#E3E3E3" />

        <path d={areaPath} fill="#157F19" fillOpacity="0.12" />
        <path d={linePath} fill="none" stroke="#157F19" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => {
          const isLast = i === last;
          return (
            <g key={i}>
              <circle cx={xFor(i)} cy={yFor(d.value)} r={isLast ? 5 : 3} fill="#157F19"
                      stroke={isLast ? 'white' : 'none'} strokeWidth={isLast ? 2 : 0}>
                <title>{shortDay(d.date)} · {formatVND(d.value)}</title>
              </circle>
            </g>
          );
        })}

        {xTickIdxs.map((idx) => (
          <text key={idx} x={xFor(idx)} y={H - 8} fontSize="10" fill="#989393" textAnchor="middle">
            {shortDay(data[idx].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function CategoryDonut({ rows }: { rows: { category: string; eventCount: number }[] }) {
  const data = (rows || []).filter((r) => r.eventCount > 0);
  if (data.length === 0) {
    return <div className="text-ink-subtle text-sm py-8 text-center">Chưa có dữ liệu.</div>;
  }
  const total = data.reduce((acc, r) => acc + r.eventCount, 0);
  const size = 180, stroke = 28, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
          {data.map((row, i) => {
            const frac = row.eventCount / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={row.category}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}>
                <title>{row.category}: {row.eventCount} sự kiện ({((frac) * 100).toFixed(1)}%)</title>
              </circle>
            );
            offset += dash;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xs text-ink-subtle">Tổng</div>
          <div className="text-xl font-bold text-ink">{total}</div>
          <div className="text-[10px] text-ink-subtle">sự kiện</div>
        </div>
      </div>
      <div className="flex-1 min-w-[180px] space-y-1.5">
        {data.map((row, i) => (
          <div key={row.category} className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-ink-muted truncate flex-1">{row.category}</span>
            <span className="text-ink font-medium">{row.eventCount}</span>
            <span className="text-ink-subtle text-xs w-12 text-right">{((row.eventCount / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySignals({ signals }: { signals: { code: string; label: string; count: number; severity: string }[] }) {
  const maxV = Math.max(1, ...signals.map((s) => Number(s.count)));
  return (
    <div className="space-y-3">
      {signals.map((s) => {
        const sev = SEVERITY[s.severity] || SEVERITY.ok;
        const pct = (Number(s.count) / maxV) * 100;
        return (
          <div key={s.code}>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-2 text-ink-muted">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: sev.dot }} />
                {s.label}
              </span>
              <span className="font-bold text-ink">{s.count} lần</span>
            </div>
            <div className="h-2 rounded bg-surface-alt overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.max(2, pct)}%`, background: sev.bar }} />
            </div>
          </div>
        );
      })}
      <div className="text-xs text-ink-subtle pt-2 border-t border-line">
        Chỉ số bất thường sẽ chuyển sang màu cam hoặc đỏ — kiểm tra ngay khi có tín hiệu cảnh báo.
      </div>
    </div>
  );
}

function KpiCard({ caption, value, sub, accent }: { caption: string; value: React.ReactNode; sub?: string; accent?: string }) {
  const accentClass = accent === 'brand' ? 'text-brand-700' : accent === 'warn' ? 'text-warn-700' : 'text-ink';
  return (
    <div className="card p-5">
      <div className="text-[10px] text-ink-subtle uppercase tracking-wide leading-tight">{caption}</div>
      <div className={`text-2xl font-bold mt-2 ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-subtle mt-2">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
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

function Pill({ label, value, cls }: { label: string; value: React.ReactNode; cls: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-xs ${cls}`}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function total(funnel: { succeeded: number; pending: number; failed: number }) {
  return funnel.succeeded + funnel.pending + funnel.failed;
}

function shortDay(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

function formatShort(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(Math.round(v));
}

export default function AnalyticsDashboardPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AnalyticsDashboardInner />
    </RequireRole>
  );
}
