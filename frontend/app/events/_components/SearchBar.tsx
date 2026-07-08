/** Search input that fires on Enter or blur. */
export default function SearchBar({ defaultValue, onSearch }: { defaultValue: string; onSearch: (q: string) => void }) {
  return (
    <div className="relative w-full lg:w-[420px]">
      <input
        type="search"
        placeholder="Tìm theo tên sự kiện, nghệ sĩ, địa điểm…"
        defaultValue={defaultValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch((e.target as HTMLInputElement).value);
        }}
        onBlur={(e) => onSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-full border border-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">🔍</span>
    </div>
  );
}
