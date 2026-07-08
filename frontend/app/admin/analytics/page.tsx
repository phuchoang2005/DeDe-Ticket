'use client';

import { useState } from 'react';
import { analyticsApi } from '@/services/api';
import { formatVND } from '@/utils/format';
import { useAsync } from '@/hooks/useAsync';
import RequireRole from '@/components/RequireRole';
import KpiCard from '@/components/ui/KpiCard';
import Pill from '@/components/ui/Pill';
import RevenueLineChart from './_components/RevenueLineChart';
import CategoryDonut from './_components/CategoryDonut';
import SecuritySignals from './_components/SecuritySignals';
import FunnelBar from './_components/FunnelBar';
import TopEventsTable from './_components/TopEventsTable';

const ADMIN_ROLES = ['ADMIN', 'ORGANIZER'];

function AnalyticsDashboardInner() {
  const [days, setDays] = useState(14);
  const { data: report, error } = useAsync(() => analyticsApi.report(days), [days]);

  if (error) return <div className="card p-6 text-danger-600">{error}</div>;
  if (!report) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;

  const kpi = report.kpis;
  const funnel = report.paymentFunnel;
  const funnelTotal = funnel.succeeded + funnel.pending + funnel.failed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Báo cáo doanh thu & sự kiện</h1>
          <p className="text-xs text-ink-subtle mt-1">Cập nhật trực tiếp · làm mới mỗi phút</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={`chip ${days === n ? 'chip-active' : ''}`}>
              {n} ngày
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard caption={`Doanh thu ${days} ngày`} value={formatVND(kpi.totalRevenue)} accent="brand" />
        <KpiCard
          caption="Vé đã bán"
          value={kpi.ticketsSold.toLocaleString('vi-VN')}
          sub={`${(kpi.capacityFillRate * 100).toFixed(1)}% sức chứa`}
        />
        <KpiCard
          caption="Tỉ lệ thanh toán thành công"
          value={`${(kpi.paymentSuccessRate * 100).toFixed(1)}%`}
          sub="Mục tiêu 98%"
          accent={kpi.paymentSuccessRate >= 0.98 ? 'brand' : 'warn'}
        />
        <KpiCard
          caption="Tỉ lệ check-in"
          value={`${(kpi.checkinRate * 100).toFixed(1)}%`}
          sub={`${kpi.checkinCount}/${kpi.ticketsSold} vé`}
        />
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
          <FunnelBar label="Thành công" value={funnel.succeeded} total={funnelTotal} color="#157F19" />
          <FunnelBar label="Đang chờ" value={funnel.pending} total={funnelTotal} color="#FFB800" />
          <FunnelBar label="Thất bại" value={funnel.failed} total={funnelTotal} color="#C53030" />
          <div className="border-t border-line my-3" />
          <div className="text-sm font-bold text-ink mb-2">Đơn cần bù trừ</div>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="Chờ hoàn tiền" value={funnel.refundPending} cls="bg-warn-50 text-warn-700" />
            <Pill label="Đã hoàn tiền" value={funnel.refunded} cls="bg-brand-100 text-brand-700" />
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
        <TopEventsTable rows={report.topEvents} />
      </div>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  return (
    <RequireRole roles={ADMIN_ROLES}>
      <AnalyticsDashboardInner />
    </RequireRole>
  );
}
