// Shared KPI tile — was duplicated identically in page.tsx and
// ZendeskSection.tsx. Number sized up (2xl -> 3xl/4xl, bolder) so it reads
// as a dominant figure at a glance, closer to the density/hierarchy of the
// Quicksilver reference the design review pointed to.
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-heading text-3xl font-extrabold leading-none text-charcoal sm:text-4xl">
        {value}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-body-gray">
        {label}
      </span>
    </div>
  );
}
