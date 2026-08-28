// Plain anchor links, not a client component — the whole point is to show
// every module in this arrangement up front so scrolling down is a choice,
// not a surprise. No JS needed for #id navigation.
export function JumpNav({ items }: { items: { id: string; label: string; dot: string }[] }) {
  if (items.length <= 1) return null;
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
        >
          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
          {item.label}
        </a>
      ))}
    </nav>
  );
}
