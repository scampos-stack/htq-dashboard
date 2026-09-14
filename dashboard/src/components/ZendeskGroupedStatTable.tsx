"use client";

import { useState } from "react";
import type { ZendeskGroupedStat, ZendeskAgentStat } from "@/lib/data";
import { formatDuration } from "@/lib/format-duration";

const MAX_REQUEST_TYPE_COLUMNS = 6;

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
  // does — this table renders the extra columns only when it's actually there.
  const showRequestTypeColumns = rows.length > 0 && hasRequestTypeBreakdown(rows[0]);

  // 30+ distinct request types exist account-wide — one column per type
  // would be unreadably wide, so only the top N by total time (summed
  // across every agent) get a dedicated column; everything else rolls up
  // into "Other".
  let requestTypeColumns: string[] = [];
  if (showRequestTypeColumns) {
    const totals = new Map<string, number>();
    for (const r of rows) {
      if (!hasRequestTypeBreakdown(r)) continue;
      for (const t of r.byRequestType) {
        totals.set(t.requestType, (totals.get(t.requestType) ?? 0) + t.totalResolutionMinutes);
      }
    }
    requestTypeColumns = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_REQUEST_TYPE_COLUMNS)
      .map(([type]) => type);
  }

  function minutesFor(r: ZendeskAgentStat, type: string): number {
    return r.byRequestType.find((t) => t.requestType === type)?.totalResolutionMinutes ?? 0;
  }

  function otherMinutes(r: ZendeskAgentStat): number {
    return r.byRequestType
      .filter((t) => !requestTypeColumns.includes(t.requestType))
      .reduce((sum, t) => sum + t.totalResolutionMinutes, 0);
  }

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
            {requestTypeColumns.map((type) => (
              <th key={type} className="py-2 pr-4 whitespace-nowrap" title={type}>
                {type}
              </th>
            ))}
            {showRequestTypeColumns && <th className="py-2 pr-4">Other</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.label} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{r.label}</td>
              <td className="py-3 pr-4">{r.count.toLocaleString()}</td>
              <td className="py-3 pr-4">{formatDuration(r.avgReplyMinutes)}</td>
              <td className="py-3 pr-4">{formatDuration(r.avgResolutionMinutes)}</td>
              {hasRequestTypeBreakdown(r) &&
                requestTypeColumns.map((type) => (
                  <td key={type} className="py-3 pr-4 text-xs text-body-gray">
                    {minutesFor(r, type) > 0 ? formatDuration(minutesFor(r, type)) : "—"}
                  </td>
                ))}
              {hasRequestTypeBreakdown(r) && (
                <td className="py-3 pr-4 text-xs text-body-gray">
                  {otherMinutes(r) > 0 ? formatDuration(otherMinutes(r)) : "—"}
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
