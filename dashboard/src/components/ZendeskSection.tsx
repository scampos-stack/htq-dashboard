import { Suspense } from "react";
import type { ZendeskSummary, ZendeskTopicsSummary } from "@/lib/data";
import { ExpandableBreakdownTable } from "@/components/ExpandableBreakdownTable";
import { ZendeskTopicsCard } from "@/components/ZendeskTopicsCard";
import { ZendeskGroupedStatTable } from "@/components/ZendeskGroupedStatTable";
import { ZendeskRangeSelect } from "@/components/ZendeskRangeSelect";
import { SectionTabs } from "@/components/SectionTabs";
import { formatDuration } from "@/lib/format-duration";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-charcoal font-heading">{value}</span>
      <span className="text-xs uppercase tracking-wide text-body-gray">{label}</span>
    </div>
  );
}

export function ZendeskSection({
  summary,
  topicsSummary,
}: {
  summary: ZendeskSummary;
  topicsSummary: ZendeskTopicsSummary;
}) {
  const rangeSelect = (
    <div className="mb-4 flex justify-end">
      <Suspense fallback={null}>
        <ZendeskRangeSelect />
      </Suspense>
    </div>
  );

  if (summary.totalRows === 0) {
    return (
      <div>
        {rangeSelect}
        <p className="text-body-gray">
          No Zendesk tickets in this range — try widening it, or click
          &quot;Sync Now&quot; if nothing has synced yet.
        </p>
      </div>
    );
  }

  const csatTotal = summary.csat.good + summary.csat.bad;

  const overviewTab = (
    <div>
      <ZendeskTopicsCard summary={topicsSummary} />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Total Tickets" value={summary.totalRows.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric
            label="Open / Pending"
            value={(
              (summary.byStatus.find((s) => s.status === "open")?.count ?? 0) +
              (summary.byStatus.find((s) => s.status === "pending")?.count ?? 0)
            ).toLocaleString()}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-amber-500 bg-white p-6 shadow-sm">
          <Metric
            label="CSAT (Good)"
            value={csatTotal > 0 ? `${Math.round((summary.csat.good / csatTotal) * 100)}%` : "—"}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Avg First Response" value={formatDuration(summary.avgReplyMinutes)} />
        </div>
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Avg Resolution Time" value={formatDuration(summary.avgResolutionMinutes)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
          Recent Tickets
        </h3>
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Requester</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Priority</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {summary.recent.map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="py-3 pr-4 max-w-xs truncate font-semibold text-charcoal" title={t.subject ?? ""}>
                  {t.subject ?? "—"}
                </td>
                <td className="py-3 pr-4">{t.requesterEmail ?? "—"}</td>
                <td className="py-3 pr-4">{t.status ?? "—"}</td>
                <td className="py-3 pr-4">{t.priority ?? "—"}</td>
                <td className="py-3 pr-4 text-body-gray">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const teamTab = (
    <div className="flex flex-col gap-5">
      <ZendeskGroupedStatTable title="Tickets by Agent" columnLabel="Agent" rows={summary.byAgent} />
      <ZendeskGroupedStatTable title="Tickets by Group" columnLabel="Group" rows={summary.byGroup} />
    </div>
  );

  const breakdownTab = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ExpandableBreakdownTable
        title="Tickets by Status"
        columnLabel="Status"
        rows={summary.byStatus.map((s) => ({ label: s.status, count: s.count }))}
      />
      {summary.topTags.length > 0 && (
        <ExpandableBreakdownTable
          title="Top Tags"
          columnLabel="Tag"
          rows={summary.topTags.map((t) => ({ label: t.tag, count: t.count }))}
        />
      )}
    </div>
  );

  return (
    <div>
      {rangeSelect}
      <SectionTabs
        accent="border-teal-500"
        tabs={[
          { label: "Overview", content: overviewTab },
          { label: "Agents & Groups", content: teamTab },
          { label: "Status & Tags", content: breakdownTab },
        ]}
      />
    </div>
  );
}
