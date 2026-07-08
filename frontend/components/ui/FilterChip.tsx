/** Horizontal scrolling filter chip (mobile notification/type filters). */
export default function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button onClick={onClick} className={`chip whitespace-nowrap ${active ? 'chip-active' : ''}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}
