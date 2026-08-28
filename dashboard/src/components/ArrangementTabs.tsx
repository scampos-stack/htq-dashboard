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

export function ArrangementTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("arrangement") ?? "overview";

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {ARRANGEMENTS.map((a) => {
        const active = current === a.value;
        return (
          <button
            key={a.value}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (a.value === "overview") {
                params.delete("arrangement");
              } else {
                params.set("arrangement", a.value);
              }
              router.push(`/?${params.toString()}`);
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-charcoal text-white"
                : "bg-white text-charcoal hover:bg-charcoal/5"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${a.dot}`} />
            {a.label}
          </button>
        );
      })}
    </nav>
  );
}
