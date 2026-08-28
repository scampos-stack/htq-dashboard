"use client";

import { useState } from "react";

// Drop-in visual replacement for a plain label/count table — same data
// shape as ExpandableBreakdownTable, but rendered as bars so the numbers
// have something to look at instead of two columns of digits.
export function HorizontalBarList({
  title,
  description,
  rows,
  accent = "bg-violet-500",
  initialCount = 5,
}: {
  title: string;
  description?: string;
  rows: { label: string; count: number }[];
  accent?: string;
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, initialCount);
  const hasMore = rows.length > initialCount;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">{title}</h3>
      {description && <p className="mb-3 text-xs text-body-gray">{description}</p>}
      <div className="flex flex-col gap-3">
        {visible.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-charcoal">{r.label}</span>
              <span className="text-body-gray">{r.count.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/5">
              <div
                className={`h-full rounded-full ${accent}`}
                style={{ width: `${(r.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-xs font-semibold text-charcoal underline"
        >
          {expanded ? "Show top 5" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
