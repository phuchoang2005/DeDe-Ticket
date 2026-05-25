import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { formatVND, formatDateTime } from '../../utils/format';

const STATUS_CLASS = {
  DRAFT: 'bg-warn-50 text-warn-700',
  PUBLISHED: 'bg-brand-100 text-brand-700',
  CANCELLED: 'bg-danger-50 text-danger-600',
  COMPLETED: 'bg-surface-panel text-ink-muted',
};

export default function AdminEventsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.events()
      .then(setRows)
      .catch((e) => setError(e.message || 'Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter);

  const remove = async (row) => {
    if (!confirm(`Xoá sự kiện "${row.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await adminApi.deleteEvent(row.id);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) {
      alert(e.message || 'Không thể xoá sự kiện');
    }
  };

  const create = async () => {
    try {
      const now = new Date();
      const start = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + 3 * 3600 * 1000);
      const ev = await adminApi.createEvent({
        title: 'Sự kiện mới',
        description: '',
        location: '',
        category: '🎵 Concert',
        organizer: '',
        imageUrl: '',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      navigate(`/admin/events/${ev.id}`);
    } catch (e) {
      alert(e.message || 'Không thể tạo sự kiện');
    }
  };

  if (loading) return <div className="text-center py-12 text-ink-subtle">Đang tải…</div>;
  if (error) return <div className="card p-6 text-danger-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Quản lý sự kiện</h1>
          <p className="text-sm text-ink-subtle mt-1">{rows.length} sự kiện</p>
        </div>
        <button onClick={create} className="btn-primary">+ Tạo sự kiện mới</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`chip ${filter === s ? 'chip-active' : ''}`}>
            {s === 'ALL' ? 'Tất cả' : s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-ink-subtle text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Sự kiện</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium text-right">Ghế</th>
              <th className="px-4 py-3 font-medium text-right">Đã bán</th>
              <th className="px-4 py-3 font-medium text-right">Doanh thu</th>
              <th className="px-4 py-3 font-medium">Bắt đầu</th>
              <th className="px-4 py-3 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-surface-alt cursor-pointer"
                  onClick={() => navigate(`/admin/events/${r.id}`)}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{r.title}</div>
                  <div className="text-xs text-ink-subtle">{r.location} · {(r.categories || []).map((c) => c.name).join(', ') || '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${STATUS_CLASS[r.status] || 'bg-surface-panel text-ink-muted'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-ink">{r.totalSeats}</td>
                <td className="px-4 py-3 text-right text-ink">{r.soldSeats}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-700">{formatVND(r.revenue)}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDateTime(r.startTime)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(r); }}
                    disabled={r.status === 'PUBLISHED'}
                    title={r.status === 'PUBLISHED'
                      ? 'Không thể xoá sự kiện đang công bố. Huỷ hoặc kết thúc trước.'
                      : 'Xoá sự kiện'}
                    className={`px-2 py-1 rounded-md text-xs ${
                      r.status === 'PUBLISHED'
                        ? 'text-ink-faint cursor-not-allowed'
                        : 'text-danger-600 hover:bg-danger-50'
                    }`}>
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-ink-subtle">Không có sự kiện</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-sm">
        <Link to="/admin/analytics" className="btn-outline">📊 Bảng phân tích</Link>
      </div>
    </div>
  );
}
