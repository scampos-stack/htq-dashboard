"use client";

import { useState } from "react";

export function ExpandableBreakdownTable({
  title,
  description,
  columnLabel,
  rows,
  initialCount = 5,
}: {
  title: string;
  description?: string;
  columnLabel: string;
  rows: { label: string; count: number }[];
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, initialCount);
  const hasMore = rows.length > initialCount;

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">{title}</h3>
      {description && <p className="mb-3 text-xs text-body-gray">{description}</p>}
      <table className="w-full min-w-[220px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">{columnLabel}</th>
            <th className="py-2 pr-4">Count</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.label} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{r.label}</td>
              <td className="py-3 pr-4">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-semibold text-charcoal underline"
        >
          {expanded ? "Show top 5" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
