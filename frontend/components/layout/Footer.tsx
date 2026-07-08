/** App footer with copyright and the mock-payment notice. */
export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-ink-subtle flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
        <span>© 2026 Dề Dê Ticketing · ITPJ2602 Capstone</span>
        <span className="sm:text-right">Thanh toán đang ở chế độ giả lập — click thanh toán sẽ luôn thành công.</span>
      </div>
    </footer>
  );
}
