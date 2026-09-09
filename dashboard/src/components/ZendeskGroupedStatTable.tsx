"use client";

import { useState } from "react";
import type { ZendeskGroupedStat, ZendeskAgentStat } from "@/lib/data";
import { formatDuration } from "@/lib/format-duration";

function hasRequestTypeBreakdown(
  r: ZendeskGroupedStat | ZendeskAgentStat
): r is ZendeskAgentStat {
  return "byRequestType" in r;
}

export function ZendeskGroupedStatTable({
  title,
  columnLabel,
  rows,
}: {
  title: string;
  columnLabel: string;
  rows: ZendeskGroupedStat[] | ZendeskAgentStat[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  const hasMore = rows.length > 5;
  // "Tickets by Group" passes plain ZendeskGroupedStat rows (no time-by-
  // category breakdown); "Tickets by Agent" passes ZendeskAgentStat, which
  // does — this table renders the extra column only when it's actually there.
  const showRequestTypeColumn = rows.length > 0 && hasRequestTypeBreakdown(rows[0]);

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">{title}</h3>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">{columnLabel}</th>
            <th className="py-2 pr-4">Tickets</th>
            <th className="py-2 pr-4">Avg First Response</th>
            <th className="py-2 pr-4">Avg Resolution</th>
            {showRequestTypeColumn && <th className="py-2 pr-4">Time by Request Type</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.label} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{r.label}</td>
              <td className="py-3 pr-4">{r.count.toLocaleString()}</td>
              <td className="py-3 pr-4">{formatDuration(r.avgReplyMinutes)}</td>
              <td className="py-3 pr-4">{formatDuration(r.avgResolutionMinutes)}</td>
              {showRequestTypeColumn && hasRequestTypeBreakdown(r) && (
                <td className="py-3 pr-4 text-xs text-body-gray">
                  {r.byRequestType.length > 0
                    ? r.byRequestType
                        .slice(0, 3)
                        .map((t) => `${t.requestType}: ${formatDuration(t.totalResolutionMinutes)}`)
                        .join(" · ")
                    : "—"}
                </td>
              )}
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
