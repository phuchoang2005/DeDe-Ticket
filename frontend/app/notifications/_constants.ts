/** Per-notification-type presentation metadata (label, emoji, badge tint). */
export const TYPE_META: Record<string, { label: string; icon: string; tint: string }> = {
  TICKETS_ISSUED: { label: 'Vé phát hành', icon: '🎫', tint: 'bg-brand-100 text-brand-700' },
  EVENT_REMINDER: { label: 'Nhắc nhở sự kiện', icon: '⏰', tint: 'bg-warn-50 text-warn-700' },
  REFUND_ISSUED: { label: 'Hoàn tiền', icon: '💰', tint: 'bg-danger-50 text-danger-600' },
  SEAT_RELEASED: { label: 'Ghế đã giải phóng', icon: '🪑', tint: 'bg-warn-50 text-warn-700' },
  CHECKIN_CONFIRMATION: { label: 'Xác nhận check-in', icon: '✅', tint: 'bg-brand-100 text-brand-700' },
  OTP: { label: 'Mã OTP', icon: '🔐', tint: 'bg-surface-alt text-ink-muted' },
  WELCOME: { label: 'Chào mừng', icon: '👋', tint: 'bg-brand-100 text-brand-700' },
  DEFAULT: { label: 'Thông báo', icon: '📥', tint: 'bg-surface-alt text-ink-muted' },
};

export const meta = (t: string) => TYPE_META[t] || TYPE_META.DEFAULT;
