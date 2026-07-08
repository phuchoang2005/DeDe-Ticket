/** Confirmation shown after feedback is submitted. */
export default function FeedbackSuccess({ onHome, onAgain }: { onHome: () => void; onAgain: () => void }) {
  return (
    <div className="max-w-lg mx-auto card p-8 text-center space-y-4">
      <div className="text-4xl">✅</div>
      <h1 className="text-xl font-bold text-ink">Cảm ơn phản hồi của bạn!</h1>
      <p className="text-ink-muted text-sm">Chúng tôi đã nhận được ý kiến của bạn và sẽ xem xét sớm nhất có thể.</p>
      <div className="flex gap-3 justify-center pt-2">
        <button onClick={onHome} className="btn-ghost">
          Về trang chủ
        </button>
        <button onClick={onAgain} className="btn-primary">
          Gửi thêm
        </button>
      </div>
    </div>
  );
}
