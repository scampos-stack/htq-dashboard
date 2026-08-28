"use client";

import { useState } from "react";

// Same data shape as HorizontalBarList, but bars run left-to-right using the
// full card width instead of stacking one row per item — a long list (20+
// automations, campaigns, etc.) reads as one compact chart instead of a
// tall scrolling column. Labels go in a legend below rather than under each
// bar, since rotated/truncated axis labels stop being readable past ~10 bars.
export function VerticalBarChart({
  title,
  description,
  rows,
  accent = "bg-amber-500",
  initialCount = 20,
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
      <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">{title}</h3>
      {description && <p className="mb-3 text-xs text-body-gray">{description}</p>}

      <div className="flex h-40 items-end gap-1.5 overflow-x-auto pb-1">
        {visible.map((r, i) => (
          <div
            key={r.label}
            className="flex h-full min-w-[18px] flex-1 flex-col items-center justify-end gap-1"
            title={`${r.label}: ${r.count.toLocaleString()}`}
          >
            <span className="text-[10px] text-body-gray">{r.count.toLocaleString()}</span>
            <div
              className={`w-full rounded-t ${accent}`}
              style={{ height: `${Math.max(2, (r.count / maxCount) * 100)}%` }}
            />
            <span className="text-[9px] text-body-gray">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {visible.map((r, i) => (
          <div key={r.label} className="flex items-center gap-1.5 truncate text-charcoal">
            <span className="text-body-gray">{i + 1}.</span>
            <span className="truncate font-medium" title={r.label}>
              {r.label}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-xs font-semibold text-charcoal underline"
        >
          {expanded ? `Show top ${initialCount}` : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
