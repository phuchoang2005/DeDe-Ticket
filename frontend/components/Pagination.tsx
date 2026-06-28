'use client';

import type { ReactNode } from 'react';

/** Responsive pager: prev/next on mobile, numbered on desktop. */
export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const numbers = pageNumbers(page, totalPages);
  return (
    <nav className="pt-2" aria-label="Phân trang">
      {/* Mobile: prev on far-left, next on far-right, page/total in centre */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</PageBtn>
        <span className="text-sm text-ink-muted font-semibold">
          Trang <span className="text-ink">{page}</span> / {totalPages}
        </span>
        <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau ›</PageBtn>
      </div>
      {/* Desktop: full numbered pagination, prev and next stay on the ends */}
      <div className="hidden sm:flex justify-center items-center gap-1.5">
        <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</PageBtn>
        {numbers.map((n, i) =>
          n === '…' ? (
            <span key={`g${i}`} className="px-2 text-ink-subtle">…</span>
          ) : (
            <PageBtn key={n} active={n === page} onClick={() => onChange(n as number)}>{n}</PageBtn>
          ),
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau ›</PageBtn>
      </div>
    </nav>
  );
}

function PageBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[44px] sm:min-w-[36px] h-9 px-3 rounded-lg text-sm border transition ${
        active
          ? 'bg-brand-600 text-white border-brand-600 font-bold'
          : disabled
            ? 'bg-white text-ink-faint border-line cursor-not-allowed'
            : 'bg-white text-ink-muted border-line hover:border-brand-600 hover:text-brand-700'
      }`}>
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | string)[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push('…');
  out.push(total);
  return out;
}
