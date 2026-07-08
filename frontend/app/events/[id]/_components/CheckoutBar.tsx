import { formatVND } from '@/utils/format';

/** Mobile sticky bottom checkout bar (seat count + total + CTA). */
export default function CheckoutBar({
  count,
  total,
  error,
  busy,
  isAuthed,
  onCheckout,
}: {
  count: number;
  total: number;
  error: string | null;
  busy: boolean;
  isAuthed: boolean;
  onCheckout: () => void;
}) {
  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-20 bg-white border-t border-line shadow-pop">
      <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-ink-subtle leading-none">
            {count === 0 ? 'Chưa chọn ghế' : `${count} ghế`}
          </div>
          <div className="text-base font-bold text-brand-700 leading-tight truncate">{formatVND(total)}</div>
          {error && <div className="text-[11px] text-danger-600 truncate">{error}</div>}
        </div>
        <button
          type="button"
          disabled={count === 0 || busy}
          onClick={onCheckout}
          className="btn-primary shrink-0 text-sm"
        >
          {busy ? 'Đang giữ…' : isAuthed ? 'Tiếp tục' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
