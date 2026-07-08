/** Status/category filter bar for the feedback inbox. */
export default function FeedbackFilters({
  status,
  category,
  total,
  onFilter,
}: {
  status: string;
  category: string;
  total: number;
  onFilter: (key: string, val: string) => void;
}) {
  return (
    <div className="p-4 border-b border-line flex flex-wrap gap-3 items-center">
      <select
        value={status}
        onChange={(e) => onFilter('status', e.target.value)}
        className="input text-sm py-1.5 px-3 w-40"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="NEW">Mới</option>
        <option value="READ">Đã đọc</option>
        <option value="RESOLVED">Đã xử lý</option>
      </select>
      <select
        value={category}
        onChange={(e) => onFilter('category', e.target.value)}
        className="input text-sm py-1.5 px-3 w-44"
      >
        <option value="">Tất cả loại</option>
        <option value="GENERAL">Chung</option>
        <option value="EVENT">Sự kiện</option>
        <option value="PAYMENT">Thanh toán</option>
        <option value="BUG_REPORT">Báo lỗi</option>
        <option value="SUGGESTION">Đề xuất</option>
      </select>
      <span className="ml-auto text-xs text-ink-subtle">{total} phản hồi</span>
    </div>
  );
}
