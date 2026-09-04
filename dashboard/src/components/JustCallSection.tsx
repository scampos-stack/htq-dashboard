import { Suspense } from "react";
import type { JustCallSummary } from "@/lib/data";
import { DonutChart } from "@/components/DonutChart";
import { HorizontalBarList } from "@/components/HorizontalBarList";
import { SectionTabs } from "@/components/SectionTabs";
import { Metric } from "@/components/Metric";
import { JustCallRangeSelect } from "@/components/JustCallRangeSelect";

function formatCallDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function JustCallSection({ summary }: { summary: JustCallSummary }) {
  const rangeSelect = (
    <div className="mb-4 flex justify-end">
      <Suspense fallback={null}>
        <JustCallRangeSelect />
      </Suspense>
    </div>
  );

  if (summary.totalCalls === 0) {
    return (
      <div>
        {rangeSelect}
        <p className="text-body-gray">
          No JustCall calls in this range — try widening it, or click
          &quot;Sync Now&quot; if nothing has synced yet.
        </p>
      </div>
    );
  }

  const answered = summary.byType.find((t) => t.type === "answered")?.count ?? 0;
  const missed = summary.byType.find((t) => t.type === "missed")?.count ?? 0;
  const incoming = summary.byDirection.find((d) => d.direction === "Incoming")?.count ?? 0;
  const outgoing = summary.byDirection.find((d) => d.direction === "Outgoing")?.count ?? 0;
  const allDurations = summary.recent
    .map((c) => c.durationSeconds)
    .filter((d): d is number => d != null);
  const avgDurationSeconds =
    allDurations.length > 0
      ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
      : null;

  const overviewTab = (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric label="Total Calls" value={summary.totalCalls.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric
            label="Answered / Missed"
            value={`${answered.toLocaleString()} / ${missed.toLocaleString()}`}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric label="Avg Call Duration" value={formatCallDuration(avgDurationSeconds)} />
        </div>
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric label="Inbound / Outbound" value={`${incoming.toLocaleString()} / ${outgoing.toLocaleString()}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DonutChart
          title="Calls by Direction"
          segments={summary.byDirection.map((d) => ({ label: d.direction, value: d.count }))}
        />
        {summary.topDispositions.length > 0 && (
          <HorizontalBarList
            title="Top Dispositions"
            accent="bg-sky-500"
            rows={summary.topDispositions.map((d) => ({ label: d.disposition, count: d.count }))}
          />
        )}
      </div>

      <div className="mt-5">
        <HorizontalBarList
          title="Calls by Agent"
          accent="bg-sky-500"
          rows={summary.byAgent.map((a) => ({ label: a.label, count: a.count }))}
        />
      </div>
    </div>
  );

  const recentTab = (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Contact</th>
            <th className="py-2 pr-4">Agent</th>
            <th className="py-2 pr-4">Direction</th>
            <th className="py-2 pr-4">Disposition</th>
            <th className="py-2 pr-4">Duration</th>
            <th className="py-2 pr-4">When</th>
          </tr>
        </thead>
        <tbody>
          {summary.recent.map((c) => (
            <tr key={c.id} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">
                {c.contactName || c.contactNumber || "—"}
              </td>
              <td className="py-3 pr-4">{c.agentName ?? "—"}</td>
              <td className="py-3 pr-4">{c.direction ?? "—"}</td>
              <td className="py-3 pr-4">{c.disposition || "—"}</td>
              <td className="py-3 pr-4">{formatCallDuration(c.durationSeconds)}</td>
              <td className="py-3 pr-4 text-body-gray">
                {new Date(c.callAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {rangeSelect}
      <SectionTabs
        accent="border-sky-500"
        tabs={[
          { label: "Overview", content: overviewTab },
          { label: "Recent Calls", content: recentTab },
        ]}
      />
    </div>
  );
}
