/** Vietnamese labels and badge colours for feedback status/category codes. */

export const STATUS_LABELS: Record<string, string> = { NEW: 'Mới', READ: 'Đã đọc', RESOLVED: 'Đã xử lý' };

export const STATUS_CLASSES: Record<string, string> = {
  NEW: 'bg-danger-50 text-danger-600',
  READ: 'bg-warn-50 text-warn-700',
  RESOLVED: 'bg-brand-50 text-brand-700',
};

export const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Chung',
  EVENT: 'Sự kiện',
  PAYMENT: 'Thanh toán',
  BUG_REPORT: 'Báo lỗi',
  SUGGESTION: 'Đề xuất',
};
