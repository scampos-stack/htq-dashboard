"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Top-level tabs that switch the whole dashboard *arrangement* — every
// module inside one arrangement renders at once in a grid, unlike SourceNav
// (removed) which showed exactly one source at a time. Matches Sam's
// review: tabs pick a view, not a single module.
const ARRANGEMENTS = [
  { value: "overview", label: "Overview", dot: "bg-charcoal" },
  { value: "marketing", label: "Marketing", dot: "bg-brand-green" },
  { value: "support", label: "Support", dot: "bg-teal-500" },
];

// Saved custom views (see DashboardViewsManager) are picked by value
// "view-<id>", same mechanism as the fixed arrangements. A pill per view
// got noisy once there were more than a couple, so they live in a dropdown
// next to the fixed tabs instead of one pill each.
export function ArrangementTabs({ views = [] }: { views?: { id: number; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("arrangement") ?? "overview";
  const activeViewValue = current.startsWith("view-") ? current : "";

  function go(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview" || value === "") {
      params.delete("arrangement");
    } else {
      params.set("arrangement", value);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {ARRANGEMENTS.map((a) => {
        const active = current === a.value;
        return (
          <button
            key={a.value}
            onClick={() => go(a.value)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-charcoal text-white" : "bg-white text-charcoal hover:bg-charcoal/5"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${a.dot}`} />
            {a.label}
          </button>
        );
      })}
      {views.length > 0 && (
        <select
          value={activeViewValue}
          onChange={(e) => go(e.target.value)}
          className={`rounded-full border-none px-4 py-2.5 text-sm font-semibold outline-none ${
            activeViewValue ? "bg-charcoal text-white" : "bg-white text-charcoal hover:bg-charcoal/5"
          }`}
        >
          <option value="">Saved Views</option>
          {views.map((v) => (
            <option key={v.id} value={`view-${v.id}`}>
              {v.name}
            </option>
          ))}
        </select>
      )}
    </nav>
  );
}
