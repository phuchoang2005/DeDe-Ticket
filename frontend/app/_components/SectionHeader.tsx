import Link from 'next/link';

/** Section title with optional subtitle and a "see all" link. */
export default function SectionHeader({
  title,
  subtitle,
  linkTo,
}: {
  title: string;
  subtitle?: string;
  linkTo?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-subtle mt-0.5">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link href={linkTo} className="text-sm font-semibold text-brand-700 hover:underline">
          Xem tất cả →
        </Link>
      )}
    </div>
  );
}
