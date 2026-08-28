// Shared KPI tile — was duplicated identically in page.tsx and
// ZendeskSection.tsx. size="lg" (default) is for a handful of top-level
// summary tiles, where a dominant number earns its space. size="sm" is for
// metrics repeated per row in a list (e.g. one per campaign card) — the
// same big treatment there just makes every row taller and adds scroll,
// the opposite of the goal.
export function Metric({
  label,
  value,
  size = "lg",
}: {
  label: string;
  value: string;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={
          size === "lg"
            ? "font-heading text-3xl font-extrabold leading-none text-charcoal sm:text-4xl"
            : "font-heading text-lg font-bold leading-none text-charcoal"
        }
      >
        {value}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-body-gray">
        {label}
      </span>
    </div>
  );
}
