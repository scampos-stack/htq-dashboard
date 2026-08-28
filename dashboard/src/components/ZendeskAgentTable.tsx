"use client";

import { useState } from "react";
import type { ZendeskAgentStat } from "@/lib/data";
import { formatDuration } from "@/lib/format-duration";

export function ZendeskAgentTable({ agents }: { agents: ZendeskAgentStat[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? agents : agents.slice(0, 5);
  const hasMore = agents.length > 5;

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
        Tickets by Agent
      </h3>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Agent</th>
            <th className="py-2 pr-4">Tickets</th>
            <th className="py-2 pr-4">Avg First Response</th>
            <th className="py-2 pr-4">Avg Resolution</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((a) => (
            <tr key={a.agent} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{a.agent}</td>
              <td className="py-3 pr-4">{a.count.toLocaleString()}</td>
              <td className="py-3 pr-4">{formatDuration(a.avgReplyMinutes)}</td>
              <td className="py-3 pr-4">{formatDuration(a.avgResolutionMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-semibold text-charcoal underline"
        >
          {expanded ? "Show top 5" : `Show all ${agents.length}`}
        </button>
      )}
    </div>
  );
}
